import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { errorResponse, unauthorizedResponse } from "@/lib/api-errors";
import {
  extractProfileFromPdfText,
  pdfUploadFailure,
  PDF_RATE_LIMIT_MESSAGE,
  PDF_UNREADABLE_MESSAGE,
} from "@/lib/onboarding-pdf";
import { consumePdfRead } from "@/lib/onboarding-pdf-limit";
import { readPdfDocument } from "@/lib/onboarding-pdf-read";

export const runtime = "nodejs";

function isUpload(value: FormDataEntryValue | null): value is File {
  return value !== null && typeof value === "object" && "arrayBuffer" in value && "size" in value;
}

/**
 * Reads an onboarding PDF into profile fields. The bytes are wiped after
 * parsing and never written to storage. No credits are charged.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return unauthorizedResponse();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return errorResponse(400, "invalid_body", "Upload a PDF file.");
  }

  const file = form.get("file");
  if (!isUpload(file)) return errorResponse(400, "invalid_body", "Upload a PDF file.");

  const limit = await consumePdfRead(userId);
  if (!limit.ok) {
    return errorResponse(429, "rate_limited", PDF_RATE_LIMIT_MESSAGE, {}, {
      "Retry-After": String(limit.retryAfterSeconds),
    });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    const early = pdfUploadFailure({ size: file.size, header: bytes });
    if (early) return errorResponse(early.status, early.code, early.message);

    let parsed: { text: string; pageCount: number };
    try {
      parsed = await readPdfDocument(bytes);
    } catch {
      console.warn("[onboarding-pdf] parse failed");
      return errorResponse(422, "unreadable", PDF_UNREADABLE_MESSAGE);
    }

    const late = pdfUploadFailure({ pageCount: parsed.pageCount, text: parsed.text });
    if (late) return errorResponse(late.status, late.code, late.message);

    const exclude = form.get("exclude_domain");
    const extracted = extractProfileFromPdfText(parsed.text, {
      excludeDomains: typeof exclude === "string" ? [exclude] : [],
    });

    return NextResponse.json({
      discarded: true,
      profile: extracted.profile,
      filled: extracted.filled,
    });
  } finally {
    bytes.fill(0);
  }
}
