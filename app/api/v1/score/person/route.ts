import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-errors";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { redactPublicSources } from "@/lib/public-source";
import { scorePerson } from "@/lib/person-score-service";
import type { BusinessProfile } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email")?.trim();
  const linkedin = searchParams.get("linkedin")?.trim();
  const name = searchParams.get("name")?.trim();
  const company = searchParams.get("company")?.trim();
  const title = searchParams.get("title")?.trim();

  if (!email && !linkedin && !(name && company)) {
    return errorResponse(400, "invalid_request", "Provide at least one of: email, linkedin, or name + company");
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  const supabase = createSupabaseAdmin();
  let userId: string | null = null;
  let productCategory = "B2B SaaS";
  let businessProfile: BusinessProfile | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    const apiKey = authHeader.slice(7);
    const { data: keyRow } = await supabase
      .from("api_keys")
      .select("user_id, is_active")
      .eq("key_hash", await hashKey(apiKey))
      .single();

    if (!keyRow?.is_active) {
      return errorResponse(401, "unauthorized", "Invalid or inactive API key");
    }
    userId = keyRow.user_id;
  } else {
    const { userId: clerkId } = await auth();
    if (clerkId) userId = clerkId;
  }

  // ── Credit check ────────────────────────────────────────────────────────────
  const skipCredits = process.env.DISABLE_CREDIT_CHECK === "true";
  if (userId && !skipCredits) {
    const { data: user } = await supabase
      .from("users")
      .select("credits_remaining, product_category, business_profile")
      .eq("id", userId)
      .single();

    if (!user || user.credits_remaining <= 0) {
      return errorResponse(402, "insufficient_credits", "Insufficient credits");
    }
    productCategory = user.product_category ?? productCategory;
    businessProfile = (user.business_profile as BusinessProfile) ?? null;
  }

  if (!userId) {
    return errorResponse(401, "unauthorized", "Unauthorized");
  }

  try {
    const result = await scorePerson({
      email: email || undefined,
      linkedinUrl: linkedin || undefined,
      name: name || undefined,
      organizationName: company || undefined,
      title: title || undefined,
      userId,
      productCategory,
      businessProfile,
      skipCredits,
    });
    return NextResponse.json(redactPublicSources(result));
  } catch (err) {
    console.error("[person-score] error:", err);
    const message = (err as Error).message ?? "Person scoring failed";
    return errorResponse(500, "scoring_failed", message);
  }
}

async function hashKey(key: string): Promise<string> {
  const { createHash } = await import("crypto");
  return createHash("sha256").update(key).digest("hex");
}
