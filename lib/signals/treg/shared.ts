import type { SignalResult, SignalStatus } from "@/lib/types";
import type { TregCallResult, TregFailureReason } from "@/lib/treg";

export const TREG_AVIATO_SOURCE = "treg-aviato";
export const TREG_PREDICTLEADS_SOURCE = "treg-predictleads";
export const TREG_AKTA_SOURCE = "treg-akta";
export const TREG_HUNTER_SOURCE = "treg-hunter";

type TregFailureResult = Extract<TregCallResult, { ok: false }>;

interface TregFailureSignalParams {
  max: number;
  source: string;
  detail: string;
  result: TregFailureResult;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function tregFailureStatus(reason: TregFailureReason): SignalStatus {
  return reason === "http_404" ? "not_found" : "unavailable";
}

export function tregFailureSignal({
  max,
  source,
  detail,
  result,
}: TregFailureSignalParams): SignalResult {
  return {
    score: 0,
    max,
    detail,
    status: tregFailureStatus(result.reason),
    observed_at: null,
    fetched_at: new Date().toISOString(),
    source,
    evidence: [],
    metadata: {
      reason: result.reason,
      treg_call_id: result.callId,
      treg_cost_micro: result.costMicro,
    },
  };
}

export function withTregMetadata(
  signal: SignalResult,
  call: { callId: string | null; costMicro: number | null },
  fallbackFor: string,
): SignalResult {
  return {
    ...signal,
    metadata: {
      ...signal.metadata,
      treg_call_id: call.callId,
      treg_cost_micro: call.costMicro,
      fallback_for: fallbackFor,
    },
  };
}

export function daysAgoIsoDate(now: Date, days: number): string {
  const date = new Date(now.getTime() - days * 86_400_000);
  return date.toISOString().slice(0, 10);
}
