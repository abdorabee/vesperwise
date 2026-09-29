import type { DbUser } from "@/lib/types";
import { PLAN_CREDITS, PLAN_RATE_LIMIT, PLAN_WATCHLIST_LIMIT } from "@/lib/types";

export type PlanKey = DbUser["plan"];

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

function watchlistLabel(limit: number | null): string {
  if (limit == null) return "Unlimited watchlist";
  return `Watchlist · ${limit} accounts`;
}

export const BILLING_PLANS: BillingPlanDef[] = [
  {
    key: "free",
    label: "Free",
    price: 0,
    credits: PLAN_CREDITS.free,
    color: "var(--text-quaternary)",
    tier: 0,
    heroFeatures: [
      `${PLAN_CREDITS.free} credits / mo`,
      "1 seat",
      "Score & basic dashboard",
      "Manual lookups only",
      "7-day history",
      "API · 10 rpm",
    ],
    features: [
      "1 seat",
      "Score & basic dashboard",
      "Manual lookups only",
      "7-day history",
    ],
  },
  {
    key: "starter",
    label: "Starter",
    price: 29,
    credits: PLAN_CREDITS.starter,
    color: "var(--cyan)",
    tier: 1,
    heroFeatures: [
      `${PLAN_CREDITS.starter.toLocaleString()} credits / mo`,
      "3 seats",
      "Bulk scoring · 100/job",
      watchlistLabel(PLAN_WATCHLIST_LIMIT.starter),
      "30-day history",
      "Slack & webhook alerts",
    ],
    features: [
      "3 seats",
      "Bulk scoring · 100/job",
      watchlistLabel(PLAN_WATCHLIST_LIMIT.starter),
      "30-day history",
      "Slack & webhook alerts",
    ],
  },
  {
    key: "growth",
    label: "Growth",
    price: 79,
    credits: PLAN_CREDITS.growth,
    color: "var(--accent-2)",
    tier: 2,
    heroFeatures: [
      `${PLAN_CREDITS.growth.toLocaleString()} credits / mo`,
      "Up to 10 seats",
      "Bulk & person scoring",
      "Autopilot · 25 flows",
      watchlistLabel(PLAN_WATCHLIST_LIMIT.growth),
      `API access · ${PLAN_RATE_LIMIT.growth} rpm`,
    ],
    features: [
      "10 seats",
      "Bulk · 1,000/job · 3 concurrent",
      watchlistLabel(PLAN_WATCHLIST_LIMIT.growth),
      "Autopilot · 25 workflows",
      `API · ${PLAN_RATE_LIMIT.growth} rpm`,
      "Priority email support",
    ],
  },
  {
    key: "pro",
    label: "Pro",
    price: 199,
    credits: PLAN_CREDITS.pro,
    color: "var(--brand)",
    tier: 3,
    heroFeatures: [
      `${PLAN_CREDITS.pro.toLocaleString()} credits / mo`,
      "25 seats",
      "Bulk · 5,000/job · 8 concurrent",
      "Autopilot · unlimited flows",
      watchlistLabel(PLAN_WATCHLIST_LIMIT.pro),
      `API · ${PLAN_RATE_LIMIT.pro} rpm`,
    ],
    features: [
      "25 seats",
      "Bulk · 5,000/job · 8 concurrent",
      watchlistLabel(PLAN_WATCHLIST_LIMIT.pro),
      "Autopilot · unlimited flows",
      `API · ${PLAN_RATE_LIMIT.pro} rpm`,
      "SSO & SCIM",
      "Custom scoring weights",
    ],
  },
  {
    key: "agency",
    label: "Agency",
    price: 499,
    credits: PLAN_CREDITS.agency,
    color: "var(--warm)",
    tier: 4,
    heroFeatures: [
      `${PLAN_CREDITS.agency.toLocaleString()} credits / mo`,
      "Unlimited seats",
      "Multi-workspace",
      "Bulk · 20k/job · unlimited",
      "White-label exports",
      `API · ${PLAN_RATE_LIMIT.agency} rpm`,
    ],
    features: [
      "Unlimited seats",
      "Multi-workspace",
      "Bulk · 20k/job · unlimited",
      "White-label exports",
      `API · ${PLAN_RATE_LIMIT.agency} rpm`,
      "Dedicated CSM",
      "99.9% SLA",
    ],
  },
];

export const BILLING_TOPUPS: TopupDef[] = [
  { amount: "100", credits: 100, price: 10 },
  { amount: "500", credits: 500, price: 36, bestValue: true },
  { amount: "1000", credits: 1000, price: 65 },
];

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
