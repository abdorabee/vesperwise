import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPolar } from "@/lib/polar";
import { TOPUP_PACKS } from "@/lib/plan-features";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const amount = String(formData.get("amount") ?? "");
  const pack = TOPUP_PACKS.find((item) => item.amount === amount);

  if (!pack) {
    return NextResponse.json({ error: "Invalid credit amount" }, { status: 400 });
  }
  const productId = process.env[pack.envKey]?.trim() ?? "";
  if (!productId) {
    return NextResponse.json(
      { error: "Payment not configured. Set POLAR_PRODUCT_TOPUP_* env vars." },
      { status: 503 }
    );
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3000";

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
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
