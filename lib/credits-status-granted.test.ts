import { describe, expect, it } from "vitest";
import { GRANTED_LOW_CREDIT_THRESHOLD, creditDenominator, getCreditStatus } from "@/lib/credits-status";
import { PLAN_CREDITS } from "@/lib/types";

describe("Low credits status", () => {
  it("does not flag 496/25,000 on a granted agency plan", () => {
    const status = getCreditStatus({
      creditsRemaining: 496,
      creditCap: PLAN_CREDITS.agency,
      plan: "agency",
      polarSubscriptionId: null,
    });

    expect(GRANTED_LOW_CREDIT_THRESHOLD).toBeLessThan(496);
    expect(status.isLow).toBe(false);
  });

  it("flags a granted plan only under the absolute threshold", () => {
    expect(getCreditStatus({
      creditsRemaining: GRANTED_LOW_CREDIT_THRESHOLD,
      creditCap: PLAN_CREDITS.agency,
      plan: "agency",
      polarSubscriptionId: null,
    }).isLow).toBe(false);

    expect(getCreditStatus({
      creditsRemaining: GRANTED_LOW_CREDIT_THRESHOLD - 1,
      creditCap: PLAN_CREDITS.agency,
      plan: "agency",
      polarSubscriptionId: null,
    }).isLow).toBe(true);
  });

  it("does not flag a free user at 19 credits", () => {
    const free = getCreditStatus({
      creditsRemaining: 19,
      creditCap: PLAN_CREDITS.free,
      plan: "free",
      polarSubscriptionId: null,
    });
    expect(free.isLow).toBe(false);

    const low = getCreditStatus({
      creditsRemaining: 4,
      creditCap: PLAN_CREDITS.free,
      plan: "free",
      polarSubscriptionId: null,
    });
    expect(low.isLow).toBe(true);
  });

  it("uses remaining plus ledger debits instead of the agency allowance", () => {
    expect(PLAN_CREDITS.agency).toBe(25_000);
    expect(creditDenominator({
      granted: true,
      creditsRemaining: 495,
      planAllowance: PLAN_CREDITS.agency,
      debitTotal: 5,
    })).toBe(500);
  });

  it("keeps the 80 percent rule for paid plans", () => {
    expect(getCreditStatus({
      creditsRemaining: 21,
      creditCap: 100,
      plan: "starter",
      polarSubscriptionId: "sub_123",
    }).isLow).toBe(false);

    expect(getCreditStatus({
      creditsRemaining: 20,
      creditCap: 100,
      plan: "starter",
      polarSubscriptionId: "sub_123",
    }).isLow).toBe(true);

    expect(getCreditStatus({
      creditsRemaining: 5000,
      creditCap: PLAN_CREDITS.agency,
      plan: "agency",
      polarSubscriptionId: "sub_agency",
    }).isLow).toBe(true);
  });
});
