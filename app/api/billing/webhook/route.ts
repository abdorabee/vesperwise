import { NextRequest, NextResponse } from "next/server";
import { webhooks } from "@polar-sh/sdk/2026-04";
import { createSupabaseAdmin } from "@/lib/supabase";
import { PLAN_CREDITS } from "@/lib/types";

// Reverse map: Polar product ID → plan name (for portal-initiated plan changes).
// Filter out empty-string keys that arise when env vars are unset.
const PRODUCT_TO_PLAN: Record<string, string> = Object.fromEntries(
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

export async function POST(req: NextRequest) {
  if (!process.env.POLAR_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const rawBody = await req.text();

  // ── Signature verification ───────────────────────────────────────────────────
  let event: Awaited<ReturnType<typeof webhooks.validateEvent>>;
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

      const [rpcResult] = await Promise.all([
        admin.rpc("increment_credits", { p_user_id: userId, p_amount: credits }),
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
      if (rpcResult.error) {
        console.error("[billing/webhook] order.paid credit update failed:", rpcResult.error);
        return NextResponse.json({ error: "Credit update failed" }, { status: 500 });
      }
      break;
    }

    case "subscription.created": {
      const meta = getMeta(event.data.metadata);
      const userId = meta.user_id;
      if (!userId) break;

      const plan = PRODUCT_TO_PLAN[event.data.product_id] ?? meta.plan;
      if (!plan || !(plan in PLAN_CREDITS)) break;

      const { error } = await admin.from("users").update({
        plan,
        credits_remaining: PLAN_CREDITS[plan as keyof typeof PLAN_CREDITS],
        polar_customer_id: event.data.customer_id,
        polar_subscription_id: event.data.id,
        subscription_renews_at: event.data.current_period_end ?? null,
        subscription_cancel_at_period_end: event.data.cancel_at_period_end ?? false,
      }).eq("id", userId);
      if (error) {
        console.error("[billing/webhook] subscription.created update failed:", error);
        return NextResponse.json({ error: "User update failed" }, { status: 500 });
      }
      break;
    }

    case "subscription.updated": {
      // Fires for plan changes, cancellation scheduling, and un-cancellations.
      const meta = getMeta(event.data.metadata);
      const userId = meta.user_id;
      if (!userId) break;

      if (event.data.cancel_at_period_end === true) {
        // User scheduled a cancellation — preserve plan/credits, update status fields only
        const { error } = await admin.from("users").update({
          subscription_renews_at: event.data.current_period_end ?? null,
          subscription_cancel_at_period_end: true,
        }).eq("id", userId);
        if (error) {
          console.error("[billing/webhook] subscription.updated (cancel) update failed:", error);
          return NextResponse.json({ error: "User update failed" }, { status: 500 });
        }
        break;
      }

      const plan = PRODUCT_TO_PLAN[event.data.product_id] ?? meta.plan;
      if (!plan || !(plan in PLAN_CREDITS)) {
        // Unknown plan but subscription is active (e.g. un-cancel with stale metadata).
        // At minimum clear the cancel flag so the UI reflects active status.
        await admin.from("users").update({
          subscription_cancel_at_period_end: false,
          subscription_renews_at: event.data.current_period_end ?? null,
        }).eq("id", userId);
        break;
      }

      const { error } = await admin.from("users").update({
        plan,
        credits_remaining: PLAN_CREDITS[plan as keyof typeof PLAN_CREDITS],
        polar_customer_id: event.data.customer_id,
        polar_subscription_id: event.data.id,
        subscription_renews_at: event.data.current_period_end ?? null,
        subscription_cancel_at_period_end: false,
      }).eq("id", userId);
      if (error) {
        console.error("[billing/webhook] subscription.updated update failed:", error);
        return NextResponse.json({ error: "User update failed" }, { status: 500 });
      }
      break;
    }

    case "subscription.canceled": {
      // Fires when the billing period actually ends — downgrade user to free
      const meta = getMeta(event.data.metadata);
      const userId = meta.user_id;
      if (!userId) break;

      const { error } = await admin.from("users").update({
        plan: "free",
        credits_remaining: PLAN_CREDITS.free,
        polar_subscription_id: null,
        subscription_renews_at: null,
        subscription_cancel_at_period_end: false,
      }).eq("id", userId);
      if (error) {
        console.error("[billing/webhook] subscription.canceled update failed:", error);
        return NextResponse.json({ error: "User update failed" }, { status: 500 });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
