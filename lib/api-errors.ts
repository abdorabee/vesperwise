import { NextResponse } from "next/server";

/**
 * The documented API error shape: `{ type: "error", code, message }`.
 * `error` mirrors `message` for older dashboard callers that read it.
 */
export function errorResponse(
  status: number,
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
  headers?: HeadersInit
): NextResponse {
  return NextResponse.json(
    { type: "error", code, message, error: message, ...extra },
    { status, headers }
  );
}

export function unauthorizedResponse(message = "Unauthorized"): NextResponse {
  return errorResponse(401, "unauthorized", message);
}
