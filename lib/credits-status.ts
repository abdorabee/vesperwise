import { isGrantedPlan } from "@/lib/billing-plans";
import { lowCreditCta } from "@/lib/plan-features";
import type { DbUser } from "@/lib/types";

/** Warn once this share of the plan allowance has been used. */
export const LOW_CREDIT_USED_PCT = 80;

/** Absolute threshold for granted plans (they shouldn't see low credits at high balances). */
export const GRANTED_LOW_CREDIT_THRESHOLD = 100;

/** @deprecated Remaining-balance form of the same threshold. Prefer LOW_CREDIT_USED_PCT. */
export const LOW_CREDIT_PCT = 100 - LOW_CREDIT_USED_PCT;

export interface CreditStatusInput {
  creditsRemaining: number;
  creditCap: number;
  plan: DbUser["plan"];
  polarSubscriptionId?: string | null;
}

export interface CreditStatus {
  pct: number;
  isLow: boolean;
  cta: string;
  planLabel: string;
  summary: string;
}

/** Share of the plan allowance left, 0-100. Top-ups can push credits above the cap. */
export function creditPercent(creditsRemaining: number, creditCap: number): number {
  if (creditCap <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((creditsRemaining / creditCap) * 100)));
}

/** Share of the plan allowance already used, from the remaining balance. Top-ups above the allowance count as 0% used. */
export function allowanceUsedPercent(creditsRemaining: number, allowance: number): number {
  if (allowance <= 0) return 0;
  const used = Math.max(0, allowance - creditsRemaining);
  return Math.min(100, Math.round((used / allowance) * 100));
}

export function getCreditStatus({
  creditsRemaining,
  creditCap,
  plan,
  polarSubscriptionId,
}: CreditStatusInput): CreditStatus {
  const pct = creditPercent(creditsRemaining, creditCap);
  const usedPct = allowanceUsedPercent(creditsRemaining, creditCap);

  const granted = isGrantedPlan(plan, polarSubscriptionId);
  const isLow = granted
    ? creditsRemaining < GRANTED_LOW_CREDIT_THRESHOLD
    : usedPct >= LOW_CREDIT_USED_PCT;

  return {
    pct,
    isLow,
    cta: lowCreditCta(plan),
    planLabel: plan.charAt(0).toUpperCase() + plan.slice(1),
    summary: `${creditsRemaining.toLocaleString()} of ${creditCap.toLocaleString()} credits remaining`,
  };
}
