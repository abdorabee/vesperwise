import {
  PLAN_LABEL,
  PLAN_ORDER,
  PLAN_PRICE,
  TOPUP_PACKS,
  planFeatures,
  planFeaturesWithCredits,
  type PlanKey,
} from "@/lib/plan-features";
import { PLAN_CREDITS } from "@/lib/types";

export type { PlanKey };

export interface BillingPlanDef {
  key: PlanKey;
  label: string;
  price: number;
  credits: number;
  color: string;
  features: string[];
  heroFeatures: string[];
  tier: number;
}

export interface TopupDef {
  amount: "100" | "500" | "1000";
  credits: number;
  price: number;
  bestValue?: boolean;
}

const PLAN_COLOR: Record<PlanKey, string> = {
  free: "var(--text-quaternary)",
  starter: "var(--cyan)",
  growth: "var(--accent-2)",
  pro: "var(--brand)",
  agency: "var(--warm)",
};

/**
 * Plan definitions for the in-app billing page. Labels, prices and features
 * come from lib/plan-features.ts so billing, /pricing and the landing page
 * always describe the same plans.
 */
export const BILLING_PLANS: BillingPlanDef[] = PLAN_ORDER.map((key, tier) => ({
  key,
  label: PLAN_LABEL[key],
  price: PLAN_PRICE[key],
  credits: PLAN_CREDITS[key],
  color: PLAN_COLOR[key],
  tier,
  features: planFeatures(key),
  heroFeatures: planFeaturesWithCredits(key),
}));

export const BILLING_TOPUPS: TopupDef[] = TOPUP_PACKS.map((t) => ({ ...t }));

export function getPlanDef(key: PlanKey): BillingPlanDef {
  return BILLING_PLANS.find((p) => p.key === key) ?? BILLING_PLANS[0];
}

export function perCreditPrice(price: number, credits: number): string {
  if (credits <= 0 || price <= 0) return "—";
  return `$${(price / credits).toFixed(3).replace(/0+$/, "").replace(/\.$/, "")} ea.`;
}

/** Plan card unit line — free uses score count, paid uses per-credit */
export function planCreditsUnit(plan: BillingPlanDef): string {
  if (plan.price <= 0) return `≈ ${plan.credits} scores`;
  return perCreditPrice(plan.price, plan.credits);
}

/** Top-up panel "YOUR RATE" — plan effective rate or base top-up rate for free */
export function planYourTopupRate(planKey: PlanKey): string {
  const def = getPlanDef(planKey);
  if (def.price > 0 && def.credits > 0) {
    return `$${(def.price / def.credits).toFixed(2)}`;
  }
  const base = BILLING_TOPUPS[0];
  return `$${(base.price / base.credits).toFixed(2)}`;
}

/** Top-up card unit rate — matches IntentIQ Billing.html (`$0.072 / credit`) */
export function topupUnitRate(price: number, credits: number): string {
  if (credits <= 0) return "—";
  return `$${(price / credits).toFixed(3)} / credit`;
}

export function planRank(key: PlanKey): number {
  return getPlanDef(key).tier;
}

export function comparePlans(a: PlanKey, b: PlanKey): number {
  return planRank(a) - planRank(b);
}
