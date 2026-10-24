import type { DbUser } from "@/lib/types";

/** Warn once this share of the plan allowance has been used. */
export const LOW_CREDIT_USED_PCT = 80;

/** @deprecated Remaining-balance form of the same threshold. Prefer LOW_CREDIT_USED_PCT. */
export const LOW_CREDIT_PCT = 100 - LOW_CREDIT_USED_PCT;

export interface CreditStatusInput {
  creditsRemaining: number;
  creditCap: number;
  plan: DbUser["plan"];
}

export interface CreditStatus {
  pct: number;
  isLow: boolean;
  cta: "Upgrade" | "Top up";
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
}: CreditStatusInput): CreditStatus {
  const pct = creditPercent(creditsRemaining, creditCap);
  const usedPct = allowanceUsedPercent(creditsRemaining, creditCap);

  return {
    pct,
    isLow: usedPct >= LOW_CREDIT_USED_PCT,
    cta: plan === "free" ? "Upgrade" : "Top up",
    planLabel: plan.charAt(0).toUpperCase() + plan.slice(1),
    summary: `${creditsRemaining.toLocaleString()} of ${creditCap.toLocaleString()} credits remaining`,
  };
}
