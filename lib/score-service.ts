import { createHash, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { normalizeBusinessProfile } from "@/lib/business-profile";
import {
  cacheGet,
  cacheSet,
  SCORE_EVIDENCE_TTL_SECONDS,
  SCORE_RESULT_TTL_SECONDS,
  scoreEvidenceCacheKey,
  scoreResultCacheKey,
} from "@/lib/redis";
import { createSupabaseAdmin } from "@/lib/supabase";
import { fetchFundingSignal } from "@/lib/signals/funding";
import { fetchHiringSignal } from "@/lib/signals/hiring";
import { fetchNewsSignal } from "@/lib/signals/news";
import { fetchTechnologySignal } from "@/lib/signals/technology";
import { fetchWebSignal } from "@/lib/signals/web";
import { fetchGitHubSignal } from "@/lib/signals/github";
import { getMockSignals } from "@/lib/signals/mock";
import {
  enqueueHiringRefresh,
  HIRING_EVIDENCE_SCHEMA_VERSION,
} from "@/lib/hiring-refresh-queue";
import {
  enqueueWebEnrichment,
  webEnrichmentSignalsForStatuses,
  WEB_ENRICHMENT_SCHEMA_VERSION,
} from "@/lib/web-enrichment-queue";
import {
  computeActiveIntentScore,
  computeIntentScoreV3,
  DEFAULT_SCORING_POLICY_V3,
  getActiveScoringVersion,
  SCORING_VERSION,
  SCORING_VERSION_V3,
} from "@/lib/scorer";
import {
  resolveScoringPolicy,
  type ScoringPolicyRow,
} from "@/lib/scoring-policy";
import { generateReasoning } from "@/lib/reasoning";
import { updatePipelineStage } from "@/lib/pipeline";
import { createInboxNotification } from "@/lib/inbox";
import { evaluateV2ScoreTransition } from "@/lib/score-transition";
import {
  chooseBestSignalEvidence,
  prepareEvidenceForPersistence,
  signalFromEvidenceRow,
  type SignalEvidenceRow,
} from "./score-evidence";
import type {
  BusinessProfile,
  IntentScore,
  SignalResult,
  SignalSet,
  SignalStatus,
} from "@/lib/types";

const USE_MOCK = process.env.MOCK_SIGNALS === "true";
const SIGNAL_EVIDENCE_SCHEMA_VERSION = USE_MOCK
  ? "signal-evidence-v1-mock"
  : "signal-evidence-v1";
const FIRMOGRAPHICS_SCHEMA_VERSION = "firmographics-v1";
const EVIDENCE_RETENTION_SECONDS = 60 * 60 * 24 * 7;
const FAILED_EVIDENCE_RETRY_TTL_SECONDS = 60;

const SIGNAL_KEYS = [
  "funding",
  "hiring",
  "news",
  "technology",
  "web_activity",
  "web",
  "github",
] as const;

type SignalKey = (typeof SIGNAL_KEYS)[number];
type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

const SOURCE_BY_SIGNAL: Record<SignalKey, string> = {
  funding: "explorium",
  hiring: "explorium-events",
  news: "gnews",
  technology: "builtwith",
  web_activity: "firecrawl",
  web: "open-page-rank",
  github: "github",
};

const MAX_BY_SIGNAL: Record<SignalKey, number> = {
  funding: 25,
  hiring: 20,
  news: 20,
  technology: 20,
  web_activity: 15,
  web: 15,
  github: 20,
};

export interface ScoreCompanyOptions {
  domain: string;
  userId: string;
  companyName?: string;
  productCategory?: string;
  businessProfile?: BusinessProfile | null;
  skipCredits?: boolean;
  idempotencyKey?: string;
  onProgress?: (event: ScoreProgressEvent) => void | Promise<void>;
}

export type ScoreProgressEvent =
  | { stage: "domain"; company: string; domain: string }
  | { stage: "signals"; company: string; domain: string; signals: SignalSet }
  | {
      stage: "score";
      company: string;
      domain: string;
      intent_score: number;
      score_band: NonNullable<IntentScore["score_band"]>;
      buying_stage?: string;
      urgency?: string;
      data_coverage?: number;
      score_status?: string;
      icp_fit_score?: number | null;
      signals: SignalSet;
      latest_signal_at?: string;
    }
  | {
      stage: "action";
      recommended_action?: string;
      why_now?: string;
      urgency?: string;
    };

export interface ScorePersistenceMetadata {
  score_id?: string;
  score_run_id?: string;
  profile_hash: string;
  source_status: Record<SignalKey, SignalStatus>;
  is_baseline: boolean;
  automation_eligible: boolean;
  model_fallback: boolean;
  cached: boolean;
  charged: boolean;
  idempotent_replayed: boolean;
  previous_v2_score: number | null;
  previous_v2_band: IntentScore["score_band"];
}

export type StoredIntentScore = IntentScore & ScorePersistenceMetadata;

export interface UnscorableScoreResult {
  company: string;
  domain: string;
  intent_score: null;
  score_band: null;
  score_status: "unscorable";
  scoring_version: string;
  data_coverage: number;
  contributions: IntentScore["contributions"];
  last_updated: string;
  score_decay_date: string;
  signals: SignalSet;
  source_status: Record<SignalKey, SignalStatus>;
  is_baseline: boolean;
  automation_eligible: false;
  profile_hash: string;
  icp_fit_score: null;
  model_fallback: false;
  cached: boolean;
  charged: false;
  idempotent_replayed: boolean;
}

export class ScoreServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "ScoreServiceError";
  }
}

export class InvalidDomainError extends ScoreServiceError {
  constructor(message = "Provide a valid public company domain") {
    super(message, "invalid_domain");
    this.name = "InvalidDomainError";
  }
}

export class InsufficientCreditsError extends ScoreServiceError {
  constructor(public readonly creditsRemaining = 0) {
    super("Insufficient credits", "insufficient_credits");
    this.name = "InsufficientCreditsError";
  }
}

export class IdempotencyConflictError extends ScoreServiceError {
  constructor() {
    super("Idempotency key was already used for a different scoring request", "idempotency_conflict");
    this.name = "IdempotencyConflictError";
  }
}

