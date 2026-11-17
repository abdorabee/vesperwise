import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPolar } from "@/lib/polar";
import { enforceRateLimit } from "@/lib/rate-limit";
import { trustedAppOrigin } from "../return-url";
import { billingFailure, billingRateLimited } from "../billing-failure";

const BILLING_RATE_LIMIT = 10;
const BILLING_RATE_WINDOW_SECONDS = 60;
import {
  CHECKOUT_PLAN_ORDER,
  CHECKOUT_PRODUCT_ENV,
  type CheckoutPlan,
} from "@/lib/plan-features";

function checkoutProductId(plan: string): string | null {
  if (!CHECKOUT_PLAN_ORDER.includes(plan as CheckoutPlan)) return null;
  const envKey = CHECKOUT_PRODUCT_ENV[plan as CheckoutPlan];
  return process.env[envKey]?.trim() || "";
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return billingFailure(req, { code: "unauthorized", status: 401, error: "Unauthorized" });

  const limited = await enforceRateLimit({
    key: `billing:${userId}`,
    limit: BILLING_RATE_LIMIT,
    windowSeconds: BILLING_RATE_WINDOW_SECONDS,
  });
  if (limited) return billingRateLimited(req, limited);

  const formData = await req.formData();
  const plan = String(formData.get("plan") ?? "");
  const productId = checkoutProductId(plan);

  if (productId === null) {
    return billingFailure(req, { code: "invalid_plan", status: 400, error: "Invalid plan" });
  }
  if (!productId) {
    return billingFailure(req, {
      code: "not_configured",
      status: 503,
      error: "Payment not configured. Set POLAR_PRODUCT_* env vars.",
    });
  }

  const origin = trustedAppOrigin(req);

  try {
    const checkout = await getPolar().checkouts.create({
      products: [productId],
      success_url: `${origin}/billing?success=true`,
      metadata: { user_id: userId, plan },
    });

    return NextResponse.redirect(checkout.url, 303);
  } catch (err) {
    console.error("[billing/checkout] failed:", err);
    return billingFailure(req, { code: "checkout_failed", status: 500, error: "Failed to create checkout" });
  }
}
