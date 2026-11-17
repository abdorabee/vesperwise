import { z } from "zod";

export const CHAT_MAX_MESSAGE_CHARS = 8_000;
export const CHAT_MAX_SESSION_ID_CHARS = 64;
export const CHAT_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const CHAT_ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
export const CHAT_HISTORY_MAX_MESSAGES = 50;
export const CHAT_HISTORY_MAX_MESSAGE_CHARS = 4_000;
export const CHAT_HISTORY_MAX_TOTAL_CHARS = 24_000;

/** Max tool calls of any kind per chat turn (parallel calls inside one step count too). */
export const COPILOT_MAX_TOOL_CALLS_PER_TURN = 12;
/** Max calls to credit-spending tools per chat turn. */
export const COPILOT_MAX_CREDIT_TOOL_CALLS_PER_TURN = 3;
export const COPILOT_CREDIT_TOOLS: ReadonlySet<string> = new Set([
  "score_company",
  "score_person",
  "analyze_conversation",
]);

export const TOOL_LIMIT_RESULT = {
  error: "Tool limit reached for this message. Ask the user to send a follow-up.",
  code: "tool_limit",
} as const;

export const chatBodySchema = z.object({
  message: z.string().max(CHAT_MAX_MESSAGE_CHARS),
  session_id: z.string().min(1).max(CHAT_MAX_SESSION_ID_CHARS).optional(),
});

export type ChatBody = z.infer<typeof chatBodySchema>;

export type ImageCheck = { ok: true } | { ok: false; error: string };

export function checkImage(file: { type: string; size: number }): ImageCheck {
  if (!(CHAT_ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, error: "Unsupported image type. Use PNG, JPEG, WebP or GIF." };
  }
  if (file.size > CHAT_MAX_IMAGE_BYTES) {
    return { ok: false, error: "Image is too large (5 MB maximum)." };
  }
  return { ok: true };
}

export interface HistoryRow {
  role: string;
  content: string;
}

/**
 * Keeps the most recent rows that fit the character budget, truncating each
 * message. Output stays in chronological order.
 */
export function limitHistory<T extends HistoryRow>(rows: readonly T[]): T[] {
  const recent = rows.slice(-CHAT_HISTORY_MAX_MESSAGES);
  const kept: T[] = [];
  let remaining = CHAT_HISTORY_MAX_TOTAL_CHARS;
  for (let i = recent.length - 1; i >= 0 && remaining > 0; i -= 1) {
    const content = String(recent[i].content ?? "").slice(0, Math.min(CHAT_HISTORY_MAX_MESSAGE_CHARS, remaining));
    remaining -= content.length;
    kept.unshift({ ...recent[i], content });
  }
  return kept;
}

export interface ToolTurnGuard {
  /** Returns true when a call to `toolName` may run; counts it synchronously. */
  tryAcquire(toolName: string): boolean;
}

export function createToolTurnGuard(): ToolTurnGuard {
  let total = 0;
  let creditCalls = 0;
  return {
    tryAcquire(toolName) {
      if (total >= COPILOT_MAX_TOOL_CALLS_PER_TURN) return false;
      const spends = COPILOT_CREDIT_TOOLS.has(toolName);
      if (spends && creditCalls >= COPILOT_MAX_CREDIT_TOOL_CALLS_PER_TURN) return false;
      total += 1;
      if (spends) creditCalls += 1;
      return true;
    },
  };
}

interface ExecutableTool {
  execute?: (...args: never[]) => unknown;
}

/** Wraps every tool's execute so calls beyond the per-turn budget return a fixed result. */
export function guardTools<T extends Record<string, ExecutableTool>>(tools: T, guard: ToolTurnGuard): T {
  const entries = Object.entries(tools).map(([name, definition]) => {
    const original = definition.execute as ((...args: unknown[]) => unknown) | undefined;
    if (!original) return [name, definition] as const;
    const execute = async (...args: unknown[]) =>
      guard.tryAcquire(name) ? original(...args) : TOOL_LIMIT_RESULT;
    return [name, { ...definition, execute }] as const;
  });
  return Object.fromEntries(entries) as T;
}
