import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPolar } from "@/lib/polar";

const PLAN_PRODUCT_IDS: Record<string, string> = {
  starter: process.env.POLAR_PRODUCT_STARTER ?? "",
  growth:  process.env.POLAR_PRODUCT_GROWTH  ?? "",
  pro:     process.env.POLAR_PRODUCT_PRO     ?? "",
  agency:  process.env.POLAR_PRODUCT_AGENCY  ?? "",
};

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const plan = formData.get("plan") as string;

  if (!(plan in PLAN_PRODUCT_IDS)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  if (!PLAN_PRODUCT_IDS[plan]) {
    return NextResponse.json(
      { error: "Payment not configured. Set POLAR_PRODUCT_* env vars." },
      { status: 503 }
    );
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3000";

  try {
    const checkout = await getPolar().checkouts.create({
      products: [PLAN_PRODUCT_IDS[plan]],
      success_url: `${origin}/billing?success=true`,
      metadata: { user_id: userId, plan },
    });

    return NextResponse.redirect(checkout.url, 303);
  } catch (err) {
    console.error("[billing/checkout] failed:", err);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
