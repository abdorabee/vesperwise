import { createClient } from "@supabase/supabase-js";
import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

// End-to-end check of the Postgres cache/queue through PostgREST + supabase-js,
// the same path production uses. Requires a disposable database with the
// 20260930000000_replace_redis.sql migration applied and PostgREST in front:
//   REPLACE_REDIS_DB_TESTS=true
//   REPLACE_REDIS_TEST_DATABASE_URL=postgres://...   (direct, for resets)
//   NEXT_PUBLIC_SUPABASE_URL=http://...              (serves /rest/v1)
//   SUPABASE_SERVICE_ROLE_KEY=<service_role JWT>
const enabled = process.env.REPLACE_REDIS_DB_TESTS === "true";
const databaseUrl = process.env.REPLACE_REDIS_TEST_DATABASE_URL?.trim();

if (enabled && !databaseUrl) {
  throw new Error(
    "REPLACE_REDIS_TEST_DATABASE_URL is required when REPLACE_REDIS_DB_TESTS=true"
  );
}

const SAMPLE_SIZE = 200;
const THROUGHPUT_JOBS = 200;
const CONCURRENT_WORKERS = 4;
const CONCURRENT_JOBS = 400;

function percentile(samples: number[], p: number): number {
  const sorted = [...samples].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return Number(sorted[Math.max(0, index)].toFixed(2));
}

function summarize(samples: number[]) {
  return {
    p50_ms: percentile(samples, 50),
    p95_ms: percentile(samples, 95),
    p99_ms: percentile(samples, 99),
  };
}

async function timed(fn: () => Promise<unknown>): Promise<number> {
  const start = performance.now();
  await fn();
  return performance.now() - start;
}

