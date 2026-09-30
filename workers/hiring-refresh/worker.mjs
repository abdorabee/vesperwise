import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { runQueueWorker } from "../shared/pg-queue.mjs";
import { shouldPromoteEvidence } from "./promotion.mjs";

const execFileAsync = promisify(execFile);
const QUEUE_NAME = "hiring-refresh";
const CRAWLER_PATH = fileURLToPath(new URL("./crawl.py", import.meta.url));

function crawlerEnvironment() {
  const allowed = [
    "LANG",
    "LC_ALL",
    "PATH",
    "PLAYWRIGHT_BROWSERS_PATH",
    "PYTHONPATH",
    "SCRAPLING_BROWSER_ENABLED",
    "SSL_CERT_DIR",
    "SSL_CERT_FILE",
    "TMPDIR",
  ];
  return Object.fromEntries([
    ...allowed.flatMap((name) => process.env[name] ? [[name, process.env[name]]] : []),
    ["HOME", "/tmp"],
  ]);
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const supabase = createClient(
  requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function handleHiringRefresh(job) {
  const { domain, schemaVersion, shadow } = job.data;
  if (typeof domain !== "string" || typeof schemaVersion !== "string") {
    throw new Error("Invalid hiring refresh payload");
  }

  const { stdout } = await execFileAsync(
    process.env.PYTHON_BIN || "python3",
    [CRAWLER_PATH, "--domain", domain, "--schema-version", schemaVersion],
    {
      timeout: Number(process.env.SCRAPLING_JOB_TIMEOUT_MS || 90_000),
      maxBuffer: 5 * 1024 * 1024,
      // The parser handles untrusted web content and must not inherit Supabase
      // or unrelated application credentials.
      env: crawlerEnvironment(),
    }
  );

  const result = JSON.parse(stdout);
  const now = new Date().toISOString();
  const promoted = shouldPromoteEvidence({
    requestedShadow: shadow !== false,
    adapters: result.evidence?.adapters,
    allowlist: process.env.SCRAPLING_PROMOTED_ADAPTERS,
  });
  const evidenceRow = {
    canonical_domain: domain,
    signal_type: "hiring",
    source: "scrapling",
    schema_version: schemaVersion,
    status: result.status,
    observed_at: result.observed_at,
    fetched_at: result.fetched_at || now,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    evidence: result.evidence,
    raw_payload: result,
    shadow: !promoted,
  };
  const { error } = await supabase.rpc("persist_signal_evidence", {
    p_evidence: [evidenceRow],
  });

  if (error) throw new Error(`signal_evidence persistence failed: ${error.message}`);
  return {
    domain,
    status: result.status,
    jobCount: result.evidence?.job_count ?? 0,
    adapters: result.evidence?.adapters ?? [],
    promoted,
  };
}

const abortController = new AbortController();
const worker = runQueueWorker({
  supabase,
  queue: QUEUE_NAME,
  handler: handleHiringRefresh,
  lockSeconds: 120,
  signal: abortController.signal,
  onFailed: (job, error) => {
    console.error("[hiring-refresh] job failed", job?.id, error);
  },
});

worker.catch((error) => {
  console.error("[hiring-refresh] worker stopped", error);
  process.exitCode = 1;
});

async function shutdown() {
  abortController.abort();
  await worker.catch(() => {});
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
