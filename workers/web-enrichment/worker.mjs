import { createClient } from "@supabase/supabase-js";

import { runQueueWorker } from "../shared/pg-queue.mjs";
import { detectMeaningfulWebChanges } from "./changes.mjs";
import {
  DEDUPE_WINDOW_MS,
  DEFAULT_SIGNAL_TYPES,
  SCHEMA_VERSION,
} from "./contract.mjs";
import { evidenceRowsForResult } from "./evidence.mjs";
import { extractCompanyEvidence } from "./firecrawl.mjs";
import {
  canStartPageJob,
  isMapFresh,
  startOfUtcDayIso,
} from "./limits.mjs";
import { canonicalizeDomain, SIGNAL_TYPES } from "./sources.mjs";

const QUEUE_NAME = "web-enrichment";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function validRequestedSignals(value) {
  return [...new Set(
    (Array.isArray(value) ? value : [])
      .filter((signal) => SIGNAL_TYPES.includes(signal))
  )];
}

const supabase = createClient(
  requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } }
);
const firecrawlApiKey = requiredEnv("FIRECRAWL_API_KEY");

async function dailyPageUsage() {
  const { data, error } = await supabase
    .from("web_enrichment_runs")
    .select("candidate_count")
    .gte("started_at", startOfUtcDayIso())
    .in("status", ["completed", "running"]);
  if (error) throw new Error(`web enrichment budget lookup failed: ${error.message}`);
  return (data ?? []).reduce(
    (sum, row) => sum + (Number.isFinite(row.candidate_count) ? row.candidate_count : 0),
    0
  );
}

async function cachedMap(domain) {
  const { data, error } = await supabase
    .from("web_enrichment_maps")
    .select("links, fetched_at")
    .eq("canonical_domain", domain)
    .maybeSingle();
  if (error) throw new Error(`web enrichment map lookup failed: ${error.message}`);
  return isMapFresh(data?.fetched_at) && Array.isArray(data?.links)
    ? data.links
    : null;
}

async function previousSnapshots(domain) {
  const { data, error } = await supabase
    .from("web_page_snapshots")
    .select("source_url, content_hash, token_hashes, content_length, page_title, fetched_at")
    .eq("canonical_domain", domain)
    .limit(50);
  if (error) throw new Error(`web snapshot lookup failed: ${error.message}`);
  return data ?? [];
}

async function recordRun(run) {
  const { error } = await supabase.from("web_enrichment_runs").upsert(run);
  if (error) console.error("[web-enrichment] metrics persistence failed", error);
}

async function handleWebEnrichment(job) {
  const startedAt = new Date();
  const domain = canonicalizeDomain(job.data?.domain);
  const schemaVersion = job.data?.schemaVersion;
  const signals = validRequestedSignals(job.data?.signals);
  if (schemaVersion !== SCHEMA_VERSION || signals.length === 0) {
    throw new Error("Invalid web enrichment payload");
  }

  const configuredBudget = Number(process.env.WEB_ENRICHMENT_DAILY_PAGE_BUDGET);
  const dailyBudget = Number.isFinite(configuredBudget) && configuredBudget > 0
    ? Math.floor(configuredBudget)
    : 1_500;
  const usedPages = await dailyPageUsage();
  if (!canStartPageJob({ usedPages, dailyBudget, requestedPages: 5 })) {
    await recordRun({
      job_id: String(job.id),
      canonical_domain: domain,
      status: "budget_skipped",
      started_at: startedAt.toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt.getTime(),
      candidate_count: 0,
      page_count: 0,
      provider_credits: 0,
      attempts: job.attemptsMade + 1,
    });
    return { domain, skipped: "daily_page_budget" };
  }

  await recordRun({
    job_id: String(job.id),
    canonical_domain: domain,
    status: "running",
    started_at: startedAt.toISOString(),
    candidate_count: 5,
    page_count: 0,
    provider_credits: 0,
    attempts: job.attemptsMade + 1,
  });
  const [mapLinks, snapshots] = await Promise.all([
    cachedMap(domain),
    previousSnapshots(domain),
  ]);
  const result = await extractCompanyEvidence({
    apiKey: firecrawlApiKey,
    domain,
    signals,
    cachedLinks: mapLinks,
  });
  const fetchedAt = new Date().toISOString();
  const webChanges = detectMeaningfulWebChanges({
    domain,
    pages: result.pages,
    previousSnapshots: snapshots,
    fetchedAt,
  });
  const observations = [...result.observations, ...webChanges.observations];
  const rows = evidenceRowsForResult({
    domain,
    schemaVersion,
    signals,
    observations,
    requestedShadow: job.data?.shadow !== false,
    promotedSignals: process.env.WEB_ENRICHMENT_PROMOTED_SIGNALS,
    fetchedAt,
    firecrawlMetadata: {
      job_id: result.jobId,
      candidate_count: result.candidateCount,
      page_count: result.pageCount,
      used_cached_map: result.usedCachedMap,
    },
  });
  const { error } = await supabase.rpc("persist_signal_evidence", {
    p_evidence: rows,
  });
  if (error) throw new Error(`signal_evidence persistence failed: ${error.message}`);
  if (webChanges.snapshots.length > 0) {
    const { error: snapshotError } = await supabase
      .from("web_page_snapshots")
      .upsert(webChanges.snapshots, { onConflict: "canonical_domain,source_url" });
    if (snapshotError) throw new Error(`web snapshot persistence failed: ${snapshotError.message}`);
  }
  if (!result.usedCachedMap) {
    const { error: mapError } = await supabase
      .from("web_enrichment_maps")
      .upsert({
        canonical_domain: domain,
        links: result.links,
        fetched_at: fetchedAt,
      });
    if (mapError) throw new Error(`web map persistence failed: ${mapError.message}`);
  }
  await recordRun({
    job_id: String(job.id),
    canonical_domain: domain,
    status: "completed",
    started_at: startedAt.toISOString(),
    completed_at: new Date().toISOString(),
    duration_ms: Date.now() - startedAt.getTime(),
    candidate_count: result.candidateCount,
    page_count: result.pageCount,
    provider_credits: result.candidateCount,
    attempts: job.attemptsMade + 1,
  });

  return {
    domain,
    observations: observations.length,
    webChanges: webChanges.observations.length,
    pages: result.pageCount,
    promoted: rows.filter((row) => !row.shadow).map((row) => row.signal_type),
  };
}

