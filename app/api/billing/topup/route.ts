import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPolar } from "@/lib/polar";

const CREDIT_PACK_PRODUCTS: Record<string, { credits: number; productId: string }> = {
  "100":  { credits: 100,  productId: process.env.POLAR_PRODUCT_TOPUP_100  ?? "" },
  "500":  { credits: 500,  productId: process.env.POLAR_PRODUCT_TOPUP_500  ?? "" },
  "1000": { credits: 1000, productId: process.env.POLAR_PRODUCT_TOPUP_1000 ?? "" },
};

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const amount = formData.get("amount") as string;
  const pack = CREDIT_PACK_PRODUCTS[amount];

  if (!pack) {
    return NextResponse.json({ error: "Invalid credit amount" }, { status: 400 });
  }
  if (!pack.productId) {
    return NextResponse.json(
      { error: "Payment not configured. Set POLAR_PRODUCT_TOPUP_* env vars." },
      { status: 503 }
    );
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3000";

  try {
    const checkout = await getPolar().checkouts.create({
      products: [pack.productId],
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
