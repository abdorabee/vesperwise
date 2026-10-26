import { createHash } from "node:crypto";

/** Matches the personalized score cache TTL. Retries inside the window reuse one key. */
export const BULK_INLINE_CACHE_WINDOW_MS = 6 * 60 * 60 * 1000;

export function bulkInlineRowSignature(domains: readonly string[]): string {
  return createHash("sha256").update(domains.join("\n")).digest("hex").slice(0, 24);
}

/**
 * A client Idempotency-Key pins the batch. Without one, the same rows in the
 * same cache window share a key so a double submit does not charge twice.
 */
export function bulkInlineBatchKey(
  idempotencyHeader: string | null,
  rowSignature: string,
  now = Date.now(),
): string {
  const header = idempotencyHeader?.trim() ?? "";
  if (header.length > 0 && header.length <= 180) return header;
  const windowId = Math.floor(now / BULK_INLINE_CACHE_WINDOW_MS);
  return `${windowId}:${rowSignature}`;
}

export function bulkInlineRowIdempotencyKey(userId: string, batchKey: string, index: number): string {
  return `bulk-inline:${userId}:${batchKey}:${index}`;
}

export function bulkCreditEstimateMessage(input: {
  estimatedFresh: number;
  creditsRemaining: number;
}): string {
  const fresh = input.estimatedFresh;
  const credits = `${fresh} credit${fresh === 1 ? "" : "s"}`;
  const scores = `${fresh} fresh score${fresh === 1 ? "" : "s"}`;
  const left = input.creditsRemaining.toLocaleString("en-US");
  return `This run uses up to ${credits} for ${scores}. Failed rows are not charged. You have ${left} left.`;
}

export function bulkInsufficientCreditsMessage(input: {
  creditsNeeded: number;
  creditsRemaining: number;
}): string {
  return `Not enough credits. This file needs ${input.creditsNeeded} fresh scores and you have ${input.creditsRemaining}.`;
}
