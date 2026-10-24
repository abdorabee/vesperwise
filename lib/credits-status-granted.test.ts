import { describe, it, expect } from "vitest";
import { getCreditStatus, GRANTED_LOW_CREDIT_THRESHOLD, LOW_CREDIT_USED_PCT } from "@/lib/credits-status";
import { PLAN_CREDITS } from "@/lib/types";

describe("Low Credits Status", () => {
  it("should NOT flag 496/25,000 on granted agency plan as low", () => {
    const status = getCreditStatus({
      creditsRemaining: 496,
      creditCap: PLAN_CREDITS.agency,
      plan: "agency",
      polarSubscriptionId: null, // Granted (no subscription)
    });

    expect(status.isLow).toBe(false);
    expect(status.pct).toBeGreaterThan(0);
  });

  it("should flag granted plan below 100 credits as low", () => {
    const status = getCreditStatus({
      creditsRemaining: 99,
      creditCap: PLAN_CREDITS.agency,
      plan: "agency",
      polarSubscriptionId: null, // Granted
    });

    expect(status.isLow).toBe(true);
  });

  it("should use 80% rule for paid plans, not absolute threshold", () => {
    // 19 credits on a free plan (20 total) = 5% remaining = 95% used
    const freeUser = getCreditStatus({
      creditsRemaining: 19,
      creditCap: PLAN_CREDITS.free,
      plan: "free",
      polarSubscriptionId: null,
    });

    // 95% used is > 80% threshold, so should be low
    expect(freeUser.isLow).toBe(true);

    // 80 of 100 credits remaining (20% used) should NOT be low
    const starterUser = getCreditStatus({
      creditsRemaining: 80,
      creditCap: PLAN_CREDITS.starter,
      plan: "starter",
      polarSubscriptionId: "sub_123", // Paid
    });

    expect(starterUser.isLow).toBe(false);

    // 20 of 100 credits remaining (80% used) should be low
    const starterUserLow = getCreditStatus({
      creditsRemaining: 20,
      creditCap: PLAN_CREDITS.starter,
      plan: "starter",
      polarSubscriptionId: "sub_123",
    });

    expect(starterUserLow.isLow).toBe(true);
  });

  it("should treat free plan by usage percentage, not by granted threshold", () => {
    // Free user with 19/20 credits = 5% used, should NOT be low
    const freeHigh = getCreditStatus({
      creditsRemaining: 19,
      creditCap: PLAN_CREDITS.free,
      plan: "free",
      polarSubscriptionId: null,
    });

    // But if they have only 1 credit left out of 20, that's 95% used, should be low
    const freeLow = getCreditStatus({
      creditsRemaining: 1,
      creditCap: PLAN_CREDITS.free,
      plan: "free",
      polarSubscriptionId: null,
    });

    expect(freeLow.isLow).toBe(true);
  });

  it("should use granted threshold for agency without subscription", () => {
    const grantedAgency = getCreditStatus({
      creditsRemaining: 5000,
      creditCap: PLAN_CREDITS.agency,
      plan: "agency",
      polarSubscriptionId: null, // No subscription = granted
    });

    expect(grantedAgency.isLow).toBe(false);

    const grantedAgencyLow = getCreditStatus({
      creditsRemaining: 50,
      creditCap: PLAN_CREDITS.agency,
      plan: "agency",
      polarSubscriptionId: null,
    });

    expect(grantedAgencyLow.isLow).toBe(true);
  });

  it("should use usage percentage for paid agency plan", () => {
    // Paid agency (has subscription) uses percentage rule
    const paidAgency = getCreditStatus({
      creditsRemaining: 5000,
      creditCap: PLAN_CREDITS.agency,
      plan: "agency",
      polarSubscriptionId: "sub_agency123",
    });

    // 5000/25000 = 20% remaining = 80% used, should be at threshold
    expect(paidAgency.isLow).toBe(true);

    const paidAgencyHigh = getCreditStatus({
      creditsRemaining: 20000,
      creditCap: PLAN_CREDITS.agency,
      plan: "agency",
      polarSubscriptionId: "sub_agency123",
    });

    // 20000/25000 = 80% remaining = 20% used, should NOT be low
    expect(paidAgencyHigh.isLow).toBe(false);
  });
});
