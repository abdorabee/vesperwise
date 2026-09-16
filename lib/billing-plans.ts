import type { DbUser } from "@/lib/types";
import {
  BULK_INLINE_MAX_ROWS,
  PLAN_AUTOPILOT_LIMIT,
  PLAN_CREDITS,
  PLAN_WATCHLIST_LIMIT,
} from "@/lib/types";

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

/**
 * Autopilot workflow allowance, derived from the limit the API actually
 * enforces (`PLAN_AUTOPILOT_LIMIT`) rather than a hand-typed number.
 *
 * Autopilot is not yet available to users, so every label is suffixed to say
 * so. Remove the suffix when the `/autopilot` route ships.
 */
function autopilotLabel(limit: number | null): string {
  const allowance = limit == null ? "Unlimited workflows" : `Autopilot · ${limit} workflows`;
  return `${allowance} (coming soon)`;
}

/** Inline CSV bulk scoring, capped identically on every plan today. */
const BULK_LABEL = `Bulk CSV scoring · ${BULK_INLINE_MAX_ROWS} per run`;

/** Capabilities every plan gets. Listed so tiers differ only where code differs. */
const CORE_FEATURES = [
  "Company intent scoring with dated evidence",
  "Chat copilot & outreach drafts",
  "Lists, smart lists & pipeline",
  "CSV export",
] as const;

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
      "Company intent scoring",
      watchlistLabel(PLAN_WATCHLIST_LIMIT.free),
      "Chat copilot & outreach drafts",
      "CSV export",
    ],
    features: [
      ...CORE_FEATURES,
      watchlistLabel(PLAN_WATCHLIST_LIMIT.free),
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
      BULK_LABEL,
      watchlistLabel(PLAN_WATCHLIST_LIMIT.starter),
      "Person scoring (beta)",
      "CSV export",
    ],
    features: [
      ...CORE_FEATURES,
      BULK_LABEL,
      watchlistLabel(PLAN_WATCHLIST_LIMIT.starter),
      "Person scoring (beta)",
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
      BULK_LABEL,
      watchlistLabel(PLAN_WATCHLIST_LIMIT.growth),
      "Person scoring (beta)",
      autopilotLabel(PLAN_AUTOPILOT_LIMIT.growth),
    ],
    features: [
      ...CORE_FEATURES,
      BULK_LABEL,
      watchlistLabel(PLAN_WATCHLIST_LIMIT.growth),
      "Person scoring (beta)",
      autopilotLabel(PLAN_AUTOPILOT_LIMIT.growth),
      "Email support",
    ],
  },
  {
    key: "pro",
    label: "Pro",
    price: 199,
    credits: PLAN_CREDITS.pro,
    color: "var(--accent)",
    tier: 3,
    heroFeatures: [
      `${PLAN_CREDITS.pro.toLocaleString()} credits / mo`,
      BULK_LABEL,
      watchlistLabel(PLAN_WATCHLIST_LIMIT.pro),
      "Custom scoring weights",
      autopilotLabel(PLAN_AUTOPILOT_LIMIT.pro),
    ],
    features: [
      ...CORE_FEATURES,
      BULK_LABEL,
      watchlistLabel(PLAN_WATCHLIST_LIMIT.pro),
      "Person scoring (beta)",
      "Custom scoring weights",
      autopilotLabel(PLAN_AUTOPILOT_LIMIT.pro),
      "Email support",
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
      BULK_LABEL,
      watchlistLabel(PLAN_WATCHLIST_LIMIT.agency),
      "Custom scoring weights",
      autopilotLabel(PLAN_AUTOPILOT_LIMIT.agency),
    ],
    features: [
      ...CORE_FEATURES,
      BULK_LABEL,
      watchlistLabel(PLAN_WATCHLIST_LIMIT.agency),
      "Person scoring (beta)",
      "Custom scoring weights",
      autopilotLabel(PLAN_AUTOPILOT_LIMIT.agency),
      "Priority email support",
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
