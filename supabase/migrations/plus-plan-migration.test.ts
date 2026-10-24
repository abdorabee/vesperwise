import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/20261024161000_add_plus_plan.sql"),
  "utf8",
);

describe("plus plan migration", () => {
  it("replaces the plan check with one that includes plus and documents rollback", () => {
    expect(sql).toContain("check (plan in ('free', 'starter', 'plus', 'growth', 'pro', 'agency'))");
    expect(sql).toContain("only when no row uses plus");
    expect(sql).toContain("check (plan in ('free','starter','growth','pro','agency'))");
    expect(sql).not.toContain("20260305000000_initial_schema");
  });
});
