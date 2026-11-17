import { NextResponse, type NextRequest } from "next/server";
import type { z } from "zod";
import { toIssues } from "@/lib/autopilot-schema";

export type ParsedBody<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

/** Parse JSON and validate it. Failures are 400s that never echo submitted values. */
export async function parseBody<T>(req: NextRequest, schema: z.ZodType<T>): Promise<ParsedBody<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid request", issues: toIssues(parsed.error) },
        { status: 400 },
      ),
    };
  }
  return { ok: true, data: parsed.data };
}
