import { NextResponse } from "next/server";
import type { z } from "zod";

export type ParsedBody<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

const MAX_REPORTED_PATHS = 10;

/** Dotted field paths of validation issues. Never echoes submitted values. */
function issuePaths(error: z.ZodError): string[] {
  const paths = error.issues.map((issue) => issue.path.join(".") || "(body)");
  return [...new Set(paths)].slice(0, MAX_REPORTED_PATHS);
}

/**
 * Reads a JSON request body and validates it against `schema`.
 * Bad JSON -> 400 "Invalid JSON"; wrong shape -> 400 "Invalid request" with field paths only.
 */
export async function parseJsonBody<S extends z.ZodType>(
  req: Request,
  schema: S,
): Promise<ParsedBody<z.infer<S>>> {
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
        { error: "Invalid request", fields: issuePaths(parsed.error) },
        { status: 400 },
      ),
    };
  }
  return { ok: true, data: parsed.data };
}
