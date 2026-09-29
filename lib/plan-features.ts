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

export const PLAN_ORDER: PlanKey[] = ["free", "starter", "growth", "pro", "agency"];

export const PLAN_LABEL: Record<PlanKey, string> = {
  free: "Free",
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
  agency: "Agency",
};

/** USD per month. Must match the Polar products (POLAR_PRODUCT_*). */
export const PLAN_PRICE: Record<PlanKey, number> = {
  free: 0,
  starter: 29,
  growth: 79,
  pro: 199,
  agency: 499,
};

/** One-time credit packs (POLAR_PRODUCT_TOPUP_*). */
export const TOPUP_PACKS: { amount: "100" | "500" | "1000"; credits: number; price: number; bestValue?: boolean }[] = [
  { amount: "100", credits: 100, price: 10 },
  { amount: "500", credits: 500, price: 36, bestValue: true },
  { amount: "1000", credits: 1000, price: 65 },
];

/** Maximum companies per bulk job and concurrent jobs (enforced in app/api/v1/score/bulk). */
export const BULK_MAX_PER_JOB = 1000;
export const BULK_MAX_CONCURRENT = 3;

export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

function watchlistFeature(limit: number | null): string {
  return limit == null ? "Unlimited watchlist" : `Watchlist of ${formatCount(limit)} accounts`;
}

function autopilotFeature(limit: number | null): string {
  if (limit == null) return "Unlimited Autopilot workflows";
  return limit === 1 ? "1 Autopilot workflow" : `${formatCount(limit)} Autopilot workflows`;
}

/** "N account scores / month" */
export function planCreditsFeature(key: PlanKey): string {
  return `${formatCount(PLAN_CREDITS[key])} account scores / month`;
}

/** Features for a plan, excluding the credits line (show that separately). */
export function planFeatures(key: PlanKey): string[] {
  const list = [
    watchlistFeature(PLAN_WATCHLIST_LIMIT[key]),
    autopilotFeature(PLAN_AUTOPILOT_LIMIT[key]),
    `REST API · ${formatCount(PLAN_RATE_LIMIT[key])} requests/min`,
  ];
  if (key === "free") return [...list, "Evidence and next step on every score"];
  return [...list, "Slack and webhook alerts", "CSV upload and export"];
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
  growth: "For a sales team scoring its pipeline every week.",
  pro: "For RevOps teams scoring large books of accounts.",
  agency: "For agencies running scoring for several clients.",
};

function perScore(price: number, credits: number): string | null {
  if (price <= 0 || credits <= 0) return null;
  return `$${(price / credits).toFixed(3)} per score`;
}

export const MARKETING_PLANS: MarketingPlan[] = PLAN_ORDER.map((key) => ({
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

/** Lowest paid price, used in copy like "from $29/mo". */
export const STARTING_PRICE = Math.min(...PLAN_ORDER.map((k) => PLAN_PRICE[k]).filter((p) => p > 0));
