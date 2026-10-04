import { NextRequest, NextResponse } from "next/server";
import { webhooks } from "@polar-sh/sdk/2026-04";
import { createSupabaseAdmin } from "@/lib/supabase";
import {
  computeBillingPatch,
  isPlan,
  type StoredBilling,
  type SubscriptionEventType,
  type SubscriptionSnapshot,
} from "@/lib/billing/subscription-sync";

// Reverse map: Polar product ID → plan name (for portal-initiated plan changes).
// Filter out empty-string keys that arise when env vars are unset.
const PRODUCT_TO_PLAN: Record<string, string | undefined> = Object.fromEntries(
  (
    [
      [process.env.POLAR_PRODUCT_STARTER, "starter"],
      [process.env.POLAR_PRODUCT_GROWTH,  "growth"],
      [process.env.POLAR_PRODUCT_PRO,     "pro"],
      [process.env.POLAR_PRODUCT_AGENCY,  "agency"],
    ] as [string | undefined, string][]
  ).filter(([k]) => k)
);

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Safely extract string-valued keys from unknown webhook metadata. */
function getMeta(raw: unknown): Record<string, string> {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).filter(([, v]) => typeof v === "string")
  ) as Record<string, string>;
}


type SupabaseAdmin = ReturnType<typeof createSupabaseAdmin>;

interface SubscriptionPayload extends SubscriptionSnapshot {
  metadata: unknown;
}

/** Apply a Polar subscription event to the users row. Returns a response only on failure. */
async function syncSubscription(
  admin: SupabaseAdmin,
  type: SubscriptionEventType,
  sub: SubscriptionPayload
): Promise<NextResponse | null> {
  const meta = getMeta(sub.metadata);
  const userId = meta.user_id;
  if (!userId) return null;

  const { data: stored, error: readError } = await admin
    .from("users")
    .select("plan, topup_credits, subscription_period_start")
    .eq("id", userId)
    .maybeSingle<StoredBilling>();
  if (readError) {
    console.error(`[billing/webhook] ${type} user read failed:`, readError);
    return NextResponse.json({ error: "User read failed" }, { status: 500 });
  }
  if (!stored) return null;

  const mappedPlan = PRODUCT_TO_PLAN[sub.product_id] ?? meta.plan;
  const plan = isPlan(mappedPlan) ? mappedPlan : null;
  const patch = computeBillingPatch(type, sub, plan, stored);
  if (Object.keys(patch).length === 0) return null;

  const { error } = await admin.from("users").update(patch).eq("id", userId);
  if (error) {
    console.error(`[billing/webhook] ${type} update failed:`, error);
    return NextResponse.json({ error: "User update failed" }, { status: 500 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (!process.env.POLAR_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const rawBody = await req.text();

  // ── Signature verification ───────────────────────────────────────────────────
  let event: PolarEvent;
  try {
    event = await webhooks.validateEvent(
      rawBody,
      Object.fromEntries(req.headers.entries()),
      process.env.POLAR_WEBHOOK_SECRET!
    );
  } catch (err) {
    if (err instanceof webhooks.PolarWebhookVerificationError) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
    throw err;
  }

  const admin = createSupabaseAdmin();
  const eventId = req.headers.get("webhook-id");

  // ── Atomic idempotency check ─────────────────────────────────────────────────
  // INSERT first — if the same event arrives twice concurrently only one INSERT
  // wins; the other gets a unique-constraint error (code 23505) and returns early.
  if (eventId) {
    const { error: insertErr } = await admin
      .from("processed_webhook_events")
      .insert({ id: eventId });
    if (insertErr) {
      if (insertErr.code === "23505") {
        return NextResponse.json({ received: true }); // already processed
      }
      // Unexpected DB error — let Polar retry
      console.error("[billing/webhook] idempotency insert failed:", insertErr);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  }

  const response = await routeEvent(admin, event);

  // Release the idempotency claim on failure so Polar's retry is processed
  // instead of being skipped as a duplicate.
  if (eventId && response.status >= 500) {
    const { error } = await admin.from("processed_webhook_events").delete().eq("id", eventId);
    if (error) console.error("[billing/webhook] idempotency release failed:", error);
  }
  return response;
}

type PolarEvent = Awaited<ReturnType<typeof webhooks.validateEvent>>;

async function routeEvent(admin: SupabaseAdmin, event: PolarEvent): Promise<NextResponse> {
  // ── Event routing ────────────────────────────────────────────────────────────
  switch (event.type) {
    case "order.paid": {
      // One-time credit top-up purchase
      const meta = getMeta(event.data.metadata);
      if (meta.type !== "topup") break;

      const userId = meta.user_id;
      if (!userId) break;

      const credits = parseInt(meta.credits ?? "0", 10);
      if (credits <= 0) break;

      // Credit first so a failed RPC (retried by Polar) never leaves a duplicate log row.
      const { error: rpcError } = await admin.rpc("increment_topup_credits", {
        p_user_id: userId,
        p_amount: credits,
      });
      if (rpcError) {
        console.error("[billing/webhook] order.paid credit update failed:", rpcError);
        return NextResponse.json({ error: "Credit update failed" }, { status: 500 });
      }
      await Promise.all([
        admin.from("users")
          .update({ polar_customer_id: event.data.customer_id })
          .eq("id", userId),
        admin.from("credits_log").insert({
          user_id: userId,
          amount: credits,
          type: "credit",
          reason: `Top-up purchase (${credits} credits)`,
        }),
      ]);
      break;
    }

    case "subscription.created":
    case "subscription.updated":
    case "subscription.cycled":
    case "subscription.canceled":
    case "subscription.uncanceled":
    case "subscription.revoked": {
      const failure = await syncSubscription(admin, event.type, event.data);
      if (failure) return failure;
      break;
    }
  }

  return NextResponse.json({ received: true });
}