export class ScoreInProgressError extends ScoreServiceError {
  constructor(public readonly runId: string) {
    super("An equivalent score is already being computed", "score_in_progress");
    this.name = "ScoreInProgressError";
  }
}

export class UnscorableDomainError extends ScoreServiceError {
  constructor(public readonly result: UnscorableScoreResult) {
    super("Domain does not have enough reliable signal coverage to score", "unscorable_domain");
    this.name = "UnscorableDomainError";
  }
}

interface EvidenceSnapshot {
  signals: SignalSet;
  rows: SignalEvidenceRow[];
}

interface FirmographicsData {
  business_id: string;
  industry: string;
  employee_range: string;
}

interface FirmographicsSnapshot {
  data: FirmographicsData | null;
  rows: SignalEvidenceRow[];
  status: SignalStatus;
}

interface BeginRunRow {
  run_id: string | null;
  run_status: "running" | "completed" | "failed" | "unscorable" | "rejected";
  stored_result: unknown;
  error_code: string | null;
  cache_hit: boolean;
  credits_remaining: number | null;
  is_baseline: boolean | null;
  owns_run: boolean;
  idempotent_replay: boolean;
}

interface CompleteRunRow {
  completed_run_id: string;
  completed_score_id: string;
  stored_result: unknown;
  charged: boolean;
}

/** Normalize a user-supplied URL/domain into the stable hostname used by caches. */
export function canonicalizeDomain(input: string): string {
  const raw = input.trim();
  if (!raw || raw.length > 2048) throw new InvalidDomainError();

  let parsed: URL;
  try {
    const value = /^[a-z][a-z\d+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
    parsed = new URL(value);
  } catch {
    throw new InvalidDomainError();
  }

  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password || parsed.port) {
    throw new InvalidDomainError();
  }

  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
  const labels = hostname.split(".");
  const validLabels = labels.every(
    (label) =>
      label.length > 0 &&
      label.length <= 63 &&
      /^[a-z\d](?:[a-z\d-]*[a-z\d])?$/i.test(label)
  );

  if (
    hostname.length > 253 ||
    labels.length < 2 ||
    !validLabels ||
    isIP(hostname) !== 0 ||
    hostname === "localhost"
  ) {
    throw new InvalidDomainError();
  }

  return hostname;
}

