import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase";
import {
  IdempotencyConflictError,
  InsufficientCreditsError,
  InvalidDomainError,
  ScoreInProgressError,
  ScoreServiceError,
  UnscorableDomainError,
  scoreCompany,
  type ScoreProgressEvent,
  type StoredIntentScore,
} from "@/lib/score-service";
import type { BusinessProfile } from "@/lib/types";

export const maxDuration = 45;

const scoreRequestSchema = z.object({
  domain: z.string().trim().min(1).max(2048),
  company: z.string().trim().min(1).max(200).optional(),
}).strict();

type AuthenticatedUser = {
  userId: string;
  productCategory: string;
  businessProfile: BusinessProfile | null;
};

function sseEncode(payload: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

async function authenticate(req: NextRequest): Promise<AuthenticatedUser | Response> {
  const supabase = createSupabaseAdmin();
  const authHeader = req.headers.get("authorization");
  let userId: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    const apiKey = authHeader.slice(7).trim();
    if (!apiKey) {
      return Response.json({ error: "Invalid or inactive API key", code: "unauthorized" }, { status: 401 });
    }
    const keyHash = createHash("sha256").update(apiKey).digest("hex");
    const { data: keyRow } = await supabase
      .from("api_keys")
      .select("user_id, is_active")
      .eq("key_hash", keyHash)
      .maybeSingle();
    if (!keyRow?.is_active) {
      return Response.json({ error: "Invalid or inactive API key", code: "unauthorized" }, { status: 401 });
    }
    userId = keyRow.user_id;
  } else {
    const session = await auth();
    userId = session.userId;
  }

  if (!userId) {
    return Response.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 });
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("product_category, business_profile")
    .eq("id", userId)
    .maybeSingle();

  if (error || !user) {
    return Response.json({ error: "Workspace user was not found", code: "unauthorized" }, { status: 401 });
  }

  return {
    userId,
    productCategory: user.product_category ?? "B2B SaaS",
    businessProfile: (user.business_profile ?? null) as BusinessProfile | null,
  };
}

function errorPayload(error: unknown): { status: number; body: Record<string, unknown> } {
  if (error instanceof InvalidDomainError) {
    return { status: 400, body: { type: "error", code: "invalid_request", message: error.message, error: error.message, field: "domain" } };
  }
  if (error instanceof InsufficientCreditsError) {
    return {
      status: 402,
      body: {
        type: "error",
        code: error.code,
        message: error.message,
        error: error.message,
        credits_remaining: error.creditsRemaining,
      },
    };
  }
  if (error instanceof IdempotencyConflictError || error instanceof ScoreInProgressError) {
    return { status: 409, body: { type: "error", code: error.code, message: error.message, error: error.message } };
  }
  if (error instanceof UnscorableDomainError) {
    return {
      status: 422,
      body: {
        type: "error",
        code: error.code,
        message: error.message,
        error: error.message,
        ...(error.result as unknown as Record<string, unknown>),
      },
    };
  }
  if (error instanceof ScoreServiceError) {
    return { status: 500, body: { type: "error", code: error.code, message: "Scoring failed", error: "Scoring failed" } };
  }
  return { status: 500, body: { type: "error", code: "scoring_failed", message: "Scoring failed", error: "Scoring failed" } };
}

/** SSE score run: emits ordered stage events then a final `done` with the full result. */
export async function POST(req: NextRequest) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON", code: "invalid_request" }, { status: 400 });
  }

  const parsed = scoreRequestSchema.safeParse(payload);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return Response.json(
      { error: issue?.message ?? "Invalid scoring request", code: "invalid_request", field: issue?.path.join(".") },
      { status: 400 },
    );
  }

  const authenticated = await authenticate(req);
  if (authenticated instanceof Response) return authenticated;

  const idempotencyKey = req.headers.get("idempotency-key")?.trim();
  if (idempotencyKey && idempotencyKey.length > 255) {
    return Response.json(
      { error: "Idempotency-Key must be 255 characters or fewer", code: "invalid_request" },
      { status: 400 },
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(sseEncode(event));
      };

      try {
        const result = await scoreCompany({
          domain: parsed.data.domain,
          companyName: parsed.data.company,
          userId: authenticated.userId,
          productCategory: authenticated.productCategory,
          businessProfile: authenticated.businessProfile,
          skipCredits: process.env.DISABLE_CREDIT_CHECK === "true",
          idempotencyKey,
          onProgress: async (event: ScoreProgressEvent) => {
            send({ type: "stage", ...event });
          },
        });

        send({
          type: "done",
          result: result as StoredIntentScore,
          billing: result.charged ? "1 credit" : result.cached ? "cache hit · free" : "no credit charged",
        });
      } catch (error) {
        const { body } = errorPayload(error);
        send({ type: "error", message: String(body.error ?? body.message ?? "Scoring failed"), ...body });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
