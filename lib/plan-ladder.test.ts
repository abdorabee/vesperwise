import { describe, expect, it } from "vitest";
import { planCardAction, isGrantedPlan } from "@/lib/billing-plans";
import {
  MARKETING_TOPUPS,
  PLAN_LABEL,
  PLAN_ORDER,
  PLAN_PRICE,
  STARTING_PRICE,
  TOPUP_PACKS,
  canUseFeature,
  featureDeniedMessage,
  type GatedFeature,
  type PlanKey,
} from "@/lib/plan-features";
import {
  PLAN_AUTOPILOT_LIMIT,
  PLAN_CREDITS,
  PLAN_RATE_LIMIT,
  PLAN_WATCHLIST_LIMIT,
} from "@/lib/types";

const PLANS: PlanKey[] = ["free", "starter", "plus", "growth", "pro", "agency"];
const FEATURES: GatedFeature[] = ["bulk", "csv", "autopilot", "treg"];

describe("pricing ladder constants", () => {
  it("sets every plan credit, watchlist, rate, autopilot and price", () => {
    expect(PLAN_ORDER).toEqual(PLANS);
    expect(PLAN_CREDITS).toEqual({
      free: 20,
      starter: 100,
      plus: 400,
      growth: 1200,
      pro: 3000,
      agency: 25000,
    });
    expect(PLAN_WATCHLIST_LIMIT).toEqual({
      free: 5,
      starter: 25,
      plus: 75,
      growth: 250,
      pro: 1000,
      agency: null,
    });
    expect(PLAN_RATE_LIMIT).toEqual({
      free: 10,
      starter: 20,
      plus: 60,
      growth: 100,
      pro: 100,
      agency: 100,
    });
    expect(PLAN_AUTOPILOT_LIMIT).toEqual({
      free: 0,
      starter: 0,
      plus: 3,
      growth: 20,
      pro: 50,
      agency: null,
    });
    expect(PLAN_PRICE).toEqual({
      free: 0,
      starter: 10,
      plus: 29,
      growth: 79,
      pro: 199,
      agency: 0,
    });
    expect(STARTING_PRICE).toBe(10);
    expect(TOPUP_PACKS.map((pack) => [pack.credits, pack.price])).toEqual([
      [25, 3],
      [70, 8],
      [140, 15],
    ]);
    expect(MARKETING_TOPUPS.map((pack) => pack.credits)).toEqual([25, 70, 140]);
  });

  it("gates bulk, csv, autopilot and treg", () => {
    for (const feature of FEATURES) {
      expect(canUseFeature("free", feature)).toBe(false);
      expect(canUseFeature("starter", feature)).toBe(false);
    }
    expect(canUseFeature("plus", "bulk")).toBe(true);
    expect(canUseFeature("plus", "csv")).toBe(true);
    expect(canUseFeature("plus", "autopilot")).toBe(true);
    expect(canUseFeature("plus", "treg")).toBe(false);
    for (const plan of ["growth", "pro", "agency"] as const) {
      for (const feature of FEATURES) expect(canUseFeature(plan, feature)).toBe(true);
    }
  });

  it("tells free and starter to upgrade to Plus, and Plus to upgrade to Growth for Treg", () => {
    expect(featureDeniedMessage("free", "bulk")).toBe(
      "Bulk scoring is not included on the Free plan. Upgrade to Plus.",
    );
    expect(featureDeniedMessage("starter", "csv")).toBe(
      "CSV upload and export is not included on the Starter plan. Upgrade to Plus.",
    );
    expect(featureDeniedMessage("plus", "treg")).toContain(PLAN_LABEL.growth);
  });

  it("hides upgrade and downgrade on a granted plan and keeps agency as contact", () => {
    expect(isGrantedPlan("agency", null)).toBe(true);
    expect(isGrantedPlan("agency", "sub_1")).toBe(false);
    expect(isGrantedPlan("free", null)).toBe(false);
    expect(planCardAction("agency", "pro", true)).toBe("hidden");
    expect(planCardAction("agency", "starter", true)).toBe("hidden");
    expect(planCardAction("agency", "agency", true)).toBe("current");
    expect(planCardAction("free", "agency", false)).toBe("contact");
    expect(planCardAction("free", "plus", false)).toBe("upgrade");
  });
});