// "stripe.com" -> "Stripe", "linear.app" -> "Linear"
export function domainToCompanyName(domain: string): string {
  const hostname = canonicalizeDomain(domain);
  const parts = hostname.split(".");
  const secondLevelPublicSuffixes = new Set(["ac", "co", "com", "gov", "net", "org"]);
  const label =
    parts.length >= 3 && parts.at(-1)?.length === 2 && secondLevelPublicSuffixes.has(parts.at(-2) ?? "")
      ? parts.at(-3) ?? parts[0]
      : parts.at(-2) ?? parts[0];

  return label
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function getProfileHash(productCategory: string, businessProfile: BusinessProfile | null): string {
  const normalizedProfile = businessProfile
    ? {
        product_category: businessProfile.product_category.trim().toLowerCase(),
        target_industries: businessProfile.target_industries
          .map((industry) => industry.trim().toLowerCase())
          .sort(),
        company_size: businessProfile.company_size.trim().toLowerCase(),
        buyer_role: businessProfile.buyer_role.trim().toLowerCase(),
        sales_motion: businessProfile.sales_motion.trim().toLowerCase(),
        deal_size: businessProfile.deal_size.trim().toLowerCase(),
        sales_cycle: businessProfile.sales_cycle.trim().toLowerCase(),
      }
    : null;

  return sha256(JSON.stringify({
    product_category: productCategory.trim().toLowerCase(),
    business_profile: normalizedProfile,
  }));
}

function firstRpcRow<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  return data && typeof data === "object" ? data as T : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSignalResult(value: unknown): value is SignalResult {
  if (!isRecord(value)) return false;
  return (
    typeof value.score === "number" &&
    Number.isFinite(value.score) &&
    typeof value.max === "number" &&
    Number.isFinite(value.max) &&
    value.max > 0 &&
    typeof value.detail === "string"
  );
}

function isSignalSet(value: unknown): value is SignalSet {
  if (!isRecord(value) || typeof value.latestSignalDate !== "string") return false;
  return SIGNAL_KEYS
    .filter((key) => key !== "web_activity")
    .every((key) => isSignalResult(value[key])) &&
    (value.web_activity === undefined || isSignalResult(value.web_activity));
}

function isEvidenceSnapshot(value: unknown): value is EvidenceSnapshot {
  return isRecord(value) && isSignalSet(value.signals) && Array.isArray(value.rows);
}

function isStoredIntentScore(
  value: unknown,
  expectedScoringVersion = SCORING_VERSION
): value is StoredIntentScore {
  if (!isRecord(value)) return false;
  return (
    value.scoring_version === expectedScoringVersion &&
    (value.score_status === "complete" || value.score_status === "partial") &&
    typeof value.domain === "string" &&
    typeof value.company === "string" &&
    typeof value.intent_score === "number" &&
    (value.score_band === "HOT" || value.score_band === "WARM" || value.score_band === "COLD") &&
    isSignalSet(value.signals)
  );
}

function inferSignalStatus(signal: SignalResult): SignalStatus {
  return signal.status ?? (signal.score > 0 ? "ok" : "no_signal");
}

function sourceStatuses(signals: SignalSet): Record<SignalKey, SignalStatus> {
  return Object.fromEntries(
    SIGNAL_KEYS.map((key) => [
      key,
      key === "web_activity" && !signals.web_activity
        ? "unavailable"
        : inferSignalStatus(signals[key] as SignalResult),
    ])
  ) as Record<SignalKey, SignalStatus>;
}

function unavailableSignal(key: SignalKey, reason: string): SignalResult {
  return {
    score: 0,
    max: MAX_BY_SIGNAL[key],
    detail: `${key.charAt(0).toUpperCase()}${key.slice(1)} data unavailable`,
    status: "unavailable",
    observed_at: null,
    fetched_at: new Date().toISOString(),
    source: SOURCE_BY_SIGNAL[key],
    evidence: [],
    metadata: { reason },
  };
}

function evidenceRowForSignal(
  domain: string,
  key: SignalKey,
  signal: SignalResult,
  source: string
): SignalEvidenceRow {
  const fetchedAt = signal.fetched_at && Number.isFinite(new Date(signal.fetched_at).getTime())
    ? signal.fetched_at
    : new Date().toISOString();
  const expiresAt = new Date(
    new Date(fetchedAt).getTime() + EVIDENCE_RETENTION_SECONDS * 1000
  ).toISOString();

  return {
    canonical_domain: domain,
    signal_type: key,
    source,
    schema_version: SIGNAL_EVIDENCE_SCHEMA_VERSION,
    status: inferSignalStatus(signal),
    observed_at: signal.observed_at ?? null,
    fetched_at: fetchedAt,
    expires_at: expiresAt,
    evidence: signal.evidence ?? [],
    raw_payload: signal,
    shadow: false,
  };
}

function isUsableEvidenceStatus(status: SignalStatus): boolean {
  return status === "ok" || status === "no_signal" || status === "stale";
}

function evidenceAgeMs(row: SignalEvidenceRow, nowMs = Date.now()): number {
  const fetchedAt = new Date(row.fetched_at).getTime();
  return Number.isFinite(fetchedAt) ? Math.max(0, nowMs - fetchedAt) : Number.POSITIVE_INFINITY;
}

function isFreshEvidence(row: SignalEvidenceRow, nowMs = Date.now()): boolean {
  return evidenceAgeMs(row, nowMs) <= SCORE_EVIDENCE_TTL_SECONDS * 1000;
}

function staleSignal(signal: SignalResult, metadata: Record<string, unknown> = {}): SignalResult {
  return {
    ...signal,
    status: "stale",
    metadata: {
      ...signal.metadata,
      ...metadata,
      last_known_good: true,
    },
  };
}

async function loadDatabaseEvidence(
  supabase: SupabaseAdmin,
  domain: string
): Promise<Map<SignalKey, SignalEvidenceRow[]>> {
  const { data, error } = await supabase
    .from("signal_evidence")
    .select("canonical_domain, signal_type, source, schema_version, status, observed_at, fetched_at, expires_at, evidence, raw_payload, shadow")
    .eq("canonical_domain", domain)
    .in("schema_version", [
      SIGNAL_EVIDENCE_SCHEMA_VERSION,
      HIRING_EVIDENCE_SCHEMA_VERSION,
      WEB_ENRICHMENT_SCHEMA_VERSION,
    ])
    .eq("shadow", false)
    .gt("expires_at", new Date().toISOString())
    .order("fetched_at", { ascending: false });

  if (error) {
    console.warn("[score-service] evidence lookup failed; fetching sources", error);
    return new Map();
  }

  const selected = new Map<SignalKey, SignalEvidenceRow[]>();
  for (const candidate of (data ?? []) as SignalEvidenceRow[]) {
    if (!SIGNAL_KEYS.includes(candidate.signal_type as SignalKey)) continue;
    if (!signalFromEvidenceRow(candidate)) continue;
    const key = candidate.signal_type as SignalKey;
    selected.set(key, [...(selected.get(key) ?? []), candidate]);
  }

  return selected;
}

async function fetchSignal(key: SignalKey, domain: string): Promise<SignalResult> {
  const timeoutMs = key === "web" || key === "github" ? 5_000 : 12_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const result = await (() => {
      switch (key) {
        case "funding": return fetchFundingSignal(domain, controller.signal);
        case "hiring": return fetchHiringSignal(domain, controller.signal);
        // Neutral evidence is shared by canonical domain. Never let a caller-
        // supplied display name influence the shared News cache.
        case "news": return fetchNewsSignal(domainToCompanyName(domain), controller.signal);
        case "technology": return fetchTechnologySignal(domain, controller.signal);
        case "web_activity": return unavailableSignal(
          "web_activity",
          "awaiting_firecrawl_change_baseline"
        );
        case "web": return fetchWebSignal(domain, controller.signal);
        case "github": return fetchGitHubSignal(domain, controller.signal);
      }
    })();
    return controller.signal.aborted
      ? unavailableSignal(key, `provider_timeout_${timeoutMs}ms`)
      : result;
  } catch (error) {
    return unavailableSignal(
      key,
      controller.signal.aborted
        ? `provider_timeout_${timeoutMs}ms`
        : error instanceof Error ? error.message : "unknown_error"
    );
  } finally {
    clearTimeout(timeout);
  }
}

function latestSignalDate(signals: Record<SignalKey, SignalResult>): string {
  const timestamps = SIGNAL_KEYS.flatMap((key) => {
    const signal = signals[key];
    return [signal.observed_at, signal.fetched_at]
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value).getTime())
      .filter(Number.isFinite);
  });
  return timestamps.length > 0
    ? new Date(Math.max(...timestamps)).toISOString()
    : new Date().toISOString();
}

async function loadScoringPolicy(
  supabase: SupabaseAdmin,
  userId: string,
  profileHash: string,
  businessProfile: BusinessProfile | null
) {
  const columns = "id, user_id, icp_key, vertical, policy, active, created_at";
  const [owned, defaults] = await Promise.all([
    supabase
      .from("scoring_policies")
      .select(columns)
      .eq("active", true)
      .eq("user_id", userId)
      .limit(100),
    supabase
      .from("scoring_policies")
      .select(columns)
      .eq("active", true)
      .is("user_id", null)
      .limit(100),
  ]);
  if (owned.error || defaults.error) {
    console.warn(
      "[score-service] scoring policy lookup failed; using default",
      owned.error ?? defaults.error
    );
    return DEFAULT_SCORING_POLICY_V3;
  }
  return resolveScoringPolicy(
    [...(owned.data ?? []), ...(defaults.data ?? [])] as ScoringPolicyRow[],
    {
    userId,
    profileHash,
    verticals: businessProfile?.target_industries ?? [],
    }
  );
}

