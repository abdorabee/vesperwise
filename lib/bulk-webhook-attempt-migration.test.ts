import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/20261024200000_bulk_webhook_attempts.sql"),
  "utf8",
);

describe("bulk webhook attempt migration", () => {
  it("adds a retry lease and only marks a send after success or give-up", () => {
    expect(sql).toContain("add column if not exists webhook_attempts");
    expect(sql).toContain("claim_bulk_webhook_attempt");
    expect(sql).toContain("release_bulk_webhook_attempt");
    expect(sql).toContain("give_up_bulk_webhook");
    expect(sql).toContain("webhook_sent_at is null");
    expect(sql).toContain("grant execute on function public.claim_bulk_webhook_attempt(uuid, integer, integer) to service_role");
    expect(sql).toContain("drop function if exists public.claim_bulk_webhook_attempt(uuid, integer, integer)");
  });
});
