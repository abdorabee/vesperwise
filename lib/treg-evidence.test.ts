import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SignalEvidenceRow } from "./score-evidence";
import type { SignalResult, SignalStatus } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  fetchTregFallbackSignal: vi.fn(),
  fetchTregFirmographics: vi.fn(),
}));

vi.mock("@/lib/signals/treg", () => ({
  fetchTregFallbackSignal: mocks.fetchTregFallbackSignal,
  fetchTregFirmographics: mocks.fetchTregFirmographics,
}));

import {
  findFreshTregRow,
  resolveTregFirmographicsRow,
  resolveTregSignalRow,
  runWithTregTimeout,
} from "./treg-evidence";

const NOW = new Date("2026-10-02T12:00:00.000Z");
const FRESHNESS_MS = 6 * 60 * 60 * 1000;

function signal(overrides: Partial<SignalResult> = {}): SignalResult {
  const status = overrides.status ?? "ok";
  return {
    score: status === "ok" ? 20 : 0,
    max: 25,
    detail: `${overrides.source ?? "treg-aviato"} ${status}`,
    status,
    observed_at: status === "ok" ? "2026-10-01T00:00:00.000Z" : null,
    fetched_at: NOW.toISOString(),
    source: "treg-aviato",
    evidence: [],
    ...overrides,
  };
}

function row(overrides: Partial<SignalEvidenceRow> = {}): SignalEvidenceRow {
  const source = overrides.source ?? "treg-aviato";
  const status = overrides.status ?? "ok";
  const fetchedAt = overrides.fetched_at ?? NOW.toISOString();
  return {
    canonical_domain: "acme.com",
    signal_type: "funding",
    source,
    schema_version: "signal-evidence-v1",
    status,
    observed_at: status === "ok" ? "2026-10-01T00:00:00.000Z" : null,
    fetched_at: fetchedAt,
    expires_at: "2026-10-09T12:00:00.000Z",
    evidence: [],
    raw_payload: signal({ source, status, fetched_at: fetchedAt }),
    shadow: false,
    ...overrides,
  };
}

function buildRow(result: SignalResult, source: string): SignalEvidenceRow {
  return row({
    source,
    status: result.status ?? "ok",
    observed_at: result.observed_at ?? null,
    fetched_at: result.fetched_at ?? NOW.toISOString(),
    evidence: result.evidence ?? [],
    raw_payload: result,
  });
}

async function resolveFunding(primaryStatus: SignalStatus | undefined, attempts: SignalEvidenceRow[] = []) {
  return resolveTregSignalRow({
    key: "funding",
    domain: "acme.com",
    primaryStatus,
    attempts,
    buildRow,
    now: NOW,
    freshnessMs: FRESHNESS_MS,
  });
}

