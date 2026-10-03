import { describe, expect, it } from "vitest";

import type { SignalResult } from "@/lib/types";
import {
  daysAgoIsoDate,
  isRecord,
  tregFailureSignal,
  tregFailureStatus,
  withTregMetadata,
} from "./shared";

describe("treg shared mapper helpers", () => {
  it("narrows plain objects without accepting arrays or null", () => {
    expect(isRecord({ ok: true })).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(isRecord("value")).toBe(false);
  });

  it("formats UTC date-only strings for lookback windows", () => {
    const result = daysAgoIsoDate(new Date("2026-10-02T01:30:00.000Z"), 90);

    expect(result).toBe("2026-07-04");
  });

  it("maps Treg 404 failures to not_found and all other reasons to unavailable", () => {
    expect(tregFailureStatus("http_404")).toBe("not_found");
    expect(tregFailureStatus("missing_api_key")).toBe("unavailable");
    expect(tregFailureStatus("network_error")).toBe("unavailable");
  });

  it("builds a zero-score failure signal with Treg charge metadata", () => {
    const result = tregFailureSignal({
      max: 25,
      source: "treg-aviato",
      detail: "Funding data unavailable",
      result: {
        ok: false,
        status: 404,
        reason: "http_404",
        callId: "call_123",
        costMicro: 456,
      },
    });

    expect(result).toMatchObject({
      score: 0,
      max: 25,
      status: "not_found",
      observed_at: null,
      source: "treg-aviato",
      evidence: [],
      metadata: {
        reason: "http_404",
        treg_call_id: "call_123",
        treg_cost_micro: 456,
      },
    });
    expect(result.fetched_at).toBeDefined();
  });

  it("merges Treg metadata into a new signal object without mutating the input", () => {
    const signal: SignalResult = {
      score: 5,
      max: 20,
      detail: "context",
      metadata: { existing: true },
    };

    const result = withTregMetadata(signal, {
      callId: "call_456",
      costMicro: 789,
    }, "gnews");

    expect(result).not.toBe(signal);
    expect(result.metadata).toEqual({
      existing: true,
      treg_call_id: "call_456",
      treg_cost_micro: 789,
      fallback_for: "gnews",
    });
    expect(signal.metadata).toEqual({ existing: true });
  });
});
