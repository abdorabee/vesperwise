import type { SignalStatus } from "@/lib/types";

/**
 * Treg fallback evidence is shadow-by-default: the global fallback switch only
 * allows collection, while promotion requires both shadow mode to be explicitly
 * disabled and the signal key to be allowlisted.
 */
export const TREG_FALLBACK_TIMEOUT_MS = 8_000;
export const TREG_FALLBACK_SIGNAL_KEYS = [
  "funding",
  "hiring",
  "news",
  "technology",
  "firmographics",
] as const;
export type TregFallbackSignalKey = (typeof TREG_FALLBACK_SIGNAL_KEYS)[number];
export const TREG_SOURCE_PREFIX = "treg-";

const TREG_FALLBACK_SIGNAL_KEY_SET = new Set<string>(TREG_FALLBACK_SIGNAL_KEYS);

export function isTregSource(source: string | null | undefined): boolean {
  return source?.trim().toLowerCase().startsWith(TREG_SOURCE_PREFIX) ?? false;
}

export function isTregFallbackSignalKey(value: string): value is TregFallbackSignalKey {
  return TREG_FALLBACK_SIGNAL_KEY_SET.has(value);
}

export function isTregFallbackEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(env.TREG_TOKEN?.trim()) && env.MOCK_SIGNALS !== "true";
}

export function parsePromotedSignals(value: string | undefined): TregFallbackSignalKey[] {
  if (!value) {
    return [];
  }

  const promotedSignals: TregFallbackSignalKey[] = [];
  const seen = new Set<TregFallbackSignalKey>();

  for (const rawSignal of value.split(",")) {
    const signal = rawSignal.trim().toLowerCase();
    if (!isTregFallbackSignalKey(signal) || seen.has(signal)) {
      continue;
    }

    promotedSignals.push(signal);
    seen.add(signal);
  }

  return promotedSignals;
}

export function isTregSignalPromoted(
  key: TregFallbackSignalKey,
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.TREG_FALLBACK_SHADOW_MODE === "false"
    && parsePromotedSignals(env.TREG_PROMOTED_SIGNALS).includes(key);
}

export function shouldFallBackToTreg(status: SignalStatus | undefined): boolean {
  return status === "unavailable" || status === "not_found";
}
