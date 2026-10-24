import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPolar } from "@/lib/polar";
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
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const plan = String(formData.get("plan") ?? "");
  const productId = checkoutProductId(plan);

  if (productId === null) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  if (!productId) {
    return NextResponse.json(
      { error: "Payment not configured. Set POLAR_PRODUCT_* env vars." },
      { status: 503 }
    );
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3000";

  try {
    const checkout = await getPolar().checkouts.create({
      products: [productId],
      success_url: `${origin}/billing?success=true`,
      metadata: { user_id: userId, plan },
    });

    return NextResponse.redirect(checkout.url, 303);
  } catch (err) {
    console.error("[billing/checkout] failed:", err);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
