import { describe, expect, it } from "vitest";
import { PLAN_CREDITS } from "@/lib/types";
import {
  LOW_CREDIT_PCT,
  LOW_CREDIT_USED_PCT,
  allowanceUsedPercent,
  creditDenominator,
  creditPercent,
  getCreditStatus,
  sumLedgerDebits,
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
      cta: "Upgrade to Plus",
    });
    expect(getCreditStatus({ creditsRemaining: 21, creditCap: 100, plan: "starter" })).toMatchObject({
      pct: 21,
      isLow: false,
      cta: "Upgrade to Plus",
    });
  });

  it("names the next plan for paid upgrades and keeps Top up for Pro", () => {
    expect(getCreditStatus({ creditsRemaining: 3, creditCap: 20, plan: "free" })).toMatchObject({
      isLow: true,
      cta: "Upgrade",
      planLabel: "Free",
      summary: "3 of 20 credits remaining",
    });
    expect(getCreditStatus({ creditsRemaining: 20, creditCap: PLAN_CREDITS.starter, plan: "starter" })).toMatchObject({
      isLow: true,
      cta: "Upgrade to Plus",
    });
    expect(getCreditStatus({ creditsRemaining: 80, creditCap: PLAN_CREDITS.plus, plan: "plus" })).toMatchObject({
      isLow: true,
      cta: "Upgrade to Growth",
    });
    expect(getCreditStatus({ creditsRemaining: 42, creditCap: PLAN_CREDITS.growth, plan: "growth" })).toMatchObject({
      isLow: true,
      cta: "Upgrade to Pro",
      planLabel: "Growth",
      summary: "42 of 1,200 credits remaining",
    });
    expect(getCreditStatus({ creditsRemaining: 100, creditCap: PLAN_CREDITS.pro, plan: "pro" })).toMatchObject({
      isLow: true,
      cta: "Top up",
    });
  });

  it("keeps the sold plan allowance when the workspace was not granted", () => {
    expect(creditDenominator({
      granted: false,
      creditsRemaining: 495,
      planAllowance: PLAN_CREDITS.agency,
      debitTotal: 5,
    })).toBe(PLAN_CREDITS.agency);
  });

  it("counts credits used from ledger debits, not score runs or top-ups", () => {
    expect(sumLedgerDebits([
      { type: "debit", amount: 1 },
      { type: "debit", amount: 1 },
      { type: "credit", amount: 25 },
      { type: "debit", amount: 3 },
    ])).toBe(5);
  });
});
