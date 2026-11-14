import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/20261112000000_rate_limit.sql"),
  "utf8"
).toLowerCase();

describe("rate limit migration", () => {
  it("creates the counters table with RLS enabled", () => {
    expect(sql).toContain("create table if not exists public.rate_limit_counters");
    expect(sql).toContain("primary key (bucket_key, window_start)");
    expect(sql).toContain("alter table public.rate_limit_counters enable row level security");
  });

  it("defines check_rate_limit with an atomic on-conflict upsert", () => {
    expect(sql).toContain("create or replace function public.check_rate_limit(");
    expect(sql).toContain("on conflict (bucket_key, window_start) do update");
    expect(sql).toContain("count = c.count + 1");
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = public");
  });

  it("locks the function to the service role", () => {
    expect(sql).toContain(
      "revoke all on function public.check_rate_limit(text, integer, integer) from anon, authenticated"
    );
    expect(sql).toContain(
      "grant execute on function public.check_rate_limit(text, integer, integer) to service_role"
    );
  });
});
