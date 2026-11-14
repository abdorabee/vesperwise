import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { errorResponse } from "@/lib/api-errors";
import { createSupabaseAdmin } from "@/lib/supabase";
import { redactPublicSources } from "@/lib/public-source";
import { scorePerson } from "@/lib/person-score-service";
import { isDevCreditBypassEnabled } from "@/lib/dev-credit-bypass";
import { enforceV1RateLimit } from "@/app/api/v1/rate-limit";
import type { BusinessProfile } from "@/lib/types";

const FIELD_MAX = 500;
const optionalField = z.string().trim().max(FIELD_MAX).optional();

const personRequestSchema = z.object({
  email: optionalField,
  linkedin: optionalField,
  name: optionalField,
  company: optionalField,
  title: optionalField,
}).strict();

type PersonInput = z.infer<typeof personRequestSchema>;

interface Caller {
  userId: string;
  via: "api_key" | "session";
}

async function authenticate(req: NextRequest): Promise<Caller | NextResponse> {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const apiKey = authHeader.slice(7).trim();
    if (!apiKey) return errorResponse(401, "unauthorized", "Invalid or inactive API key");
    const keyHash = createHash("sha256").update(apiKey).digest("hex");
    const { data: keyRow } = await createSupabaseAdmin()
      .from("api_keys")
      .select("user_id, is_active")
      .eq("key_hash", keyHash)
      .maybeSingle();
    if (!keyRow?.is_active) {
      return errorResponse(401, "unauthorized", "Invalid or inactive API key");
    }
    return { userId: keyRow.user_id as string, via: "api_key" };
  }

  const { userId } = await auth();
  if (!userId) return errorResponse(401, "unauthorized", "Unauthorized");
  return { userId, via: "session" };
}

function hasIdentifier(input: PersonInput): boolean {
  return Boolean(input.email || input.linkedin || (input.name && input.company));
}

async function scoreForCaller(userId: string, input: PersonInput): Promise<NextResponse> {
  if (!hasIdentifier(input)) {
    return errorResponse(400, "invalid_request", "Provide at least one of: email, linkedin, or name + company");
  }

  const supabase = createSupabaseAdmin();
  const skipCredits = isDevCreditBypassEnabled();
  let productCategory = "B2B SaaS";
  let businessProfile: BusinessProfile | null = null;

  if (!skipCredits) {
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

  try {
    const result = await scorePerson({
      email: input.email || undefined,
      linkedinUrl: input.linkedin || undefined,
      name: input.name || undefined,
      organizationName: input.company || undefined,
      title: input.title || undefined,
      userId,
      productCategory,
      businessProfile,
      skipCredits,
    });
    const { data: balance } = await supabase
      .from("users")
      .select("credits_remaining")
      .eq("id", userId)
      .maybeSingle();
    return NextResponse.json(redactPublicSources({
      ...result,
      credits_remaining: balance?.credits_remaining ?? null,
    }));
  } catch (err) {
    console.error("[person-score] error:", err);
    return errorResponse(500, "scoring_failed", "Person scoring failed");
  }
}

/** Query-string scoring for API-key callers only; sessions must use POST. */
export async function GET(req: NextRequest) {
  const caller = await authenticate(req);
  if (caller instanceof NextResponse) return caller;
  if (caller.via === "session") {
    return errorResponse(405, "method_not_allowed", "Use POST", {}, { Allow: "POST" });
  }
  const limited = await enforceV1RateLimit(caller.userId);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const parsed = personRequestSchema.safeParse({
    email: searchParams.get("email") ?? undefined,
    linkedin: searchParams.get("linkedin") ?? undefined,
    name: searchParams.get("name") ?? undefined,
    company: searchParams.get("company") ?? undefined,
    title: searchParams.get("title") ?? undefined,
  });
  if (!parsed.success) {
    return errorResponse(400, "invalid_request", parsed.error.issues[0]?.message ?? "Invalid request");
  }
  return scoreForCaller(caller.userId, parsed.data);
}

/** JSON-body scoring for API keys and browser sessions. */
export async function POST(req: NextRequest) {
  const caller = await authenticate(req);
  if (caller instanceof NextResponse) return caller;
  const limited = await enforceV1RateLimit(caller.userId);
  if (limited) return limited;

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return errorResponse(400, "invalid_request", "Request body must be valid JSON");
  }
  const parsed = personRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return errorResponse(400, "invalid_request", parsed.error.issues[0]?.message ?? "Invalid request");
  }
  return scoreForCaller(caller.userId, parsed.data);
}
