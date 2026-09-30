import { describe, expect, it } from "vitest";
import { BILLING_PLANS, BILLING_TOPUPS } from "@/lib/billing-plans";
import { MARKETING_PLANS, MARKETING_TOPUPS, planFeatures } from "@/lib/plan-features";
import { PLAN_CREDITS, PLAN_WATCHLIST_LIMIT } from "@/lib/types";
import { DEMO_ACCOUNTS, DEMO_PEOPLE, bandFor } from "@/components/landing/demo-accounts";

const UNBACKED = /\b(hubspot|salesforce|sso|scim|seats?|sla|csm|white-label|multi-workspace|custom scoring)\b/i;

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
      for (const feat of plan.features) expect(feat).not.toMatch(UNBACKED);
    }
  });

  it("keeps billing, pricing and landing on the same plan list", () => {
    expect(BILLING_PLANS.map((p) => [p.key, p.price, p.credits])).toEqual(
      MARKETING_PLANS.map((p) => [p.key, p.price, p.credits])
    );
    for (const plan of BILLING_PLANS) expect(plan.features).toEqual(planFeatures(plan.key));
    expect(BILLING_TOPUPS.map((t) => t.credits)).toEqual(MARKETING_TOPUPS.map((t) => t.credits));
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
