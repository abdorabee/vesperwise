import type { NextRequest } from "next/server";

import { CHAT_MAX_IMAGE_BYTES, chatBodySchema, checkImage } from "@/lib/chat-limits";

/** Headroom over the image cap for the multipart envelope and text fields. */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;
const JSON_BODY_MAX_BYTES = 64 * 1024;

export interface ParsedChatImage {
  base64: string;
  mediaType: string;
}

export type ParsedChatRequest =
  | { ok: true; message: string; sessionId?: string; image: ParsedChatImage | null }
  | { ok: false; status: number; error: string };

const fail = (error: string, status = 400): ParsedChatRequest => ({ ok: false, status, error });

function declaredLength(req: NextRequest): number {
  const value = Number(req.headers.get("content-length"));
  return Number.isFinite(value) ? value : 0;
}

async function parseImage(value: FormDataEntryValue | null): Promise<ParsedChatImage | null | "invalid" | string> {
  if (value === null || value === "") return null;
  if (typeof value === "string") return "invalid";
  if (value.size === 0) return null;
  const check = checkImage(value);
  if (!check.ok) return check.error;
  const buffer = await value.arrayBuffer();
  return { base64: Buffer.from(buffer).toString("base64"), mediaType: value.type };
}

async function parseMultipart(req: NextRequest): Promise<ParsedChatRequest> {
  if (declaredLength(req) > CHAT_MAX_IMAGE_BYTES + MULTIPART_OVERHEAD_BYTES) {
    return fail("Request is too large.", 413);
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("Invalid form data");
  }
  const rawMessage = form.get("message");
  const rawSession = form.get("session_id");
  const parsed = chatBodySchema.safeParse({
    message: rawMessage ?? "",
    session_id: rawSession === null || rawSession === "" ? undefined : rawSession,
  });
  if (!parsed.success) return fail("Invalid message");

  const image = await parseImage(form.get("image"));
  if (typeof image === "string") return fail(image === "invalid" ? "Invalid image" : image);
  return { ok: true, message: parsed.data.message, sessionId: parsed.data.session_id, image };
}

async function parseJson(req: NextRequest): Promise<ParsedChatRequest> {
  if (declaredLength(req) > JSON_BODY_MAX_BYTES) return fail("Request is too large.", 413);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }
  const parsed = chatBodySchema.safeParse(body);
  if (!parsed.success) return fail("Invalid message");
  return { ok: true, message: parsed.data.message, sessionId: parsed.data.session_id, image: null };
}

export async function parseChatRequest(req: NextRequest): Promise<ParsedChatRequest> {
  const contentType = req.headers.get("content-type") ?? "";
  const result = contentType.includes("multipart/form-data") ? await parseMultipart(req) : await parseJson(req);
  if (result.ok && !result.message.trim() && !result.image) {
    return fail("Message or image is required");
  }
  return result;
}
