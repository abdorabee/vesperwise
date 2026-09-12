import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { getPolar } from "@/lib/polar";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();
  const { data: profile } = await admin
    .from("users")
    .select("polar_customer_id")
    .eq("id", userId)
    .single();

  if (!profile?.polar_customer_id) {
    // No customer record yet — send back to billing page
    return NextResponse.redirect(new URL("/billing", req.url));
  }

  try {
    const session = await getPolar().customerSessions.create({
      customer_id: profile.polar_customer_id,
    });
    return NextResponse.redirect(session.customer_portal_url, 303);
  } catch (err) {
    console.error("[billing/portal] failed:", err);
    return NextResponse.redirect(new URL("/billing", req.url));
  }
}
