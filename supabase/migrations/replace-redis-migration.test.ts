import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL("./20260930000000_replace_redis.sql", import.meta.url),
  "utf8"
);

describe("Redis replacement migration invariants", () => {
  it("stores cache entries with database-enforced expiry metadata and RLS", () => {
    expect(sql).toContain("create table if not exists public.cache_entries");
    expect(sql).toContain("key text primary key");
    expect(sql).toContain("value jsonb not null");
    expect(sql).toContain("expires_at timestamptz not null");
    expect(sql).toContain("cache_entries_expires_at_idx");
    expect(sql).toContain("alter table public.cache_entries enable row level security");
  });

  it("deduplicates only live jobs through a partial unique index", () => {
    expect(sql).toContain("create table if not exists public.background_jobs");
    expect(sql).toContain("status text not null default 'queued'");
    expect(sql).toContain("check (status in ('queued', 'running', 'completed', 'failed'))");
    expect(sql).toMatch(
      /create unique index if not exists background_jobs_live_dedupe_idx[\s\S]*on public\.background_jobs \(queue, dedupe_key\)[\s\S]*where status in \('queued', 'running'\)/
    );
    expect(sql).toContain("background_jobs_queue_status_run_after_idx");
    expect(sql).toContain("alter table public.background_jobs enable row level security");
  });

  it("allows service-role cache and queue access without adding RLS policies", () => {
    expect(sql).toContain("grant all on table public.cache_entries to service_role");
    expect(sql).toContain("grant all on table public.background_jobs to service_role");
  });

  it("targets the live-job partial index when enqueueing", () => {
    const match = sql.match(
      /create or replace function public\.enqueue_background_job[\s\S]*?\n\$\$;/
    );
    expect(match).not.toBeNull();
    const enqueue = match?.[0] ?? "";

    expect(enqueue).toContain("security definer");
    expect(enqueue).toContain("set search_path = public");
    expect(enqueue).toMatch(
      /on conflict \(queue, dedupe_key\) where status in \('queued', 'running'\)\s+do nothing/
    );
    expect(enqueue).toContain("return coalesce(v_inserted, false)");
  });

  it("claims ready queued jobs and expired running jobs under skip-locked", () => {
    const match = sql.match(
      /create or replace function public\.claim_background_job[\s\S]*?\n\$\$;/
    );
    expect(match).not.toBeNull();
    const claim = match?.[0] ?? "";

    expect(claim).toContain("returns setof public.background_jobs");
    expect(claim).toContain("for update skip locked");
    expect(claim).toMatch(/status = 'queued' and run_after <= now\(\)/);
    expect(claim).toMatch(/status = 'running' and locked_until < now\(\)/);
    expect(claim).toContain("attempts = jobs.attempts + 1");
    expect(claim).toContain("locked_until = now() + make_interval(secs => p_lock_seconds)");
  });

  it("requeues failures with exponential backoff until attempts are exhausted", () => {
    const match = sql.match(
      /create or replace function public\.fail_background_job[\s\S]*?\n\$\$;/
    );
    expect(match).not.toBeNull();
    const fail = match?.[0] ?? "";

    expect(fail).toMatch(/when attempts < max_attempts then 'queued'/);
    expect(fail).toMatch(/else 'failed'/);
    expect(fail).toContain("power(2::numeric, greatest(attempts - 1, 0))");
    expect(fail).toMatch(/completed_at = case[\s\S]*else now\(\)/);
  });

  it("keeps every queue and cache RPC service-role only", () => {
    for (const signature of [
      "enqueue_background_job(text, text, jsonb, integer)",
      "claim_background_job(text, integer)",
      "complete_background_job(uuid)",
      "fail_background_job(uuid, text, integer)",
      "purge_expired_cache_entries()",
      "purge_finished_background_jobs()",
    ]) {
      expect(sql).toContain(
        `revoke all on function public.${signature} from anon, authenticated`
      );
      expect(sql).toContain(
        `grant execute on function public.${signature} to service_role`
      );
    }
  });

  it("schedules purges only when Supabase Cron is enabled", () => {
    expect(sql).toMatch(/extname = 'pg_cron'[\s\S]*cron\.schedule/);
    expect(sql).toContain("'cache-entry-purge'");
    expect(sql).toContain("'postgres-background-job-purge'");
    expect(sql).toContain("select public.purge_expired_cache_entries()");
    expect(sql).toContain("select public.purge_finished_background_jobs()");
  });
});