async function recordFailedRun(job, error) {
  console.error("[web-enrichment] job failed", job?.id, error);
  if (job?.id && job?.data?.domain) {
    await recordRun({
      job_id: String(job.id),
      canonical_domain: String(job.data.domain),
      status: "failed",
      completed_at: new Date().toISOString(),
      attempts: job.attemptsMade + 1,
      error_message: (error instanceof Error ? error.message : String(error)).slice(0, 500),
    });
  }
}

const abortController = new AbortController();
const worker = runQueueWorker({
  supabase,
  queue: QUEUE_NAME,
  handler: handleWebEnrichment,
  lockSeconds: 120,
  signal: abortController.signal,
  onFailed: recordFailedRun,
});

worker.catch((error) => {
  console.error("[web-enrichment] worker stopped", error);
  process.exitCode = 1;
});

async function enqueueWatchedDomains() {
  const { data, error } = await supabase
    .from("watchlist")
    .select("domain")
    .eq("is_active", true)
    .limit(1_000);
  if (error) {
    console.error("[web-enrichment] watchlist scan failed", error);
    return;
  }
  const domains = [...new Set((data ?? []).map((row) => row.domain).filter(Boolean))];
  await Promise.all(domains.map(async (value) => {
    const domain = canonicalizeDomain(value);
    const safeDomain = domain.replace(/[^a-z0-9.-]/g, "-");
    const { error: enqueueError } = await supabase.rpc("enqueue_background_job", {
      p_queue: QUEUE_NAME,
      p_dedupe_key: `${SCHEMA_VERSION}-${safeDomain}`,
      p_payload: {
        domain,
        schemaVersion: SCHEMA_VERSION,
        requestedAt: new Date().toISOString(),
        signals: DEFAULT_SIGNAL_TYPES,
        shadow: process.env.WEB_ENRICHMENT_SHADOW_MODE !== "false",
      },
      p_max_attempts: 3,
    });
    if (enqueueError) console.error("[web-enrichment] watchlist enqueue failed", enqueueError);
  }));
}

const configuredWatchlistInterval = Number(process.env.WEB_ENRICHMENT_WATCHLIST_INTERVAL_MS);
const watchlistIntervalMs = Number.isFinite(configuredWatchlistInterval) &&
  configuredWatchlistInterval > 0
  ? Math.max(60_000, configuredWatchlistInterval)
  : DEDUPE_WINDOW_MS;
// Without pg_cron, this timer is what keeps cache_entries and background_jobs
// from growing unbounded. Both purges are idempotent and cheap.
async function purgeExpiredRows() {
  for (const fn of ["purge_expired_cache_entries", "purge_finished_background_jobs"]) {
    const { error } = await supabase.rpc(fn);
    if (error) console.error(`[web-enrichment] ${fn} failed`, error);
  }
}

function scheduleWatchlistRefresh() {
  void enqueueWatchedDomains().catch((error) => {
    console.error("[web-enrichment] watchlist enqueue failed", error);
  });
  void purgeExpiredRows().catch((error) => {
    console.error("[web-enrichment] purge failed", error);
  });
}
scheduleWatchlistRefresh();
const watchlistTimer = setInterval(
  scheduleWatchlistRefresh,
  watchlistIntervalMs
);
watchlistTimer.unref();

async function shutdown() {
  clearInterval(watchlistTimer);
  abortController.abort();
  await worker.catch(() => {});
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
