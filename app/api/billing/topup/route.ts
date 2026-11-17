import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPolar } from "@/lib/polar";
import { enforceRateLimit } from "@/lib/rate-limit";
import { trustedAppOrigin } from "../return-url";
import { billingFailure, billingRateLimited } from "../billing-failure";

const BILLING_RATE_LIMIT = 10;
const BILLING_RATE_WINDOW_SECONDS = 60;
import { TOPUP_PACKS } from "@/lib/plan-features";

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
  const amount = String(formData.get("amount") ?? "");
  const pack = TOPUP_PACKS.find((item) => item.amount === amount);

  if (!pack) {
    return billingFailure(req, { code: "invalid_amount", status: 400, error: "Invalid credit amount" });
  }
  const productId = process.env[pack.envKey]?.trim() ?? "";
  if (!productId) {
    return billingFailure(req, {
      code: "not_configured",
      status: 503,
      error: "Payment not configured. Set POLAR_PRODUCT_TOPUP_* env vars.",
    });
  }

  const origin = trustedAppOrigin(req);

  try {
    const checkout = await getPolar().checkouts.create({
      products: [productId],
      success_url: `${origin}/billing?topup=true`,
      metadata: {
        user_id: userId,
        credits: String(pack.credits),
        type: "topup",
      },
    });

    return NextResponse.redirect(checkout.url, 303);
  } catch (err) {
    console.error("[billing/topup] failed:", err);
    return billingFailure(req, { code: "checkout_failed", status: 500, error: "Failed to create checkout" });
  }
}
