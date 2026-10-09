import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/20261009000000_score_brief.sql"),
  "utf8"
).toLowerCase();

describe("score brief migration", () => {
  it("adds a nullable brief column to scores", () => {
    expect(sql).toContain("alter table public.scores add column if not exists brief jsonb");
    expect(sql).not.toContain("brief jsonb not null");
  });

  it("copies the completed run's brief into its score row", () => {
    expect(sql).toContain("new.status = 'completed'");
    expect(sql).toContain("set brief = new.result -> 'brief'");
    expect(sql).toContain("after update of status, result, score_id on public.score_runs");
  });

  it("keeps the trigger function out of client reach", () => {
    expect(sql).toContain("set search_path = public");
    expect(sql).toContain("revoke all on function public.sync_score_brief() from public, anon, authenticated");
  });
});
