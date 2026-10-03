import { describe, expect, it } from "vitest";
import {
  LOW_CREDIT_PCT,
  creditPercent,
  getCreditStatus,
} from "./credits-status";

describe("credits status", () => {
  it("clamps credit percent to the visible 0-100 meter range", () => {
    expect(creditPercent(125, 100)).toBe(100);
    expect(creditPercent(-5, 100)).toBe(0);
    expect(creditPercent(10, 0)).toBe(0);
  });

  it("uses the shared low-credit threshold and keeps exactly 20 percent out of warning state", () => {
    expect(LOW_CREDIT_PCT).toBe(20);

    expect(getCreditStatus({ creditsRemaining: 19, creditCap: 100, plan: "starter" })).toMatchObject({
      pct: 19,
      isLow: true,
      cta: "Top up",
    });
    expect(getCreditStatus({ creditsRemaining: 20, creditCap: 100, plan: "starter" })).toMatchObject({
      pct: 20,
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
    expect(getCreditStatus({ creditsRemaining: 42, creditCap: 2500, plan: "growth" })).toMatchObject({
      isLow: true,
      cta: "Top up",
      planLabel: "Growth",
      summary: "42 of 2,500 credits remaining",
    });
  });
});
