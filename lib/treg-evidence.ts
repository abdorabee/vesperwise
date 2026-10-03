import { fetchTregFallbackSignal, fetchTregFirmographics, type TregFirmographicsResult } from "@/lib/signals/treg";
import {
  isTregFallbackEnabled,
  isTregFallbackSignalKey,
  isTregSignalPromoted,
  isTregSource,
  shouldFallBackToTreg,
  TREG_FALLBACK_TIMEOUT_MS,
  type TregFallbackSignalKey,
} from "@/lib/treg-fallback";
import type { SignalEvidenceRow } from "./score-evidence";
import type { SignalResult, SignalStatus } from "@/lib/types";

type TregSignalKey = Exclude<TregFallbackSignalKey, "firmographics">;

const REUSABLE_TREG_STATUSES = new Set<SignalStatus>(["ok", "no_signal"]);

function fetchedAtMs(row: SignalEvidenceRow): number {
  const fetchedAt = new Date(row.fetched_at).getTime();
  return Number.isFinite(fetchedAt) ? fetchedAt : Number.NaN;
}

function isFreshAt(row: SignalEvidenceRow, nowMs: number, freshnessMs: number): boolean {
  const fetchedAt = fetchedAtMs(row);
  return Number.isFinite(fetchedAt) && Math.max(0, nowMs - fetchedAt) <= freshnessMs;
}

function isTregSignalKey(key: string): key is TregSignalKey {
  return isTregFallbackSignalKey(key) && key !== "firmographics";
}

export function findFreshTregRow(
  rows: readonly SignalEvidenceRow[],
  nowMs: number,
  freshnessMs: number
): SignalEvidenceRow | null {
  let selected: SignalEvidenceRow | null = null;
  let selectedFetchedAt = Number.NEGATIVE_INFINITY;

  for (const row of rows) {
    if (!isTregSource(row.source) || !REUSABLE_TREG_STATUSES.has(row.status)) continue;
    if (!isFreshAt(row, nowMs, freshnessMs)) continue;
    const rowFetchedAt = fetchedAtMs(row);
    if (rowFetchedAt <= selectedFetchedAt) continue;
    selected = row;
    selectedFetchedAt = rowFetchedAt;
  }

  return selected;
}

export function withShadow(row: SignalEvidenceRow, shadow: boolean): SignalEvidenceRow {
  return { ...row, shadow };
}

export async function runWithTregTimeout<T>(
  task: (signal: AbortSignal) => Promise<T>,
  timeoutMs = TREG_FALLBACK_TIMEOUT_MS
): Promise<T | null> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const taskPromise = task(controller.signal).catch(() => null);
  const timeoutPromise = new Promise<null>((resolve) => {
    timeout = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, timeoutMs);
  });

  try {
    return await Promise.race([taskPromise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function resolveTregSignalRow(input: {
  key: string;
  domain: string;
  primaryStatus: SignalStatus | undefined;
  attempts: readonly SignalEvidenceRow[];
  buildRow: (signal: SignalResult, source: string) => SignalEvidenceRow;
  now?: Date;
  freshnessMs: number;
}): Promise<SignalEvidenceRow | null> {
  if (!isTregFallbackEnabled() || !isTregSignalKey(input.key)) return null;
  if (!shouldFallBackToTreg(input.primaryStatus)) return null;

  const shadow = !isTregSignalPromoted(input.key);
  const reusable = findFreshTregRow(
    input.attempts,
    (input.now ?? new Date()).getTime(),
    input.freshnessMs
  );
  if (reusable) return withShadow(reusable, shadow);

  const signal = await runWithTregTimeout((abortSignal) =>
    fetchTregFallbackSignal(input.key, input.domain, abortSignal)
  );
  if (!signal?.source) return null;
  return withShadow(input.buildRow(signal, signal.source), shadow);
}

export async function resolveTregFirmographicsRow(input: {
  domain: string;
  primaryStatus: SignalStatus | undefined;
  attempts: readonly SignalEvidenceRow[];
  buildRow: (result: TregFirmographicsResult) => SignalEvidenceRow;
  now?: Date;
  freshnessMs: number;
}): Promise<SignalEvidenceRow | null> {
  if (!isTregFallbackEnabled() || !shouldFallBackToTreg(input.primaryStatus)) return null;

  const shadow = !isTregSignalPromoted("firmographics");
  const reusable = findFreshTregRow(
    input.attempts,
    (input.now ?? new Date()).getTime(),
    input.freshnessMs
  );
  if (reusable) return withShadow(reusable, shadow);

  const result = await runWithTregTimeout((abortSignal) =>
    fetchTregFirmographics(input.domain, abortSignal)
  );
  return result ? withShadow(input.buildRow(result), shadow) : null;
}
