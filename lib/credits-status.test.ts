import { describe, expect, it } from "vitest";
import { PLAN_CREDITS } from "@/lib/types";
import {
  LOW_CREDIT_PCT,
  LOW_CREDIT_USED_PCT,
  allowanceUsedPercent,
  creditPercent,
  getCreditStatus,
} from "./credits-status";

describe("credits status", () => {
  it("clamps credit percent to the visible 0-100 meter range", () => {
    expect(creditPercent(125, 100)).toBe(100);
    expect(creditPercent(-5, 100)).toBe(0);
    expect(creditPercent(10, 0)).toBe(0);
  });

  it("warns at 80 percent of the plan allowance used, from the remaining balance", () => {
    expect(LOW_CREDIT_USED_PCT).toBe(80);
    expect(LOW_CREDIT_PCT).toBe(20);
    expect(allowanceUsedPercent(20, 100)).toBe(80);
    expect(allowanceUsedPercent(21, 100)).toBe(79);
    expect(allowanceUsedPercent(150, 100)).toBe(0);

    expect(getCreditStatus({ creditsRemaining: 20, creditCap: 100, plan: "starter" })).toMatchObject({
      pct: 20,
      isLow: true,
      cta: "Top up",
    });
    expect(getCreditStatus({ creditsRemaining: 21, creditCap: 100, plan: "starter" })).toMatchObject({
      pct: 21,
      isLow: false,
      cta: "Top up",
    });
  });

  it("uses Upgrade for free plans and Top up for paid plans", () => {
    expect(getCreditStatus({ creditsRemaining: 3, creditCap: 20, plan: "free" })).toMatchObject({
      isLow: true,
      cta: "Upgrade",
      planLabel: "Free",
      summary: "3 of 20 credits remaining",
    });
    expect(getCreditStatus({ creditsRemaining: 42, creditCap: PLAN_CREDITS.growth, plan: "growth" })).toMatchObject({
      isLow: true,
      cta: "Top up",
      planLabel: "Growth",
      summary: "42 of 1,200 credits remaining",
    });
  });
});
