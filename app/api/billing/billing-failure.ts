import { NextResponse } from "next/server";
import type { BillingErrorCode } from "@/lib/billing-errors";
import { trustedAppOrigin } from "./return-url";

const SEE_OTHER = 303;

/** A programmatic client opts in to JSON; a native form navigation does not. */
export function wantsJson(req: Request): boolean {
  return (req.headers.get("accept") ?? "").includes("application/json");
}

/**
 * Failure response for the billing POST routes. Form navigations are sent back
 * to /billing with a short error code instead of a raw JSON page; JSON clients
 * keep the original JSON body and status.
 */
export function billingFailure(
  req: Request,
  failure: { code: BillingErrorCode; status: number; error: string },
): NextResponse {
  if (wantsJson(req)) return NextResponse.json({ error: failure.error }, { status: failure.status });
  const target = new URL("/billing", trustedAppOrigin(req));
  target.searchParams.set("error", failure.code);
  return NextResponse.redirect(target, SEE_OTHER);
}

/** Maps a rate-limiter response (429) to the same form-vs-JSON behaviour; JSON clients get the limiter's own response. */
export function billingRateLimited(req: Request, limited: NextResponse): NextResponse {
  if (wantsJson(req)) return limited;
  return billingFailure(req, { code: "rate_limited", status: 429, error: "Too many requests" });
}
