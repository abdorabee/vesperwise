import type { DbUser } from "@/lib/types";

export const LOW_CREDIT_PCT = 20;

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

export function getCreditStatus({
  creditsRemaining,
  creditCap,
  plan,
}: CreditStatusInput): CreditStatus {
  const pct = creditPercent(creditsRemaining, creditCap);

  return {
    pct,
    isLow: pct < LOW_CREDIT_PCT,
    cta: plan === "free" ? "Upgrade" : "Top up",
    planLabel: plan.charAt(0).toUpperCase() + plan.slice(1),
    summary: `${creditsRemaining.toLocaleString()} of ${creditCap.toLocaleString()} credits remaining`,
  };
}