describe.skipIf(!enabled)("Redis replacement over PostgREST", () => {
  let pool: Pool;
  const stats: Record<string, unknown> = {};

  beforeAll(() => {
    pool = new Pool({ connectionString: databaseUrl });
  });

  beforeEach(async () => {
    await pool.query("truncate public.background_jobs, public.cache_entries");
  });

  afterAll(async () => {
    console.log("REPLACE_REDIS_STATS " + JSON.stringify(stats, null, 2));
    await pool?.end();
  });

  it("round-trips cache values and hides expired entries", async () => {
    const { cacheGet, cacheSet } = await import("@/lib/cache");
    const value = { score: 82, band: "HOT", signals: { hiring: { score: 18 } } };

    await cacheSet("score:result:test", value, 60);
    await expect(cacheGet("score:result:test")).resolves.toEqual(value);
    await expect(cacheGet("score:missing")).resolves.toBeNull();

    await cacheSet("score:result:test", { score: 90 }, 60);
    await expect(cacheGet("score:result:test")).resolves.toEqual({ score: 90 });

    await pool.query(
      "update public.cache_entries set expires_at = now() - interval '1 second'"
    );
    await expect(cacheGet("score:result:test")).resolves.toBeNull();
  });

  it("measures cache latency", async () => {
    const { cacheGet, cacheSet } = await import("@/lib/cache");
    const payload = { score: 71, detail: "x".repeat(4_000) };
    const writes: number[] = [];
    const hits: number[] = [];
    const misses: number[] = [];

    for (let i = 0; i < SAMPLE_SIZE; i += 1) {
      writes.push(await timed(() => cacheSet(`bench:${i}`, payload, 600)));
    }
    for (let i = 0; i < SAMPLE_SIZE; i += 1) {
      hits.push(await timed(async () => {
        expect(await cacheGet(`bench:${i}`)).not.toBeNull();
      }));
    }
    for (let i = 0; i < SAMPLE_SIZE; i += 1) {
      misses.push(await timed(() => cacheGet(`bench:missing:${i}`)));
    }

    stats.cache = {
      samples_each: SAMPLE_SIZE,
      payload_bytes: JSON.stringify(payload).length,
      write: summarize(writes),
      read_hit: summarize(hits),
      read_miss: summarize(misses),
    };
  });

  it("enqueues through the real producers with dedupe", async () => {
    process.env.BACKGROUND_JOBS_ENABLED = "true";
    process.env.MOCK_SIGNALS = "false";
    const { enqueueHiringRefresh } = await import("@/lib/hiring-refresh-queue");
    const { enqueueWebEnrichment } = await import("@/lib/web-enrichment-queue");

    await expect(enqueueHiringRefresh("Acme.com")).resolves.toBe(true);
    await expect(enqueueHiringRefresh("acme.com")).resolves.toBe(false);
    await expect(enqueueWebEnrichment("acme.com")).resolves.toBe(true);

    const { rows } = await pool.query(
      "select queue, dedupe_key, payload->>'domain' as domain, status from public.background_jobs order by queue"
    );
    expect(rows).toEqual([
      { queue: "hiring-refresh", dedupe_key: "hiring-v2-acme.com", domain: "acme.com", status: "queued" },
      {
        queue: "web-enrichment",
        dedupe_key: "web-enrichment-v1-acme.com",
        domain: "acme.com",
        status: "queued",
      },
    ]);

    process.env.BACKGROUND_JOBS_ENABLED = "false";
    await pool.query("truncate public.background_jobs");
    await expect(enqueueHiringRefresh("other.com")).resolves.toBe(false);
    const { rows: gated } = await pool.query("select count(*)::int as n from public.background_jobs");
    expect(gated[0].n).toBe(0);
  });

  it("measures enqueue latency", async () => {
    process.env.BACKGROUND_JOBS_ENABLED = "true";
    const { enqueueJob } = await import("@/lib/job-queue");
    const inserts: number[] = [];
    const duplicates: number[] = [];

    for (let i = 0; i < SAMPLE_SIZE; i += 1) {
      inserts.push(await timed(() => enqueueJob("bench", `d${i}`, { i })));
    }
    for (let i = 0; i < SAMPLE_SIZE; i += 1) {
      duplicates.push(await timed(() => enqueueJob("bench", `d${i}`, { i })));
    }

    stats.enqueue = {
      samples_each: SAMPLE_SIZE,
      new_job: summarize(inserts),
      duplicate_rejected: summarize(duplicates),
    };
  });

  it("runs the worker loop: success, retry, and terminal failure", async () => {
    const { runQueueWorker } = await import("../../workers/shared/pg-queue.mjs");
    const supabase = serviceClient();
    await pool.query(`
      insert into public.background_jobs (queue, dedupe_key, payload) values
        ('e2e', 'ok', '{"mode":"ok"}'),
        ('e2e', 'flaky', '{"mode":"flaky"}'),
        ('e2e', 'broken', '{"mode":"broken"}')
    `);
    const attemptsSeen: Record<string, number[]> = {};
    const failures: string[] = [];

    await runQueueWorker({
      supabase,
      queue: "e2e",
      lockSeconds: 60,
      pollIntervalMs: 10,
      backoffSeconds: 0,
      handler: async (job: { data: { mode: string }; attemptsMade: number }) => {
        const { mode } = job.data;
        attemptsSeen[mode] = [...(attemptsSeen[mode] ?? []), job.attemptsMade];
        if (mode === "broken") throw new Error("always fails");
        if (mode === "flaky" && job.attemptsMade === 0) throw new Error("first try fails");
      },
      onFailed: async (_job: unknown, error: Error) => {
        failures.push(error.message);
      },
      stop: () => (attemptsSeen.broken?.length ?? 0) >= 3,
    });

    const { rows } = await pool.query(
      "select dedupe_key, status, attempts, last_error from public.background_jobs order by dedupe_key"
    );
    expect(rows).toEqual([
      { dedupe_key: "broken", status: "failed", attempts: 3, last_error: "always fails" },
      { dedupe_key: "flaky", status: "completed", attempts: 2, last_error: null },
      { dedupe_key: "ok", status: "completed", attempts: 1, last_error: null },
    ]);
    expect(attemptsSeen.flaky).toEqual([0, 1]);
    expect(failures).toHaveLength(4);
  });

  it("measures single-worker throughput", async () => {
    const { runQueueWorker } = await import("../../workers/shared/pg-queue.mjs");
    await pool.query(
      `insert into public.background_jobs (queue, dedupe_key, payload)
       select 'tp', 'j' || g, '{}'::jsonb from generate_series(1, ${THROUGHPUT_JOBS}) g`
    );
    let done = 0;

    const elapsed = await timed(() => runQueueWorker({
      supabase: serviceClient(),
      queue: "tp",
      lockSeconds: 60,
      pollIntervalMs: 0,
      handler: async () => { done += 1; },
      stop: () => done >= THROUGHPUT_JOBS,
    }));

    stats.single_worker = {
      jobs: THROUGHPUT_JOBS,
      total_ms: Math.round(elapsed),
      jobs_per_second: Math.round((THROUGHPUT_JOBS / elapsed) * 1000),
      overhead_per_job_ms: Number((elapsed / THROUGHPUT_JOBS).toFixed(2)),
    };
  });

  it("never hands one job to two concurrent workers", async () => {
    const { runQueueWorker } = await import("../../workers/shared/pg-queue.mjs");
    await pool.query(
      `insert into public.background_jobs (queue, dedupe_key, payload)
       select 'cc', 'j' || g, jsonb_build_object('n', g) from generate_series(1, ${CONCURRENT_JOBS}) g`
    );
    const seen: number[] = [];
    const perWorker = Array.from({ length: CONCURRENT_WORKERS }, () => 0);
    const finished = () => seen.length >= CONCURRENT_JOBS;

    const elapsed = await timed(() => Promise.all(perWorker.map((_, worker) =>
      runQueueWorker({
        supabase: serviceClient(),
        queue: "cc",
        lockSeconds: 60,
        pollIntervalMs: 5,
        handler: async (job: { data: { n: number } }) => {
          seen.push(job.data.n);
          perWorker[worker] += 1;
          await new Promise((resolve) => setTimeout(resolve, 2));
        },
        stop: finished,
      })
    )));

    const duplicates = seen.length - new Set(seen).size;
    const { rows } = await pool.query(
      "select count(*) filter (where status = 'completed')::int as completed, max(attempts)::int as max_attempts from public.background_jobs where queue = 'cc'"
    );
    expect(duplicates).toBe(0);
    expect(rows[0]).toEqual({ completed: CONCURRENT_JOBS, max_attempts: 1 });

    stats.concurrent_workers = {
      workers: CONCURRENT_WORKERS,
      jobs: CONCURRENT_JOBS,
      simulated_work_ms_per_job: 2,
      duplicate_deliveries: duplicates,
      jobs_per_worker: perWorker,
      total_ms: Math.round(elapsed),
      jobs_per_second: Math.round((CONCURRENT_JOBS / elapsed) * 1000),
    };
  });
});

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
