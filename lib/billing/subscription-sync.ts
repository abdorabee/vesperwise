import { PLAN_CREDITS, type DbUser } from "@/lib/types";

export type Plan = DbUser["plan"];

export type SubscriptionEventType =
  | "subscription.created"
  | "subscription.updated"
  | "subscription.cycled"
  | "subscription.canceled"
  | "subscription.uncanceled"
  | "subscription.revoked";

/** The subset of a Polar subscription payload the billing sync reads. */
export interface SubscriptionSnapshot {
  id: string;
  customer_id: string;
  product_id: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  status: string;
}

/** The billing columns of the stored users row. */
export interface StoredBilling {
  plan: Plan;
  topup_credits: number;
  subscription_period_start: string | null;
}

export type BillingPatch = Partial<{
  plan: Plan;
  credits_remaining: number;
  polar_customer_id: string;
  polar_subscription_id: string | null;
  subscription_renews_at: string | null;
  subscription_cancel_at_period_end: boolean;
  subscription_period_start: string | null;
}>;

export function isPlan(value: string | undefined): value is Plan {
  return value !== undefined && value in PLAN_CREDITS;
}

/** Plan credits plus any purchased top-ups, which survive renewals and plan changes. */
export function grantCredits(plan: Plan, topupCredits: number): number {
  return PLAN_CREDITS[plan] + Math.max(0, topupCredits);
}

function isLaterPeriod(next: string | null, previous: string | null): boolean {
  if (!next) return false;
  if (!previous) return true;
  return new Date(next).getTime() > new Date(previous).getTime();
}

function statusFields(sub: SubscriptionSnapshot): BillingPatch {
  return {
    polar_customer_id: sub.customer_id,
    polar_subscription_id: sub.id,
    subscription_renews_at: sub.current_period_end,
    subscription_cancel_at_period_end: sub.cancel_at_period_end,
  };
}

function grantFields(plan: Plan, sub: SubscriptionSnapshot, stored: StoredBilling): BillingPatch {
  return {
    ...statusFields(sub),
    plan,
    credits_remaining: grantCredits(plan, stored.topup_credits),
    subscription_period_start: sub.current_period_start,
  };
}

/**
 * Decide how a Polar subscription event changes the users row.
 *
 * Polar sends `subscription.canceled` as soon as a cancellation is scheduled
 * (access continues to period end) and `subscription.revoked` when access ends,
 * so only `revoked` downgrades. Credits are reset only on a new subscription, a
 * real plan change or a new billing period; every other update syncs status.
 */
export function computeBillingPatch(
  type: SubscriptionEventType,
  sub: SubscriptionSnapshot,
  plan: Plan | null,
  stored: StoredBilling
): BillingPatch {
  switch (type) {
    case "subscription.revoked":
      return {
        plan: "free",
        credits_remaining: grantCredits("free", stored.topup_credits),
        polar_subscription_id: null,
        subscription_renews_at: null,
        subscription_cancel_at_period_end: false,
        subscription_period_start: null,
      };

    case "subscription.canceled":
      return {
        subscription_renews_at: sub.current_period_end,
        subscription_cancel_at_period_end: true,
      };

    case "subscription.created":
      return plan ? grantFields(plan, sub, stored) : statusFields(sub);

    case "subscription.updated":
    case "subscription.cycled":
    case "subscription.uncanceled": {
      // An ended subscription is handled by subscription.revoked; ignore late updates.
      if (sub.status === "canceled") return {};
      if (!plan) return statusFields(sub);
      const isPlanChange = plan !== stored.plan;
      const isRenewal = isLaterPeriod(sub.current_period_start, stored.subscription_period_start);
      return isPlanChange || isRenewal ? grantFields(plan, sub, stored) : statusFields(sub);
    }
  }
}
