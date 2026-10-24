/**
 * Single source of truth for what each plan includes and costs.
 *
 * Used by the landing pricing teaser, /pricing and the in-app billing page
 * (via lib/billing-plans.ts). Every limit is derived from the plan constants
 * the product enforces in lib/types.ts. Only list features that exist in the
 * product today; if a feature isn't enforced or shipped, it doesn't go here.
 */
import {
  PLAN_AUTOPILOT_LIMIT,
  PLAN_CREDITS,
  PLAN_RATE_LIMIT,
  PLAN_WATCHLIST_LIMIT,
  type DbUser,
} from "@/lib/types";

export type PlanKey = DbUser["plan"];

/** Entitlement order. Agency stays last so granted accounts keep their rank. */
export const PLAN_ORDER: PlanKey[] = ["free", "starter", "plus", "growth", "pro", "agency"];

/** Plans shown with a price. Agency is contact-only and is not sold. */
export const PUBLIC_PLAN_ORDER: PlanKey[] = ["free", "starter", "plus", "growth", "pro"];

/** Self-serve checkout order. Free is signup; agency is not sold. */
export const CHECKOUT_PLAN_ORDER = ["starter", "plus", "growth", "pro"] as const;
export type CheckoutPlan = (typeof CHECKOUT_PLAN_ORDER)[number];

export const UPGRADE_PATH: PlanKey[] = ["starter", "plus", "growth", "pro"];

export const PLAN_LABEL: Record<PlanKey, string> = {
  free: "Free",
  starter: "Starter",
  plus: "Plus",
  growth: "Growth",
  pro: "Pro",
  agency: "Agency",
};

/** USD per month. Sold plans must match the Polar products (POLAR_PRODUCT_*). Agency is not sold. */
export const PLAN_PRICE: Record<PlanKey, number> = {
  free: 0,
  starter: 10,
  plus: 29,
  growth: 79,
  pro: 199,
  agency: 0,
};

export const CHECKOUT_PRODUCT_ENV: Record<CheckoutPlan, string> = {
  starter: "POLAR_PRODUCT_STARTER",
  plus: "POLAR_PRODUCT_PLUS",
  growth: "POLAR_PRODUCT_GROWTH",
  pro: "POLAR_PRODUCT_PRO",
};

/** One-time credit packs. Product ids are read from env at checkout, never hard-coded. */
export const TOPUP_PACKS: {
  amount: "25" | "70" | "140";
  credits: number;
  price: number;
  envKey: "POLAR_PRODUCT_TOPUP_25" | "POLAR_PRODUCT_TOPUP_70" | "POLAR_PRODUCT_TOPUP_140";
  bestValue?: boolean;
}[] = [
  { amount: "25", credits: 25, price: 3, envKey: "POLAR_PRODUCT_TOPUP_25" },
  { amount: "70", credits: 70, price: 8, envKey: "POLAR_PRODUCT_TOPUP_70" },
  { amount: "140", credits: 140, price: 15, envKey: "POLAR_PRODUCT_TOPUP_140", bestValue: true },
];

/** Maximum companies per bulk job and concurrent jobs (enforced in app/api/v1/score/bulk). */
export const BULK_MAX_PER_JOB = 1000;
export const BULK_MAX_CONCURRENT = 3;

export type GatedFeature = "bulk" | "csv" | "autopilot" | "treg";

const FEATURE_LABEL: Record<GatedFeature, string> = {
  bulk: "Bulk scoring",
  csv: "CSV upload and export",
  autopilot: "Autopilot",
  treg: "Extended signal sources",
};

export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function isPlanKey(value: unknown): value is PlanKey {
  return typeof value === "string" && value in PLAN_CREDITS;
}

export function parsePlan(value: unknown): PlanKey {
  return isPlanKey(value) ? value : "free";
}

/** First sold plan on the upgrade path that includes the feature. */
export function requiredPlanFor(feature: GatedFeature): PlanKey {
  return UPGRADE_PATH.find((plan) => canUseFeature(plan, feature)) ?? "pro";
}

