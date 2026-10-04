import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/20261004000000_topup_credits.sql"),
  "utf8"
).toLowerCase();

describe("top-up credits migration", () => {
  it("tracks top-up credits and the last granted billing period", () => {
    expect(sql).toContain("add column if not exists topup_credits integer not null default 0");
    expect(sql).toContain("add column if not exists subscription_period_start timestamptz");
    expect(sql).toContain("check (topup_credits >= 0)");
  });

  it("clamps top-up credits when the balance drops so plan credits are spent first", () => {
    expect(sql).toContain("before update of credits_remaining on public.users");
    expect(sql).toContain("least(new.topup_credits, new.credits_remaining)");
  });

  it("locks the top-up RPC to the service role", () => {
    expect(sql).toContain("revoke all on function public.increment_topup_credits(text, integer) from anon, authenticated");
    expect(sql).toContain("grant execute on function public.increment_topup_credits(text, integer) to service_role");
  });
});
