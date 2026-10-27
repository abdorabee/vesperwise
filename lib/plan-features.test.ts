import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BILLING_PLANS, BILLING_TOPUPS } from "@/lib/billing-plans";
import { BULK_INLINE_MAX_ROWS, BULK_MAX_PER_JOB, MARKETING_PLANS, MARKETING_TOPUPS, planFeatures } from "@/lib/plan-features";
import { PLAN_CREDITS, PLAN_WATCHLIST_LIMIT } from "@/lib/types";
import { DEMO_ACCOUNTS, DEMO_PEOPLE, bandFor } from "@/components/landing/demo-accounts";

const UNBACKED = /\b(hubspot|salesforce|sso|scim|sla|csm|white-label|multi-workspace|custom scoring)\b/i;

describe("plan features", () => {
  it("derives limits from the enforced plan constants", () => {
    for (const plan of MARKETING_PLANS) {
      expect(plan.credits).toBe(PLAN_CREDITS[plan.key]);
      const limit = PLAN_WATCHLIST_LIMIT[plan.key];
      const watchlist = plan.features.find((f) => f.toLowerCase().includes("watchlist"));
      expect(watchlist).toContain(limit == null ? "Unlimited" : limit.toLocaleString("en-US"));
    }
  });

  it("never lists features the product does not have", () => {
    for (const plan of MARKETING_PLANS) {
      for (const feat of plan.features) {
        expect(feat).not.toMatch(UNBACKED);
        if (/seat/i.test(feat)) expect(feat).toBe("1 seat");
      }
    }
  });

  it("starts paid plans at $10 and keeps starter off bulk, CSV and autopilot", () => {
    const starter = MARKETING_PLANS.find((plan) => plan.key === "starter");
    expect(starter?.price).toBe(10);
    expect(starter?.features.join(" ")).toMatch(/no bulk, csv or autopilot/i);
    expect(MARKETING_PLANS.map((plan) => plan.key)).not.toContain("agency");
  });

  it("keeps billing, pricing and landing on the same sold plan list", () => {
    const sold = BILLING_PLANS.filter((plan) => !plan.contactOnly);
    expect(sold.map((p) => [p.key, p.price, p.credits])).toEqual(
      MARKETING_PLANS.map((p) => [p.key, p.price, p.credits])
    );
    for (const plan of BILLING_PLANS) expect(plan.features).toEqual(planFeatures(plan.key));
    expect(BILLING_PLANS.find((plan) => plan.key === "agency")?.contactOnly).toBe(true);
    expect(BILLING_TOPUPS.map((t) => t.credits)).toEqual(MARKETING_TOPUPS.map((t) => t.credits));
  });

  it("shows the dashboard CSV cap on /bulk and /pricing, and keeps queued jobs at 1,000", () => {
    expect(BULK_INLINE_MAX_ROWS).toBe(50);
    expect(BULK_MAX_PER_JOB).toBe(1000);
    const pages = [
      "app/(dashboard)/bulk/page.tsx",
      "app/pricing/pricing-view.tsx",
      "components/bulk/bulk-workspace.tsx",
    ];
    for (const page of pages) {
      expect(readFileSync(join(process.cwd(), page), "utf8")).toContain("BULK_INLINE_MAX_ROWS");
    }
    const pricing = readFileSync(join(process.cwd(), "app/pricing/pricing-view.tsx"), "utf8");
    expect(pricing).not.toContain("BULK_MAX_PER_JOB");
    const jobs = readFileSync(join(process.cwd(), "app/api/v1/score/bulk/route.ts"), "utf8");
    expect(jobs).toContain("BULK_MAX_PER_JOB");
    const inline = readFileSync(join(process.cwd(), "app/api/v1/score/bulk-inline/route.ts"), "utf8");
    expect(inline).toContain("bulkCsvIssue");
    expect(inline).not.toContain("MAX_ROWS");
  });
});

describe("landing demo data", () => {
  it("is sorted by score and every trend ends at the account's score", () => {
    const scores = DEMO_ACCOUNTS.map((a) => a.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    for (const a of DEMO_ACCOUNTS) expect(a.trend.at(-1)).toBe(a.score);
  });

  it("uses the product's band thresholds", () => {
    expect(bandFor(75)).toBe("HOT");
    expect(bandFor(74)).toBe("WARM");
    expect(bandFor(50)).toBe("WARM");
    expect(bandFor(49)).toBe("COLD");
  });

  it("only attaches people to demo companies", () => {
    const domains = new Set(DEMO_ACCOUNTS.map((a) => a.domain));
    for (const p of DEMO_PEOPLE) expect(domains.has(p.domain)).toBe(true);
  });
});