export function canUseFeature(plan: PlanKey, feature: GatedFeature): boolean {
  if (feature === "treg") return plan === "growth" || plan === "pro" || plan === "agency";
  if (feature === "autopilot") {
    const limit = PLAN_AUTOPILOT_LIMIT[plan];
    return limit === null || limit > 0;
  }
  return plan === "plus" || plan === "growth" || plan === "pro" || plan === "agency";
}

export function featureDeniedMessage(plan: PlanKey, feature: GatedFeature): string {
  const needed = requiredPlanFor(feature);
  return `${FEATURE_LABEL[feature]} is not included on the ${PLAN_LABEL[plan]} plan. Upgrade to ${PLAN_LABEL[needed]}.`;
}

/** Low-credit prompt. Paid plans name the next rung; Pro and Agency top up. */
export function lowCreditCta(plan: PlanKey): string {
  if (plan === "starter") return "Upgrade to Plus";
  if (plan === "plus") return "Upgrade to Growth";
  if (plan === "growth") return "Upgrade to Pro";
  if (plan === "free") return "Upgrade";
  return "Top up";
}

function watchlistFeature(limit: number | null): string {
  return limit == null ? "Unlimited watchlist" : `Watchlist of ${formatCount(limit)} accounts`;
}

/** "N account scores / month" */
export function planCreditsFeature(key: PlanKey): string {
  return `${formatCount(PLAN_CREDITS[key])} account scores / month`;
}

/** Features for a plan, excluding the credits line (show that separately). */
export function planFeatures(key: PlanKey): string[] {
  const list = [
    watchlistFeature(PLAN_WATCHLIST_LIMIT[key]),
    `REST API · ${formatCount(PLAN_RATE_LIMIT[key])} requests/min`,
    "Evidence and next step on every score",
    "1 seat",
  ];
  if (key === "free" || key === "starter") {
    return [...list, "No bulk, CSV or autopilot"];
  }
  return [...list, "Bulk scoring and CSV upload and export", "Autopilot coming soon"];
}

/** Credits line followed by the plan's features. */
export function planFeaturesWithCredits(key: PlanKey): string[] {
  return [planCreditsFeature(key), ...planFeatures(key)];
}

export interface MarketingPlan {
  key: PlanKey;
  label: string;
  price: number;
  credits: number;
  /** e.g. "$0.032 per score"; null for the free plan */
  perScore: string | null;
  blurb: string;
  /** Excludes the credits line */
  features: string[];
  featured: boolean;
  cta: string;
}

export interface MarketingTopup {
  credits: number;
  price: number;
  perCredit: string;
}

const BLURBS: Record<PlanKey, string> = {
  free: "Try it on your own target accounts.",
  starter: "For a single rep working a named-account list.",
  plus: "For a rep who scores lists and exports the results.",
  growth: "For a sales team scoring its pipeline every week.",
  pro: "For RevOps teams scoring large books of accounts.",
  agency: "For teams that need a granted workspace.",
};

function perScore(price: number, credits: number): string | null {
  if (price <= 0 || credits <= 0) return null;
  return `$${(price / credits).toFixed(3)} per score`;
}

export const MARKETING_PLANS: MarketingPlan[] = PUBLIC_PLAN_ORDER.map((key) => ({
  key,
  label: PLAN_LABEL[key],
  price: PLAN_PRICE[key],
  credits: PLAN_CREDITS[key],
  perScore: perScore(PLAN_PRICE[key], PLAN_CREDITS[key]),
  blurb: BLURBS[key],
  features: planFeatures(key),
  featured: key === "growth",
  cta: key === "free" ? "Start free" : `Choose ${PLAN_LABEL[key]}`,
}));

export const MARKETING_TOPUPS: MarketingTopup[] = TOPUP_PACKS.map((t) => ({
  credits: t.credits,
  price: t.price,
  perCredit: `$${(t.price / t.credits).toFixed(3)} per credit`,
}));

export function getMarketingPlan(key: PlanKey): MarketingPlan {
  return MARKETING_PLANS.find((p) => p.key === key) ?? MARKETING_PLANS[0];
}

/** Lowest paid price, used in copy like "from $10/mo". */
export const STARTING_PRICE = Math.min(
  ...PUBLIC_PLAN_ORDER.map((k) => PLAN_PRICE[k]).filter((p) => p > 0),
);
