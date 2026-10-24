import { NextRequest, NextResponse } from "next/server";
import { webhooks } from "@polar-sh/sdk/2026-04";
import { createSupabaseAdmin } from "@/lib/supabase";
import {
  computeBillingPatch,
  type Plan,
  type StoredBilling,
  type SubscriptionEventType,
  type SubscriptionSnapshot,
} from "@/lib/billing/subscription-sync";
import { isArchivedPolarProduct } from "@/lib/billing/archived-products";
import { CHECKOUT_PRODUCT_ENV, TOPUP_PACKS, type CheckoutPlan } from "@/lib/plan-features";

function productToPlan(): Record<string, Plan> {
  const entries = (Object.entries(CHECKOUT_PRODUCT_ENV) as [CheckoutPlan, string][])
    .map(([plan, envKey]) => [process.env[envKey]?.trim(), plan] as const)
    .filter((entry): entry is [string, CheckoutPlan] => Boolean(entry[0]));
  return Object.fromEntries(entries);
}

function topupCreditsByProduct(): Record<string, number> {
  const entries = TOPUP_PACKS
    .map((pack) => [process.env[pack.envKey]?.trim(), pack.credits] as const)
    .filter((entry): entry is [string, number] => Boolean(entry[0]));
  return Object.fromEntries(entries);
}

/** Mapped products credit the account. Archived ones are ignored. Anything else must retry. */
function unmappedProductResponse(productId: string, eventType: string): NextResponse | null {
  if (productId && isArchivedPolarProduct(productId)) {
    console.warn(`[billing/webhook] ignoring archived product ${productId} on ${eventType}`);
    return null;
  }
  console.error(`[billing/webhook] unmapped product ${productId || "(missing)"} on ${eventType}`);
  return NextResponse.json(
    { error: "Unmapped Polar product", product_id: productId || null },
    { status: 500 },
  );
}

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

  const mappedPlan = productToPlan()[sub.product_id];
  if (!mappedPlan) return unmappedProductResponse(sub.product_id, type);
  const patch = computeBillingPatch(type, sub, mappedPlan, stored);
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
      const meta = getMeta(event.data.metadata);
      const productId = "product_id" in event.data ? String(event.data.product_id ?? "") : "";
      const credits = topupCreditsByProduct()[productId];
      if (!credits) {
        const ignored = unmappedProductResponse(productId, "order.paid");
        if (ignored) return ignored;
        break;
      }

      const userId = meta.user_id;
      if (!userId) break;

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
