import { describe, expect, it } from "vitest";
import {
  computeBillingPatch,
  grantCredits,
  type StoredBilling,
  type SubscriptionSnapshot,
} from "./subscription-sync";

const PERIOD_1 = "2026-10-01T00:00:00Z";
const PERIOD_2 = "2026-11-01T00:00:00Z";

function sub(overrides: Partial<SubscriptionSnapshot> = {}): SubscriptionSnapshot {
  return {
    id: "sub_1",
    customer_id: "cus_1",
    product_id: "prod_growth",
    current_period_start: PERIOD_1,
    current_period_end: PERIOD_2,
    cancel_at_period_end: false,
    status: "active",
    ...overrides,
  };
}

const growthUser: StoredBilling = {
  plan: "growth",
  topup_credits: 1000,
  subscription_period_start: PERIOD_1,
};

describe("computeBillingPatch", () => {
  it("keeps plan and credits when a cancellation is scheduled", () => {
    const patch = computeBillingPatch(
      "subscription.canceled",
      sub({ cancel_at_period_end: true }),
      "growth",
      growthUser
    );

    expect(patch).toEqual({ subscription_renews_at: PERIOD_2, subscription_cancel_at_period_end: true });
  });

  it("downgrades to free on revoke while keeping purchased top-ups", () => {
    const patch = computeBillingPatch("subscription.revoked", sub({ status: "canceled" }), "growth", growthUser);

    expect(patch.plan).toBe("free");
    expect(patch.credits_remaining).toBe(20 + 1000);
    expect(patch.polar_subscription_id).toBeNull();
  });

  it("grants plan credits plus top-ups on a new subscription", () => {
    const freeUser: StoredBilling = { plan: "free", topup_credits: 100, subscription_period_start: null };
    const patch = computeBillingPatch("subscription.created", sub(), "growth", freeUser);

    expect(patch.plan).toBe("growth");
    expect(patch.credits_remaining).toBe(2500 + 100);
    expect(patch.subscription_period_start).toBe(PERIOD_1);
  });

  it("resets to plan credits plus top-ups on renewal", () => {
    const patch = computeBillingPatch(
      "subscription.cycled",
      sub({ current_period_start: PERIOD_2, current_period_end: "2026-12-01T00:00:00Z" }),
      "growth",
      growthUser
    );

    expect(patch.credits_remaining).toBe(2500 + 1000);
    expect(patch.subscription_period_start).toBe(PERIOD_2);
  });

  it("does not grant twice when updated and cycled both report the same renewal", () => {
    const renewed = sub({ current_period_start: PERIOD_2 });
    const afterFirstGrant: StoredBilling = { ...growthUser, subscription_period_start: PERIOD_2 };

    const patch = computeBillingPatch("subscription.updated", renewed, "growth", afterFirstGrant);

    expect(patch).not.toHaveProperty("credits_remaining");
  });

  it("does not refill credits on an update within the same period and plan", () => {
    const patch = computeBillingPatch("subscription.updated", sub(), "growth", growthUser);

    expect(patch).not.toHaveProperty("credits_remaining");
    expect(patch).not.toHaveProperty("plan");
    expect(patch.subscription_cancel_at_period_end).toBe(false);
  });

  it("grants the new plan's full allocation plus top-ups on a plan change", () => {
    const patch = computeBillingPatch("subscription.updated", sub({ product_id: "prod_pro" }), "pro", growthUser);

    expect(patch.plan).toBe("pro");
    expect(patch.credits_remaining).toBe(8000 + 1000);
  });

  it("clears the cancel flag on uncancel without touching credits", () => {
    const patch = computeBillingPatch("subscription.uncanceled", sub(), "growth", growthUser);

    expect(patch.subscription_cancel_at_period_end).toBe(false);
    expect(patch).not.toHaveProperty("credits_remaining");
  });

  it("ignores late updates for an ended subscription", () => {
    const patch = computeBillingPatch("subscription.updated", sub({ status: "canceled" }), "growth", growthUser);

    expect(patch).toEqual({});
  });

  it("only syncs status when the plan cannot be resolved", () => {
    const patch = computeBillingPatch("subscription.created", sub(), null, growthUser);

    expect(patch).not.toHaveProperty("plan");
    expect(patch).not.toHaveProperty("credits_remaining");
  });
});

describe("grantCredits", () => {
  it("never subtracts for a negative top-up value", () => {
    expect(grantCredits("starter", -5)).toBe(500);
  });
});
