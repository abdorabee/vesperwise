import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { PLAN_CREDITS } from "@/lib/types";

/** Constant-time check of the `Authorization: Bearer <CRON_SECRET>` header Vercel Cron sends. */
function isAuthorized(req: NextRequest, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(req.headers.get("authorization") ?? "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Daily Vercel Cron job: refill free users whose monthly allowance is due. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  }
  if (!isAuthorized(req, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await createSupabaseAdmin().rpc("reset_free_credits", {
    p_allowance: PLAN_CREDITS.free,
  });
  if (error) {
    console.error("[cron/reset-free-credits] reset failed:", error);
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }

  return NextResponse.json({ refilled: data ?? 0 });
}
