import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const validateEvent = vi.fn();
const rpc = vi.fn();
const userUpdate = vi.fn();
const idempotencyInsert = vi.fn();
const idempotencyDelete = vi.fn();
let storedUser: Record<string, unknown> | null = null;

vi.mock("@polar-sh/sdk/2026-04", () => {
  class PolarWebhookVerificationError extends Error {}
  return { webhooks: { validateEvent, PolarWebhookVerificationError } };
});

vi.mock("@/lib/supabase", () => ({
  createSupabaseAdmin: () => ({
    rpc: (...args: unknown[]) => rpc(...args),
    from: (table: string) => {
      if (table === "processed_webhook_events") {
        return {
          insert: (row: unknown) => idempotencyInsert(row),
          delete: () => ({ eq: (_column: string, id: string) => idempotencyDelete(id) }),
        };
      }
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: storedUser, error: null }) }),
        }),
        update: (values: Record<string, unknown>) => ({
          eq: (_column: string, id: string) => userUpdate(table, values, id),
        }),
        insert: async () => ({ error: null }),
      };
    },
  }),
}));

const { POST } = await import("./route");

function webhookRequest(): NextRequest {
  return new NextRequest("http://localhost/api/billing/webhook", {
    method: "POST",
    body: "{}",
    headers: { "webhook-id": "evt_1" },
  });
}

function subscriptionEvent(type: string, overrides: Record<string, unknown> = {}) {
  return {
    type,
    data: {
      id: "sub_1",
      customer_id: "cus_1",
      product_id: "prod_unknown",
      current_period_start: "2026-10-01T00:00:00Z",
      current_period_end: "2026-11-01T00:00:00Z",
      cancel_at_period_end: false,
      status: "active",
      metadata: { user_id: "user_1", plan: "growth" },
      ...overrides,
    },
  };
}

beforeEach(() => {
  vi.stubEnv("POLAR_WEBHOOK_SECRET", "whsec_test");
  validateEvent.mockReset();
  rpc.mockReset().mockResolvedValue({ error: null });
  userUpdate.mockReset().mockResolvedValue({ error: null });
  idempotencyInsert.mockReset().mockResolvedValue({ error: null });
  idempotencyDelete.mockReset().mockResolvedValue({ error: null });
  storedUser = { plan: "growth", topup_credits: 1000, subscription_period_start: "2026-10-01T00:00:00Z" };
});

describe("POST /api/billing/webhook", () => {
  it("does not downgrade when a cancellation is scheduled", async () => {
    validateEvent.mockResolvedValue(subscriptionEvent("subscription.canceled", { cancel_at_period_end: true }));

    const res = await POST(webhookRequest());

    expect(res.status).toBe(200);
    expect(userUpdate).toHaveBeenCalledWith(
      "users",
      { subscription_renews_at: "2026-11-01T00:00:00Z", subscription_cancel_at_period_end: true },
      "user_1"
    );
  });

  it("downgrades on revoke and keeps top-up credits", async () => {
    validateEvent.mockResolvedValue(subscriptionEvent("subscription.revoked", { status: "canceled" }));

    await POST(webhookRequest());

    expect(userUpdate).toHaveBeenCalledWith(
      "users",
      expect.objectContaining({ plan: "free", credits_remaining: 1020 }),
      "user_1"
    );
  });

  it("credits top-up purchases through the top-up RPC", async () => {
    validateEvent.mockResolvedValue({
      type: "order.paid",
      data: { customer_id: "cus_1", metadata: { type: "topup", user_id: "user_1", credits: "500" } },
    });

    await POST(webhookRequest());

    expect(rpc).toHaveBeenCalledWith("increment_topup_credits", { p_user_id: "user_1", p_amount: 500 });
  });

  it("does not refill credits on an update within the same period", async () => {
    validateEvent.mockResolvedValue(subscriptionEvent("subscription.updated"));

    await POST(webhookRequest());

    const [, values] = userUpdate.mock.calls[0];
    expect(values).not.toHaveProperty("credits_remaining");
  });

  it("releases the idempotency claim when processing fails so Polar can retry", async () => {
    validateEvent.mockResolvedValue(subscriptionEvent("subscription.cycled", {
      current_period_start: "2026-11-01T00:00:00Z",
    }));
    userUpdate.mockResolvedValue({ error: { message: "db down" } });

    const res = await POST(webhookRequest());

    expect(res.status).toBe(500);
    expect(idempotencyDelete).toHaveBeenCalledWith("evt_1");
  });
});
