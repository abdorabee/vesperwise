import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase";
import { isDevCreditBypassEnabled } from "@/lib/dev-credit-bypass";
import {
  IdempotencyConflictError,
  InsufficientCreditsError,
  InvalidDomainError,
  ScoreInProgressError,
  ScoreServiceError,
  UnscorableDomainError,
  scoreCompany,
} from "@/lib/score-service";
import type { BusinessProfile } from "@/lib/types";

export const maxDuration = 45;

const scoreRequestSchema = z.object({
  domain: z.string().trim().min(1).max(2048),
  company: z.string().trim().min(1).max(200).optional(),
}).strict();

type ScoreInput = z.infer<typeof scoreRequestSchema>;

interface AuthenticatedUser {
  userId: string;
  productCategory: string;
  businessProfile: BusinessProfile | null;
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
  headers?: HeadersInit
) {
  return NextResponse.json(
    {
      type: "error",
      code,
      message,
      // Backward compatibility for dashboard callers that read `error`.
      error: message,
      ...extra,
    },
    { status, headers }
  );
}

async function authenticate(req: NextRequest): Promise<AuthenticatedUser | NextResponse> {
  const supabase = createSupabaseAdmin();
  const authHeader = req.headers.get("authorization");
  let userId: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    const apiKey = authHeader.slice(7).trim();
    if (!apiKey) return errorResponse(401, "unauthorized", "Invalid or inactive API key");

    const keyHash = createHash("sha256").update(apiKey).digest("hex");
    const { data: keyRow } = await supabase
      .from("api_keys")
      .select("user_id, is_active")
      .eq("key_hash", keyHash)
      .maybeSingle();

    if (!keyRow?.is_active) {
      return errorResponse(401, "unauthorized", "Invalid or inactive API key");
    }
    userId = keyRow.user_id;
  } else {
    const session = await auth();
    userId = session.userId;
  }

  if (!userId) return errorResponse(401, "unauthorized", "Unauthorized");

  const { data: user, error } = await supabase
    .from("users")
    .select("product_category, business_profile")
    .eq("id", userId)
    .maybeSingle();

  if (error || !user) {
    return errorResponse(401, "unauthorized", "Workspace user was not found");
  }

  return {
    userId,
    productCategory: user.product_category ?? "B2B SaaS",
    businessProfile: (user.business_profile ?? null) as BusinessProfile | null,
  };
}

async function executeScore(req: NextRequest, input: ScoreInput): Promise<NextResponse> {
  const authenticated = await authenticate(req);
  if (authenticated instanceof NextResponse) return authenticated;

  const idempotencyKey = req.headers.get("idempotency-key")?.trim();
  if (idempotencyKey && idempotencyKey.length > 255) {
    return errorResponse(400, "invalid_request", "Idempotency-Key must be 255 characters or fewer", {
      field: "Idempotency-Key",
    });
  }

  try {
    const result = await scoreCompany({
      domain: input.domain,
      userId: authenticated.userId,
      companyName: input.company,
      productCategory: authenticated.productCategory,
      businessProfile: authenticated.businessProfile,
      skipCredits: isDevCreditBypassEnabled(),
      idempotencyKey,
    });

    const headers = new Headers({
      "X-IIQ-Cache": result.cached ? "hit" : "miss",
    });
    if (result.idempotent_replayed) headers.set("Idempotency-Replayed", "true");
    return NextResponse.json(result, { headers });
  } catch (error) {
    if (error instanceof InvalidDomainError) {
      return errorResponse(400, "invalid_request", error.message, { field: "domain" });
    }
    if (error instanceof InsufficientCreditsError) {
      return errorResponse(402, error.code, error.message, {
        credits_remaining: error.creditsRemaining,
      });
    }
    if (error instanceof IdempotencyConflictError) {
      return errorResponse(409, error.code, error.message);
    }
    if (error instanceof ScoreInProgressError) {
      return errorResponse(
        409,
        error.code,
        error.message,
        { score_run_id: error.runId, retry_after_seconds: 2 },
        { "Retry-After": "2" }
      );
    }
    if (error instanceof UnscorableDomainError) {
      return errorResponse(
        422,
        error.code,
        error.message,
        error.result as unknown as Record<string, unknown>,
        error.result.idempotent_replayed ? { "Idempotency-Replayed": "true" } : undefined
      );
    }
    if (error instanceof ScoreServiceError) {
      console.error("[score] service error", error.code, error);
      return errorResponse(500, error.code, "Scoring failed");
    }

    console.error("[score] unexpected error", error);
    return errorResponse(500, "scoring_failed", "Scoring failed");
  }
}

/** Canonical scoring endpoint. */
export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return errorResponse(400, "invalid_request", "Request body must be valid JSON");
  }

  const parsed = scoreRequestSchema.safeParse(payload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return errorResponse(400, "invalid_request", issue?.message ?? "Invalid scoring request", {
      field: issue?.path.join(".") || undefined,
    });
  }

  return executeScore(req, parsed.data);
}

/** Legacy dashboard/SDK compatibility wrapper around the canonical POST flow. */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const company = searchParams.get("company")?.trim() || undefined;
  const domain = searchParams.get("domain")?.trim() || (
    company ? `${company.toLowerCase().replace(/\s+/g, "")}.com` : undefined
  );
  const parsed = scoreRequestSchema.safeParse({
    domain,
    company,
  });
  if (!parsed.success) {
    return errorResponse(400, "invalid_request", "Provide at least one of: domain, company", {
      field: parsed.error.issues[0]?.path.join(".") || "domain",
    });
  }

  return executeScore(req, parsed.data);
}