async function getEvidenceSnapshot(
  supabase: SupabaseAdmin,
  domain: string
): Promise<EvidenceSnapshot> {
  const cacheKey = scoreEvidenceCacheKey(
    domain,
    `${SIGNAL_EVIDENCE_SCHEMA_VERSION}-${HIRING_EVIDENCE_SCHEMA_VERSION}-${WEB_ENRICHMENT_SCHEMA_VERSION}`
  );
  const cached = await cacheGet<EvidenceSnapshot>(cacheKey);
  if (isEvidenceSnapshot(cached)) return cached;

  if (USE_MOCK) {
    const mockSignals = getMockSignals(domain);
    const signals: SignalSet = {
      ...mockSignals,
      web_activity: mockSignals.web_activity ?? {
        score: 0,
        max: 15,
        detail: "No meaningful web changes — MOCK",
        status: "no_signal",
        observed_at: null,
        fetched_at: new Date().toISOString(),
        source: "mock",
        evidence: [],
        metadata: { mock: true },
      },
    };
    const rows = SIGNAL_KEYS.map((key) =>
      evidenceRowForSignal(domain, key, signals[key] as SignalResult, "mock")
    );
    const snapshot = { signals, rows };
    await cacheSet(cacheKey, snapshot, SCORE_EVIDENCE_TTL_SECONDS);
    return snapshot;
  }

  const databaseRows = await loadDatabaseEvidence(supabase, domain);
  const resolved = {} as Record<SignalKey, SignalResult>;
  const rows: SignalEvidenceRow[] = [];

  await Promise.all(SIGNAL_KEYS.map(async (key) => {
    const candidates = databaseRows.get(key) ?? [];
    const usableStoredRows = candidates.filter((row) =>
      isUsableEvidenceStatus(row.status) && signalFromEvidenceRow(row) !== null
    );
    const bestStoredRow = chooseBestSignalEvidence(usableStoredRows);
    const bestStoredSignal = bestStoredRow ? signalFromEvidenceRow(bestStoredRow) : null;

    if (
      bestStoredRow &&
      bestStoredSignal &&
      bestStoredRow.status !== "stale" &&
      isFreshEvidence(bestStoredRow)
    ) {
      resolved[key] = {
        ...bestStoredSignal,
        metadata: {
          ...bestStoredSignal.metadata,
          selected_source: bestStoredRow.source,
        },
      };
      rows.push(bestStoredRow);
      return;
    }

    // Stale good/no-signal evidence remains available for seven days, but it
    // never prevents a refresh attempt once the six-hour freshness window ends.
    const refreshed = await fetchSignal(key, domain);
    const refreshedRow = evidenceRowForSignal(domain, key, refreshed, SOURCE_BY_SIGNAL[key]);
    rows.push(refreshedRow);

    if (refreshed.status === "ok" || refreshed.status === "no_signal") {
      const selectedRow = chooseBestSignalEvidence([refreshedRow, ...usableStoredRows]);
      const selectedSignal = selectedRow ? signalFromEvidenceRow(selectedRow) : null;
      resolved[key] = selectedSignal
        ? {
            ...selectedSignal,
            metadata: {
              ...selectedSignal.metadata,
              selected_source: selectedRow?.source,
              primary_status: refreshed.status,
            },
          }
        : refreshed;
      if (selectedRow && selectedRow !== refreshedRow) rows.push(selectedRow);
      return;
    }

    // Promoted crawl evidence is selected as one alternative source; it is
    // never added to provider evidence.
    if (bestStoredRow && bestStoredSignal) {
      resolved[key] = isFreshEvidence(bestStoredRow) && bestStoredRow.status !== "stale"
        ? {
            ...bestStoredSignal,
            metadata: {
              ...bestStoredSignal.metadata,
              fallback_source: bestStoredRow.source,
              primary_status: refreshed.status ?? "unavailable",
            },
          }
        : staleSignal(bestStoredSignal, {
            fallback_source: bestStoredRow.source,
            primary_status: refreshed.status ?? "unavailable",
          });
      rows.push(bestStoredRow);
      return;
    }

    resolved[key] = refreshed;
  }));

  const signals: SignalSet = {
    ...resolved,
    latestSignalDate: latestSignalDate(resolved),
  };
  const snapshot = { signals, rows };
  const needsRetry = SIGNAL_KEYS.some((key) => {
    const signal = signals[key] as SignalResult;
    return (
      signal.status === "stale" ||
      signal.status === "unavailable" ||
      signal.status === "not_found" ||
      typeof signal.metadata?.fallback_source === "string"
    );
  });
  await cacheSet(
    cacheKey,
    snapshot,
    needsRetry ? FAILED_EVIDENCE_RETRY_TTL_SECONDS : SCORE_EVIDENCE_TTL_SECONDS
  );
  return snapshot;
}

function isFirmographicsData(value: unknown): value is FirmographicsData {
  return (
    isRecord(value) &&
    typeof value.business_id === "string" &&
    typeof value.industry === "string" &&
    value.industry.trim().length > 0 &&
    typeof value.employee_range === "string" &&
    value.employee_range.trim().length > 0
  );
}

function firmographicsRow(
  domain: string,
  status: SignalStatus,
  fetchedAt: string,
  data: FirmographicsData | null,
  rawPayload: unknown
): SignalEvidenceRow {
  return {
    canonical_domain: domain,
    signal_type: "firmographics",
    source: "explorium",
    schema_version: FIRMOGRAPHICS_SCHEMA_VERSION,
    status,
    observed_at: status === "ok" ? fetchedAt : null,
    fetched_at: fetchedAt,
    expires_at: new Date(
      new Date(fetchedAt).getTime() + EVIDENCE_RETENTION_SECONDS * 1000
    ).toISOString(),
    evidence: data
      ? [{
          label: `${data.industry}; ${data.employee_range} employees`,
          observed_at: fetchedAt,
          metadata: {
            business_id: data.business_id,
            industry: data.industry,
            employee_range: data.employee_range,
          },
        }]
      : [],
    raw_payload: rawPayload,
    shadow: false,
  };
}

function extractString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const strings = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    return strings.length > 0 ? strings.join(", ") : null;
  }
  if (isRecord(value)) {
    for (const key of ["name", "label", "description", "value"]) {
      const candidate = value[key];
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    }
  }
  return null;
}

function businessIdFromSignals(signals: SignalSet): string | null {
  for (const key of ["funding", "hiring"] as const) {
    const businessId = signals[key].metadata?.business_id;
    if (typeof businessId === "string" && businessId.trim()) return businessId.trim();
  }
  return null;
}