describe("treg signal evidence orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("MOCK_SIGNALS", "false");
    vi.stubEnv("TREG_TOKEN", "");
    vi.stubEnv("TREG_FALLBACK_SHADOW_MODE", "");
    vi.stubEnv("TREG_PROMOTED_SIGNALS", "");
    mocks.fetchTregFallbackSignal.mockResolvedValue(signal());
    mocks.fetchTregFirmographics.mockResolvedValue({
      status: "ok",
      industry: "Software",
      employeeRange: "51-200",
      callId: "call-1",
      costMicro: 100,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not call treg when fallback is disabled by a missing token", async () => {
    const result = await resolveFunding("unavailable");

    expect(result).toBeNull();
    expect(mocks.fetchTregFallbackSignal).not.toHaveBeenCalled();
  });

  it("does not call treg when mock signals are enabled", async () => {
    vi.stubEnv("TREG_TOKEN", "token");
    vi.stubEnv("MOCK_SIGNALS", "true");

    const result = await resolveFunding("unavailable");

    expect(result).toBeNull();
    expect(mocks.fetchTregFallbackSignal).not.toHaveBeenCalled();
  });

  it.each(["ok", "no_signal"] as const)(
    "does not call treg when the primary status is %s",
    async (status) => {
      vi.stubEnv("TREG_TOKEN", "token");

      const result = await resolveFunding(status);

      expect(result).toBeNull();
      expect(mocks.fetchTregFallbackSignal).not.toHaveBeenCalled();
    }
  );

  it.each(["unavailable", "not_found"] as const)(
    "calls treg when the primary status is %s",
    async (status) => {
      vi.stubEnv("TREG_TOKEN", "token");

      const result = await resolveFunding(status);

      expect(result?.source).toBe("treg-aviato");
      expect(mocks.fetchTregFallbackSignal).toHaveBeenCalledWith(
        "funding",
        "acme.com",
        expect.any(AbortSignal)
      );
    }
  );

  it.each(["web", "github", "web_activity"] as const)(
    "does not call treg for unsupported signal key %s",
    async (key) => {
      vi.stubEnv("TREG_TOKEN", "token");

      const result = await resolveTregSignalRow({
        key,
        domain: "acme.com",
        primaryStatus: "unavailable",
        attempts: [],
        buildRow,
        now: NOW,
        freshnessMs: FRESHNESS_MS,
      });

      expect(result).toBeNull();
      expect(mocks.fetchTregFallbackSignal).not.toHaveBeenCalled();
    }
  );

  it("reuses a fresh shadow treg row without calling treg", async () => {
    vi.stubEnv("TREG_TOKEN", "token");
    const existing = row({ shadow: true });

    const result = await resolveFunding("unavailable", [existing]);

    expect(result).toEqual(existing);
    expect(result).not.toBe(existing);
    expect(mocks.fetchTregFallbackSignal).not.toHaveBeenCalled();
  });

  it("calls treg when the existing treg row is stale", async () => {
    vi.stubEnv("TREG_TOKEN", "token");
    const stale = row({ fetched_at: new Date(NOW.getTime() - FRESHNESS_MS - 1).toISOString() });

    const result = await resolveFunding("unavailable", [stale]);

    expect(result?.fetched_at).toBe(NOW.toISOString());
    expect(mocks.fetchTregFallbackSignal).toHaveBeenCalledTimes(1);
  });

  it("calls treg when the fresh treg row has a failed status", async () => {
    vi.stubEnv("TREG_TOKEN", "token");
    const failed = row({ status: "unavailable", shadow: true });

    const result = await resolveFunding("unavailable", [failed]);

    expect(result?.status).toBe("ok");
    expect(mocks.fetchTregFallbackSignal).toHaveBeenCalledTimes(1);
  });

  it("keeps fetched treg rows shadowed by default", async () => {
    vi.stubEnv("TREG_TOKEN", "token");

    const result = await resolveFunding("unavailable");

    expect(result?.shadow).toBe(true);
  });

  it("marks fetched treg rows non-shadow only when the key is promoted", async () => {
    vi.stubEnv("TREG_TOKEN", "token");
    vi.stubEnv("TREG_FALLBACK_SHADOW_MODE", "false");
    vi.stubEnv("TREG_PROMOTED_SIGNALS", "funding");

    const result = await resolveFunding("unavailable");

    expect(result?.shadow).toBe(false);
  });

  it("recomputes a reused row shadow flag without mutating the original row", async () => {
    vi.stubEnv("TREG_TOKEN", "token");
    vi.stubEnv("TREG_FALLBACK_SHADOW_MODE", "false");
    vi.stubEnv("TREG_PROMOTED_SIGNALS", "funding");
    const existing = row({ shadow: true });

    const result = await resolveFunding("unavailable", [existing]);

    expect(result?.shadow).toBe(false);
    expect(existing.shadow).toBe(true);
    expect(result).not.toBe(existing);
    expect(mocks.fetchTregFallbackSignal).not.toHaveBeenCalled();
  });

  it("returns null when the treg task times out", async () => {
    const result = await runWithTregTimeout(
      () => new Promise((resolve) => setTimeout(() => resolve("late"), 50)),
      5
    );

    expect(result).toBeNull();
  });

  it("returns null when the treg task throws", async () => {
    const result = await runWithTregTimeout(async () => {
      throw new Error("treg failed");
    });

    expect(result).toBeNull();
  });

  it("ignores non-treg sources when finding reusable rows", () => {
    const result = findFreshTregRow(
      [row({ source: "explorium", shadow: true })],
      NOW.getTime(),
      FRESHNESS_MS
    );

    expect(result).toBeNull();
  });

  it("uses Hunter firmographics only when the Explorium status can fall back", async () => {
    vi.stubEnv("TREG_TOKEN", "token");

    const result = await resolveTregFirmographicsRow({
      domain: "acme.com",
      primaryStatus: "unavailable",
      attempts: [],
      buildRow: (firmographics) => row({
        signal_type: "firmographics",
        source: "treg-hunter",
        status: firmographics.status,
        raw_payload: firmographics,
      }),
      now: NOW,
      freshnessMs: FRESHNESS_MS,
    });

    expect(result?.source).toBe("treg-hunter");
    expect(result?.shadow).toBe(true);
    expect(mocks.fetchTregFirmographics).toHaveBeenCalledWith("acme.com", expect.any(AbortSignal));
  });
});
