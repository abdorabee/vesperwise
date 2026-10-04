import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/20261004010000_free_monthly_reset.sql"),
  "utf8"
).toLowerCase();

describe("free monthly reset migration", () => {
  it("tracks when each user's allowance was last refilled", () => {
    expect(sql).toContain("add column if not exists credits_reset_at timestamptz not null default now()");
    expect(sql).toContain("update public.users set credits_reset_at = created_at");
  });

  it("refills only free users due for a refill, never lowering a balance", () => {
    expect(sql).toContain("where plan = 'free'");
    expect(sql).toContain("credits_reset_at <= now() - interval '1 month'");
    expect(sql).toContain("greatest(credits_remaining, p_allowance + topup_credits)");
  });

  it("locks the reset RPC to the service role", () => {
    expect(sql).toContain("revoke all on function public.reset_free_credits(integer) from anon, authenticated");
    expect(sql).toContain("grant execute on function public.reset_free_credits(integer) to service_role");
  });
});