async function fetchFirmographics(
  domain: string,
  knownBusinessId: string | null
): Promise<{ data: FirmographicsData | null; row: SignalEvidenceRow }> {
  const fetchedAt = new Date().toISOString();
  const apiKey = process.env.EXPLORIUM_API_KEY;
  if (!apiKey) {
    return {
      data: null,
      row: firmographicsRow(domain, "unavailable", fetchedAt, null, {
        reason: "missing_api_key",
      }),
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const headers = { "api_key": apiKey, "Content-Type": "application/json" };
    let businessId = knownBusinessId;
    if (!businessId) {
      const matchResponse = await fetch("https://api.explorium.ai/v1/businesses/match", {
        method: "POST",
        headers,
        body: JSON.stringify({ businesses_to_match: [{ domain }] }),
        signal: controller.signal,
        next: { revalidate: 86400 },
      });
      if (!matchResponse.ok) throw new Error(`Explorium match ${matchResponse.status}`);
      const matchPayload: unknown = await matchResponse.json();
      const matchedBusinesses = isRecord(matchPayload) && Array.isArray(matchPayload.matched_businesses)
        ? matchPayload.matched_businesses
        : [];
      const firstMatch = matchedBusinesses.find(isRecord);
      businessId = firstMatch && typeof firstMatch.business_id === "string"
        ? firstMatch.business_id
        : null;
    }

    if (!businessId) {
      return {
        data: null,
        row: firmographicsRow(domain, "not_found", fetchedAt, null, {
          reason: "business_not_matched",
        }),
      };
    }

    const enrichResponse = await fetch(
      "https://api.explorium.ai/v1/businesses/firmographics/enrich",
      {
        method: "POST",
        headers,
        body: JSON.stringify({ business_id: businessId }),
        signal: controller.signal,
        next: { revalidate: 21600 },
      }
    );
    if (!enrichResponse.ok) throw new Error(`Explorium firmographics ${enrichResponse.status}`);

    const payload: unknown = await enrichResponse.json();
    const fields = isRecord(payload) && isRecord(payload.data) ? payload.data : payload;
    const industry = isRecord(fields)
      ? extractString(fields.linkedin_industry_category) ?? extractString(fields.naics_description)
      : null;
    const employeeRange = isRecord(fields)
      ? extractString(fields.number_of_employees_range)
      : null;

    if (!industry || !employeeRange) {
      return {
        data: null,
        row: firmographicsRow(domain, "no_signal", fetchedAt, null, {
          business_id: businessId,
          response: payload,
          reason: "missing_required_firmographics",
        }),
      };
    }

    const data = {
      business_id: businessId,
      industry,
      employee_range: employeeRange,
    };
    return {
      data,
      row: firmographicsRow(domain, "ok", fetchedAt, data, {
        ...data,
        response: payload,
      }),
    };
  } catch (error) {
    return {
      data: null,
      row: firmographicsRow(domain, "unavailable", fetchedAt, null, {
        reason: error instanceof Error ? error.message : "unknown_error",
      }),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function loadFirmographicsRow(
  supabase: SupabaseAdmin,
  domain: string
): Promise<SignalEvidenceRow | null> {
  const { data, error } = await supabase
    .from("signal_evidence")
    .select("canonical_domain, signal_type, source, schema_version, status, observed_at, fetched_at, expires_at, evidence, raw_payload, shadow")
    .eq("canonical_domain", domain)
    .eq("signal_type", "firmographics")
    .eq("source", "explorium")
    .eq("schema_version", FIRMOGRAPHICS_SCHEMA_VERSION)
    .eq("shadow", false)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    console.warn("[score-service] firmographics lookup failed; refreshing", error);
    return null;
  }
  return data as SignalEvidenceRow | null;
}

async function getFirmographics(
  supabase: SupabaseAdmin,
  domain: string,
  knownBusinessId: string | null
): Promise<FirmographicsSnapshot> {
  const cacheKey = scoreEvidenceCacheKey(domain, FIRMOGRAPHICS_SCHEMA_VERSION);
  const cached = await cacheGet<FirmographicsSnapshot>(cacheKey);
  if (
    cached &&
    isRecord(cached) &&
    Array.isArray(cached.rows) &&
    (cached.data === null || isFirmographicsData(cached.data))
  ) {
    return cached;
  }

  const existingRow = await loadFirmographicsRow(supabase, domain);
  const existingData = existingRow && isFirmographicsData(existingRow.raw_payload)
    ? existingRow.raw_payload
    : null;
  if (
    existingRow &&
    existingData &&
    existingRow.status === "ok" &&
    isFreshEvidence(existingRow)
  ) {
    const snapshot: FirmographicsSnapshot = {
      data: existingData,
      rows: [existingRow],
      status: "ok",
    };
    await cacheSet(cacheKey, snapshot, SCORE_EVIDENCE_TTL_SECONDS);
    return snapshot;
  }

  const refreshed = await fetchFirmographics(domain, knownBusinessId ?? existingData?.business_id ?? null);
  if (refreshed.data) {
    const snapshot: FirmographicsSnapshot = {
      data: refreshed.data,
      rows: [refreshed.row],
      status: "ok",
    };
    await cacheSet(cacheKey, snapshot, SCORE_EVIDENCE_TTL_SECONDS);
    return snapshot;
  }

  if (existingRow && existingData && isUsableEvidenceStatus(existingRow.status)) {
    const snapshot: FirmographicsSnapshot = {
      data: existingData,
      rows: [refreshed.row, existingRow],
      status: "stale",
    };
    await cacheSet(cacheKey, snapshot, FAILED_EVIDENCE_RETRY_TTL_SECONDS);
    return snapshot;
  }

  const snapshot: FirmographicsSnapshot = {
    data: null,
    rows: [refreshed.row],
    status: refreshed.row.status,
  };
  await cacheSet(cacheKey, snapshot, FAILED_EVIDENCE_RETRY_TTL_SECONDS);
  return snapshot;
}

interface NumericRange {
  min: number;
  max: number;
}

function parseEmployeeRange(value: string): NumericRange | null {
  const normalized = value.toLowerCase().replace(/,/g, "").replace(/[–—]/g, "-");
  const numbers = normalized.match(/\d+(?:\.\d+)?/g)?.map(Number).filter(Number.isFinite) ?? [];
  if (numbers.length >= 2) {
    return { min: Math.min(numbers[0], numbers[1]), max: Math.max(numbers[0], numbers[1]) };
  }
  if (numbers.length !== 1) return null;
  const number = numbers[0];
  if (/\+|over|more than|above|at least/.test(normalized)) {
    return { min: number, max: Number.POSITIVE_INFINITY };
  }
  if (/under|less than|up to|below/.test(normalized)) {
    return { min: 1, max: number };
  }
  return { min: number, max: number };
}

function industriesAlign(targets: string[], actual: string): boolean {
  const stopWords = new Set(["and", "the", "other", "services", "service", "industry", "activities"]);
  const normalize = (value: string) => value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const actualNormalized = normalize(actual);
  const actualTokens = new Set(
    actualNormalized.split(" ").filter((token) => token.length >= 4 && !stopWords.has(token))
  );

  return targets.some((target) => {
    const normalizedTarget = normalize(target);
    if (!normalizedTarget) return false;
    if (actualNormalized.includes(normalizedTarget) || normalizedTarget.includes(actualNormalized)) return true;
    return normalizedTarget
      .split(" ")
      .some((token) => token.length >= 4 && !stopWords.has(token) && actualTokens.has(token));
  });
}

/** ICP is based only on firmographic industry and employee-range evidence. */
function computeIcpFit(
  businessProfile: BusinessProfile | null,
  firmographics: FirmographicsData | null
): number | null {
  if (!businessProfile || !firmographics || businessProfile.target_industries.length === 0) return null;
  const targetSize = parseEmployeeRange(businessProfile.company_size);
  const actualSize = parseEmployeeRange(firmographics.employee_range);
  if (!targetSize || !actualSize || !firmographics.industry.trim()) return null;

  const industryScore = industriesAlign(businessProfile.target_industries, firmographics.industry) ? 60 : 0;
  const rangesOverlap = targetSize.min <= actualSize.max && actualSize.min <= targetSize.max;
  return industryScore + (rangesOverlap ? 40 : 0);
}

async function beginScoreRun(
  supabase: SupabaseAdmin,
  input: {
    userId: string;
    requestKey: string;
    requestFingerprint: string;
    domain: string;
    companyName: string;
    profileHash: string;
    scoringVersion: string;
    skipCredits: boolean;
    bindIdempotency: boolean;
  }
): Promise<BeginRunRow> {
  const { data, error } = await supabase.rpc("begin_score_run", {
    p_user_id: input.userId,
    p_request_key: input.requestKey,
    p_request_fingerprint: input.requestFingerprint,
    p_domain: input.domain,
    p_company_name: input.companyName,
    p_scoring_version: input.scoringVersion,
    p_profile_hash: input.profileHash,
    p_skip_charge: input.skipCredits,
    p_bind_idempotency: input.bindIdempotency,
  });

  if (error) {
    throw new ScoreServiceError("Unable to start scoring transaction", "score_run_begin_failed");
  }
  const row = firstRpcRow<BeginRunRow>(data);
  if (!row) throw new ScoreServiceError("Scoring transaction returned no state", "score_run_begin_failed");
  return row;
}

async function completeScoreRun(
  supabase: SupabaseAdmin,
  runId: string,
  result: StoredIntentScore,
  evidence: SignalEvidenceRow[]
): Promise<StoredIntentScore> {
  const { data, error } = await supabase.rpc("complete_score_run", {
    p_run_id: runId,
    p_result: result,
    p_evidence: prepareEvidenceForPersistence(evidence),
  });
  if (error) {
    console.error("[score-service] complete_score_run failed", error);
    throw new ScoreServiceError("Unable to persist completed score", "score_run_complete_failed");
  }

  const row = firstRpcRow<CompleteRunRow>(data);
  if (!row || !isStoredIntentScore(row.stored_result, result.scoring_version)) {
    throw new ScoreServiceError("Completed score could not be read back", "score_run_complete_failed");
  }
  return row.stored_result;
}

async function failScoreRun(
  supabase: SupabaseAdmin,
  runId: string,
  errorCode: string,
  errorMessage: string,
  unscorable: boolean,
  result: UnscorableScoreResult | null,
  evidence: SignalEvidenceRow[]
): Promise<void> {
  const args = {
    p_run_id: runId,
    p_error_code: errorCode,
    p_error_message: errorMessage,
    p_unscorable: unscorable,
    p_result: result,
    p_evidence: prepareEvidenceForPersistence(evidence),
  };
  const first = await supabase.rpc("fail_score_run", args);
  if (!first.error) return;

  // A malformed third-party evidence payload must never strand a credit.
  const retry = await supabase.rpc("fail_score_run", { ...args, p_evidence: [] });
  if (retry.error) {
    console.error("[score-service] fail_score_run failed", retry.error);
    throw new ScoreServiceError("Unable to terminate scoring transaction", "score_run_fail_failed");
  }
}

async function persistShadowScore(
  supabase: SupabaseAdmin,
  input: {
    runId: string;
    userId: string;
    domain: string;
    result: ReturnType<typeof computeIntentScoreV3>;
  }
): Promise<void> {
  const { error } = await supabase.from("score_shadow_results").upsert({
    score_run_id: input.runId,
    user_id: input.userId,
    canonical_domain: input.domain,
    scoring_version: input.result.scoring_version,
    scoring_policy_id: input.result.scoring_policy_id ?? null,
    score_status: input.result.score_status,
    score: input.result.intent_score,
    data_coverage: input.result.data_coverage,
    signal_coverage: input.result.signal_coverage ?? null,
    contributions: input.result.contributions,
    result: input.result,
  }, { onConflict: "score_run_id,scoring_version" });
  if (error) console.warn("[score-service] v3 shadow persistence failed", error);
}

async function runAutomationSideEffects(
  userId: string,
  domain: string,
  company: string,
  result: StoredIntentScore
): Promise<void> {
  if (
    result.score_status !== "complete" ||
    result.intent_score === null ||
    result.score_band === null ||
    result.scoring_version === SCORING_VERSION_V3
  ) {
    return;
  }

  const supabase = createSupabaseAdmin();
  try {
    const transition = evaluateV2ScoreTransition(result);

    if (transition.hotCrossing) {
      const { data: watchlistEntry } = await supabase
        .from("watchlist")
        .select("id")
        .eq("user_id", userId)
        .eq("domain", domain)
        .eq("is_active", true)
        .maybeSingle();

      if (watchlistEntry) {
        const activeSources = (["funding", "news", "hiring", "technology"] as const)
          .filter((key) => result.signals[key].score > 0 && result.signals[key].status === "ok");

        await createInboxNotification({
          user_id: userId,
          event_type: "hot_crossing",
          domain,
          company_name: company,
          title: `${company} crossed HOT — score moved to ${result.intent_score}`,
          summary: result.ai_summary,
          metadata: {
            score_before: transition.previousScore,
            score_band_before: transition.previousBand,
            score_after: result.intent_score,
            score_band: "HOT",
            ai_thesis: result.ai_summary,
            recommended_action: result.recommended_action,
            scoring_version: result.scoring_version,
            data_coverage: result.data_coverage,
            signal_deltas: Object.fromEntries(
              (["funding", "news", "hiring", "technology"] as const)
                .map((key) => [key, result.signals[key].score])
            ),
          },
          tags: ["HOT", ...activeSources],
        });
      }
    }

    await updatePipelineStage(userId, domain, result.intent_score, {
      previousV2Score: transition.previousScore,
      allowStageTransition: transition.canMovePipeline,
    });
  } catch (error) {
    // Persistence and charging have already completed. Automation is best-effort
    // and must not turn a successful score into a retry/double-charge scenario.
    console.error("[score-service] automation side effect failed", error);
  }
}

/**
 * Compute a personalized company score with domain-neutral evidence reuse,
 * transactional persistence, exact-once charging, and safe automation gates.
 */
export async function scoreCompany(opts: ScoreCompanyOptions): Promise<StoredIntentScore> {
  const {
    domain,
    userId,
    companyName,
    productCategory = "B2B SaaS",
    businessProfile,
    skipCredits = false,
    idempotencyKey,
    onProgress,
  } = opts;
  const supabase = createSupabaseAdmin();
  const lookupDomain = canonicalizeDomain(domain);
  const lookupCompany = companyName?.trim() || domainToCompanyName(lookupDomain);
  const profile = normalizeBusinessProfile(businessProfile);
  const effectiveProductCategory = profile?.product_category || productCategory;
  const profileHash = getProfileHash(effectiveProductCategory, profile);
  const normalizedIdempotencyKey = idempotencyKey?.trim();
  const scoringVersion = getActiveScoringVersion();
  const resultCacheKey = scoreResultCacheKey(
    userId,
    lookupDomain,
    profileHash,
    scoringVersion
  );

  const emit = async (event: ScoreProgressEvent) => {
    if (!onProgress) return;
    await onProgress(event);
  };

  const emitStoredProgress = async (stored: StoredIntentScore) => {
    await emit({ stage: "domain", company: stored.company, domain: stored.domain });
    if (stored.signals) {
      await emit({
        stage: "signals",
        company: stored.company,
        domain: stored.domain,
        signals: stored.signals,
      });
    }
    if (stored.intent_score != null && stored.score_band) {
      await emit({
        stage: "score",
        company: stored.company,
        domain: stored.domain,
        intent_score: stored.intent_score,
        score_band: stored.score_band,
        buying_stage: stored.buying_stage,
        urgency: stored.urgency,
        data_coverage: stored.data_coverage,
        score_status: stored.score_status,
        icp_fit_score: stored.icp_fit_score,
        signals: stored.signals,
        latest_signal_at: stored.signals?.latestSignalDate,
      });
    }
    await emit({
      stage: "action",
      recommended_action: stored.recommended_action,
      why_now: stored.why_now,
      urgency: stored.urgency,
    });
  };

  if (!normalizedIdempotencyKey) {
    const cached = await cacheGet<StoredIntentScore>(resultCacheKey);
    if (isStoredIntentScore(cached, scoringVersion)) {
      const hit = {
        ...cached,
        cached: true,
        charged: false,
        idempotent_replayed: false,
      };
      await emitStoredProgress(hit);
      return hit;
    }
  }

  const requestKey = normalizedIdempotencyKey
    ? `client:${sha256(normalizedIdempotencyKey)}`
    : `auto:${randomUUID()}`;
  const requestFingerprint = sha256(JSON.stringify({
    domain: lookupDomain,
    company: lookupCompany,
    profile_hash: profileHash,
    scoring_version: scoringVersion,
  }));

  const run = await beginScoreRun(supabase, {
    userId,
    requestKey,
    requestFingerprint,
    domain: lookupDomain,
    companyName: lookupCompany,
    profileHash,
    scoringVersion,
    skipCredits,
    bindIdempotency: Boolean(normalizedIdempotencyKey),
  });

  if (run.run_status === "rejected") {
    if (run.error_code === "insufficient_credits") {
      throw new InsufficientCreditsError(run.credits_remaining ?? 0);
    }
    if (run.error_code === "idempotency_conflict") throw new IdempotencyConflictError();
    throw new ScoreServiceError("Unable to start score", run.error_code ?? "score_run_rejected");
  }

  if (run.run_status === "completed" && isStoredIntentScore(run.stored_result, scoringVersion)) {
    const replay: StoredIntentScore = {
      ...run.stored_result,
      cached: true,
      charged: false,
      idempotent_replayed: run.idempotent_replay,
    };
    await cacheSet(
      resultCacheKey,
      { ...replay, idempotent_replayed: false },
      SCORE_RESULT_TTL_SECONDS
    );
    await emitStoredProgress(replay);
    return replay;
  }

  if (run.run_status === "unscorable" && isRecord(run.stored_result)) {
    throw new UnscorableDomainError({
      ...(run.stored_result as unknown as UnscorableScoreResult),
      cached: true,
      charged: false,
      idempotent_replayed: run.idempotent_replay,
    });
  }

  if (run.run_status === "failed") {
    throw new ScoreServiceError("Previous idempotent scoring attempt failed", run.error_code ?? "score_run_failed");
  }

  if (!run.run_id) throw new ScoreServiceError("Scoring transaction has no run ID", "score_run_begin_failed");
  if (!run.owns_run) throw new ScoreInProgressError(run.run_id);

  const isBaseline = run.is_baseline ?? true;
  let evidence: SignalEvidenceRow[] = [];
  let terminal = false;

  try {
    await emit({ stage: "domain", company: lookupCompany, domain: lookupDomain });

    const snapshot = await getEvidenceSnapshot(supabase, lookupDomain);
    evidence = snapshot.rows;
    await emit({
      stage: "signals",
      company: lookupCompany,
      domain: lookupDomain,
      signals: snapshot.signals,
    });
    const shouldComputeV3Shadow =
      scoringVersion === SCORING_VERSION &&
      process.env.SCORING_V3_SHADOW_ENABLED === "true";
    const policy = scoringVersion === SCORING_VERSION_V3 || shouldComputeV3Shadow
      ? await loadScoringPolicy(supabase, userId, profileHash, profile)
      : DEFAULT_SCORING_POLICY_V3;
    const partial = computeActiveIntentScore(
      lookupCompany,
      lookupDomain,
      snapshot.signals,
      new Date(),
      scoringVersion === SCORING_VERSION,
      scoringVersion === SCORING_VERSION_V3,
      policy
    );
    const v3Shadow = shouldComputeV3Shadow
      ? computeIntentScoreV3(
          lookupCompany,
          lookupDomain,
          snapshot.signals,
          new Date(partial.last_updated),
          policy
        )
      : null;
    const statuses = sourceStatuses(snapshot.signals);

    if (["unavailable", "not_found", "stale"].includes(statuses.hiring)) {
      void enqueueHiringRefresh(lookupDomain).catch((error) => {
        console.warn("[score-service] hiring refresh enqueue failed", error);
      });
    }
    const webEnrichmentSignals = webEnrichmentSignalsForStatuses(
      statuses,
      process.env.WEB_ENRICHMENT_FUNDING_FALLBACK === "true"
    );
    void enqueueWebEnrichment(lookupDomain, webEnrichmentSignals).catch((error) => {
      console.warn("[score-service] web enrichment enqueue failed", error);
    });

    if (
      partial.score_status === "unscorable" ||
      partial.intent_score === null ||
      partial.score_band === null
    ) {
      const unscorable: UnscorableScoreResult = {
        company: partial.company,
        domain: partial.domain,
        intent_score: null,
        score_band: null,
        score_status: "unscorable",
        scoring_version: partial.scoring_version,
        data_coverage: partial.data_coverage,
        contributions: partial.contributions,
        last_updated: partial.last_updated,
        score_decay_date: partial.score_decay_date,
        signals: partial.signals,
        source_status: statuses,
        is_baseline: isBaseline,
        automation_eligible: false,
        profile_hash: profileHash,
        icp_fit_score: null,
        model_fallback: false,
        cached: false,
        charged: false,
        idempotent_replayed: false,
      };
      await failScoreRun(
        supabase,
        run.run_id,
        "unscorable_domain",
        "Reliable trigger coverage is below the minimum threshold",
        true,
        unscorable,
        evidence
      );
      terminal = true;
      throw new UnscorableDomainError(unscorable);
    }

    await emit({
      stage: "score",
      company: partial.company,
      domain: partial.domain,
      intent_score: partial.intent_score,
      score_band: partial.score_band,
      data_coverage: partial.data_coverage,
      score_status: partial.score_status,
      icp_fit_score: null,
      signals: partial.signals,
      latest_signal_at: partial.signals?.latestSignalDate,
    });

    const firmographicsPromise = profile &&
      profile.target_industries.length > 0 &&
      parseEmployeeRange(profile.company_size)
      ? getFirmographics(supabase, lookupDomain, businessIdFromSignals(snapshot.signals))
      : Promise.resolve({ data: null, rows: [], status: "unavailable" as const });
    const reasoningPromise = generateReasoning(
      lookupCompany,
      partial.intent_score,
      partial.score_band,
      snapshot.signals,
      effectiveProductCategory,
      isBaseline,
      profile
    );
    const [firmographics, reasoning] = await Promise.all([
      firmographicsPromise,
      reasoningPromise,
    ]);
    evidence.push(...firmographics.rows);
    const { used_fallback: modelFallback, ...reasoningResult } = reasoning;
    await emit({
      stage: "action",
      recommended_action: reasoningResult.recommended_action,
      why_now: reasoningResult.why_now,
      urgency: reasoningResult.urgency,
    });
    const automationEligible =
      partial.score_status === "complete" &&
      !isBaseline &&
      scoringVersion === SCORING_VERSION;
    const result: StoredIntentScore = {
      ...partial,
      ...reasoningResult,
      icp_fit_score: computeIcpFit(profile, firmographics.data),
      score_explanation: `${reasoning.why_now} ${reasoning.recommended_action}`.trim(),
      profile_hash: profileHash,
      source_status: statuses,
      is_baseline: isBaseline,
      automation_eligible: automationEligible,
      model_fallback: modelFallback,
      cached: false,
      charged: false,
      idempotent_replayed: false,
      previous_v2_score: null,
      previous_v2_band: null,
    };

    const persisted = await completeScoreRun(supabase, run.run_id, result, evidence);
    const stored = scoringVersion === SCORING_VERSION_V3
      ? { ...persisted, automation_eligible: false }
      : persisted;
    terminal = true;
    if (v3Shadow) {
      await persistShadowScore(supabase, {
        runId: run.run_id,
        userId,
        domain: lookupDomain,
        result: v3Shadow,
      });
    }
    await cacheSet(resultCacheKey, stored, SCORE_RESULT_TTL_SECONDS);
    await runAutomationSideEffects(userId, lookupDomain, lookupCompany, stored);
    return stored;
  } catch (error) {
    if (!terminal) {
      const code = error instanceof ScoreServiceError ? error.code : "scoring_failed";
      const message = error instanceof Error ? error.message : "Unknown scoring failure";
      try {
        await failScoreRun(supabase, run.run_id, code, message, false, null, evidence);
      } catch (terminalError) {
        console.error("[score-service] could not refund failed run", terminalError);
      }
    }
    throw error;
  }
}
