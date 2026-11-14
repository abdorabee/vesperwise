import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { enforcePlanRateLimit, enforceRateLimit } from "@/lib/rate-limit";
import { createSupabaseAdmin } from "@/lib/supabase";

const V1_RATE_LIMIT_SCOPE = "api";
const SESSION_RATE_LIMIT_SCOPE = "app";
/**
 * The signed-in dashboard calls /api/v1 too. Its traffic gets its own, roomier
 * bucket so normal product use never trips the documented API-key plan limits.
 */
export const SESSION_RATE_LIMIT_PER_MINUTE = 120;
const BEARER_PREFIX = "Bearer ";

/** True when the request carries no Bearer API key, i.e. it is a browser session. */
export function isSessionCaller(authorization: string | null | undefined): boolean {
  return !authorization?.startsWith(BEARER_PREFIX);
}

async function requestIsSession(): Promise<boolean> {
  try {
    return isSessionCaller((await headers()).get("authorization"));
  } catch {
    // Outside a request scope: fall back to the stricter API-key plan limit.
    return false;
  }
}

async function lookupPlan(userId: string): Promise<string | null> {
  try {
    const { data } = await createSupabaseAdmin()
      .from("users")
      .select("plan")
      .eq("id", userId)
      .maybeSingle();
    return (data?.plan as string | null | undefined) ?? null;
  } catch (error) {
    // Unknown plan falls back to the strictest (free) limit rather than none.
    console.error("[v1-rate-limit] plan lookup failed", error);
    return null;
  }
}

/**
 * Enforces the request limit for any /api/v1 caller: the documented per-plan
 * limit for API-key callers, and a fixed per-user limit for browser sessions.
 * Pass `plan` when the route already loaded it to skip the extra lookup.
 * Returns a 429 response when blocked, or null when the request may proceed.
 */
export async function enforceV1RateLimit(
  userId: string,
  plan?: string | null
): Promise<NextResponse | null> {
  if (await requestIsSession()) {
    return enforceRateLimit({
      key: `${SESSION_RATE_LIMIT_SCOPE}:${userId}`,
      limit: SESSION_RATE_LIMIT_PER_MINUTE,
    });
  }
  const resolvedPlan = plan === undefined ? await lookupPlan(userId) : plan;
  return enforcePlanRateLimit(userId, resolvedPlan, V1_RATE_LIMIT_SCOPE);
}
