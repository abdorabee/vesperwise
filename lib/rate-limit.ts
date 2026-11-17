import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { PLAN_RATE_LIMIT } from "@/lib/types";

const DEFAULT_WINDOW_SECONDS = 60;
const DEFAULT_SCOPE = "api";
const UNKNOWN_IP = "unknown";

export type RateLimitResult = { ok: true; remaining: number } | { ok: false; retryAfter: number };

type RateLimitOptions = { key: string; limit: number; windowSeconds?: number };

type RateLimitRow = {
  allowed: boolean;
  remaining: number;
  retry_after_seconds: number;
};

let hasLoggedFailure = false;

function logFailureOnce(key: string, reason: string): void {
  if (hasLoggedFailure) return;
  hasLoggedFailure = true;
  // Scope prefix only: the rest of the key may contain an IP or user id.
  const scope = key.split(":")[0] ?? "unknown";
  console.error(`[rate-limit] check failed open (scope=${scope}): ${reason}`);
}

/**
 * Atomically counts one request against `key`'s fixed window. Fails open: if the
 * RPC errors or throws (e.g. migration not applied) the request is allowed.
 */
export async function checkRateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const { key, limit, windowSeconds = DEFAULT_WINDOW_SECONDS } = opts;
  try {
    const { data, error } = await createSupabaseAdmin().rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      logFailureOnce(key, error.message);
      return { ok: true, remaining: limit };
    }
    const row = (Array.isArray(data) ? data[0] : data) as RateLimitRow | null | undefined;
    if (!row) {
      logFailureOnce(key, "empty result");
      return { ok: true, remaining: limit };
    }
    if (row.allowed) return { ok: true, remaining: row.remaining };
    return { ok: false, retryAfter: Math.max(row.retry_after_seconds, 1) };
  } catch (err) {
    logFailureOnce(key, err instanceof Error ? err.message : "unknown error");
    return { ok: true, remaining: limit };
  }
}

/** Returns a 429 response when blocked, or null when the request may proceed. */
export async function enforceRateLimit(opts: RateLimitOptions): Promise<NextResponse | null> {
  const result = await checkRateLimit(opts);
  if (result.ok) return null;
  return NextResponse.json(
    { error: "Rate limit exceeded", code: "rate_limited" },
    { status: 429, headers: { "Retry-After": String(result.retryAfter) } }
  );
}

/** Per-plan requests/minute for the public API, keyed by user id. */
export async function enforcePlanRateLimit(
  userId: string,
  plan: string | null | undefined,
  scope: string = DEFAULT_SCOPE
): Promise<NextResponse | null> {
  const limits: Record<string, number> = PLAN_RATE_LIMIT;
  const limit = (plan ? limits[plan] : undefined) ?? PLAN_RATE_LIMIT.free;
  return enforceRateLimit({ key: `${scope}:${userId}`, limit });
}

/** Best-effort client IP for unauthenticated routes. */
export function clientIpFromRequest(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  return req.headers.get("x-real-ip")?.trim() || UNKNOWN_IP;
}
