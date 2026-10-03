import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SignalEvidenceRow } from "./score-evidence";
import type { SignalResult, SignalStatus } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  fetchFundingSignal: vi.fn(),
  fetchHiringSignal: vi.fn(),
  fetchNewsSignal: vi.fn(),
  fetchTechnologySignal: vi.fn(),
  fetchWebSignal: vi.fn(),
  fetchGitHubSignal: vi.fn(),
  fetchTregFallbackSignal: vi.fn(),
  fetchTregFirmographics: vi.fn(),
}));

vi.mock("@/lib/cache", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/cache")>();
  return {
    ...actual,
    cacheGet: mocks.cacheGet,
    cacheSet: mocks.cacheSet,
  };
});

vi.mock("@/lib/signals/funding", () => ({ fetchFundingSignal: mocks.fetchFundingSignal }));
vi.mock("@/lib/signals/hiring", () => ({ fetchHiringSignal: mocks.fetchHiringSignal }));
vi.mock("@/lib/signals/news", () => ({ fetchNewsSignal: mocks.fetchNewsSignal }));
vi.mock("@/lib/signals/technology", () => ({ fetchTechnologySignal: mocks.fetchTechnologySignal }));
vi.mock("@/lib/signals/web", () => ({ fetchWebSignal: mocks.fetchWebSignal }));
vi.mock("@/lib/signals/github", () => ({ fetchGitHubSignal: mocks.fetchGitHubSignal }));
vi.mock("@/lib/signals/treg", () => ({
  fetchTregFallbackSignal: mocks.fetchTregFallbackSignal,
  fetchTregFirmographics: mocks.fetchTregFirmographics,
  TREG_HUNTER_SOURCE: "treg-hunter",
}));

const NOW = "2026-10-02T12:00:00.000Z";

type QueryResult = { data: SignalEvidenceRow[]; error: null };

interface QueryDouble extends PromiseLike<QueryResult> {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  gt: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
}

function sourceFor(key: string): string {
  if (key === "funding") return "explorium";
  if (key === "hiring") return "explorium-events";
  if (key === "news") return "gnews";
  if (key === "technology") return "builtwith";
  if (key === "web") return "open-page-rank";
  if (key === "github") return "github";
  return "firecrawl";
}

function maxFor(key: string): number {
  if (key === "funding") return 25;
  if (key === "web_activity" || key === "web") return 15;
  return 20;
}

function signal(key: string, overrides: Partial<SignalResult> = {}): SignalResult {
  const status = overrides.status ?? "ok";
  return {
    score: status === "ok" ? 5 : 0,
    max: maxFor(key),
    detail: `${key} ${status}`,
    status,
    observed_at: status === "ok" ? "2026-10-01T00:00:00.000Z" : null,
    fetched_at: NOW,
    source: sourceFor(key),
    evidence: [],
    metadata: {},
    ...overrides,
  };
}

function evidenceRow(overrides: Partial<SignalEvidenceRow> = {}): SignalEvidenceRow {
  const signalType = overrides.signal_type ?? "funding";
  const source = overrides.source ?? sourceFor(signalType);
  const status = overrides.status ?? "ok";
  const fetchedAt = overrides.fetched_at ?? NOW;
  return {
    canonical_domain: "acme.com",
    signal_type: signalType,
    source,
    schema_version: "signal-evidence-v1",
    status,
    observed_at: status === "ok" ? "2026-10-01T00:00:00.000Z" : null,
    fetched_at: fetchedAt,
    expires_at: "2026-10-09T12:00:00.000Z",
    evidence: [],
    raw_payload: signal(signalType, { source, status, fetched_at: fetchedAt }),
    shadow: false,
    ...overrides,
  };
}

function queryFor(rows: SignalEvidenceRow[]): QueryDouble {
  const result: QueryResult = { data: rows, error: null };
  const query = {} as QueryDouble;
  query.select = vi.fn(() => query);
  query.eq = vi.fn(() => query);
  query.in = vi.fn(() => query);
  query.gt = vi.fn(() => query);
  query.order = vi.fn(() => query);
  query.then = (onfulfilled, onrejected) => Promise.resolve(result).then(onfulfilled, onrejected);
  return query;
}

function supabaseFor(rows: SignalEvidenceRow[]) {
  return {
    from: vi.fn((table: string) => {
      expect(table).toBe("signal_evidence");
      return queryFor(rows);
    }),
  };
}

async function snapshotFor(rows: SignalEvidenceRow[] = []) {
  const { getEvidenceSnapshot } = await import("./score-service");
  return getEvidenceSnapshot(
    supabaseFor(rows) as unknown as Parameters<typeof getEvidenceSnapshot>[0],
    "acme.com"
  );
}

function withoutFetchedAt(result: SignalResult): Omit<SignalResult, "fetched_at"> {
  const { fetched_at, ...rest } = result;
  void fetched_at;
  return rest;
}

function setPrimaryFunding(status: SignalStatus): void {
  mocks.fetchFundingSignal.mockResolvedValue(signal("funding", {
    status,
    score: status === "ok" ? 5 : 0,
    observed_at: status === "ok" ? "2026-10-01T00:00:00.000Z" : null,
    metadata: { primary: true },
  }));
}

describe("getEvidenceSnapshot treg fallback integration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    // Freshness is measured against the clock, so pin it to the fixture time.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(NOW));
    vi.stubEnv("MOCK_SIGNALS", "false");
    vi.stubEnv("TREG_TOKEN", "");
    vi.stubEnv("TREG_FALLBACK_SHADOW_MODE", "");
    vi.stubEnv("TREG_PROMOTED_SIGNALS", "");
    mocks.cacheGet.mockResolvedValue(null);
    mocks.cacheSet.mockResolvedValue(undefined);
    setPrimaryFunding("unavailable");
    mocks.fetchHiringSignal.mockResolvedValue(signal("hiring"));
    mocks.fetchNewsSignal.mockResolvedValue(signal("news", { status: "no_signal", score: 0 }));
    mocks.fetchTechnologySignal.mockResolvedValue(signal("technology", { status: "no_signal", score: 0 }));
    mocks.fetchWebSignal.mockResolvedValue(signal("web", { status: "no_signal", score: 0 }));
    mocks.fetchGitHubSignal.mockResolvedValue(signal("github", { status: "no_signal", score: 0 }));
    mocks.fetchTregFallbackSignal.mockResolvedValue(signal("funding", {
      source: "treg-aviato",
      status: "ok",
      score: 20,
      metadata: { fallback_for: "explorium" },
    }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("does not call treg without a token and matches the primary-only baseline", async () => {
    const snapshot = await snapshotFor();

    expect(mocks.fetchTregFallbackSignal).not.toHaveBeenCalled();
    expect(snapshot.rows.some((row) => row.source.startsWith("treg-"))).toBe(false);
    expect(snapshot.signals.funding).toMatchObject({
      status: "unavailable",
      source: "explorium",
      metadata: { primary: true },
    });
  });

  it("persists shadow treg evidence without changing the resolved funding signal", async () => {
    const baseline = await snapshotFor();
    vi.resetModules();
    mocks.fetchTregFallbackSignal.mockClear();
    vi.stubEnv("TREG_TOKEN", "token");

    const snapshot = await snapshotFor();
    const tregRow = snapshot.rows.find((row) => row.source === "treg-aviato" && row.signal_type === "funding");

    expect(mocks.fetchTregFallbackSignal).toHaveBeenCalledTimes(1);
    expect(tregRow?.shadow).toBe(true);
    expect(withoutFetchedAt(snapshot.signals.funding)).toEqual(withoutFetchedAt(baseline.signals.funding));
  });

  it("promotes an allowlisted ok treg row into the resolved funding signal", async () => {
    vi.stubEnv("TREG_TOKEN", "token");
    vi.stubEnv("TREG_FALLBACK_SHADOW_MODE", "false");
    vi.stubEnv("TREG_PROMOTED_SIGNALS", "funding");

    const snapshot = await snapshotFor();
    const tregRow = snapshot.rows.find((row) => row.source === "treg-aviato" && row.signal_type === "funding");

    expect(snapshot.signals.funding.score).toBe(20);
    expect(snapshot.signals.funding.metadata?.fallback_source).toBe("treg-aviato");
    expect(tregRow?.shadow).toBe(false);
  });

  it("keeps funding shadowed when promotion lists only another treg key", async () => {
    vi.stubEnv("TREG_TOKEN", "token");
    vi.stubEnv("TREG_FALLBACK_SHADOW_MODE", "false");
    vi.stubEnv("TREG_PROMOTED_SIGNALS", "hiring");

    const snapshot = await snapshotFor();
    const tregRow = snapshot.rows.find((row) => row.source === "treg-aviato" && row.signal_type === "funding");

    expect(snapshot.signals.funding.status).toBe("unavailable");
    expect(tregRow?.shadow).toBe(true);
  });

  it("does not call treg when the primary funding provider returns no_signal", async () => {
    vi.stubEnv("TREG_TOKEN", "token");
    setPrimaryFunding("no_signal");

    const snapshot = await snapshotFor();

    expect(mocks.fetchTregFallbackSignal).not.toHaveBeenCalled();
    expect(snapshot.signals.funding.status).toBe("no_signal");
    expect(snapshot.rows.some((row) => row.source === "treg-aviato")).toBe(false);
  });

  it("reuses a fresh shadow treg row from the database without another treg call", async () => {
    vi.stubEnv("TREG_TOKEN", "token");
    const storedTregRow = evidenceRow({
      source: "treg-aviato",
      status: "ok",
      shadow: true,
      raw_payload: signal("funding", { source: "treg-aviato", status: "ok", score: 20 }),
    });

    const snapshot = await snapshotFor([storedTregRow]);
    const tregRow = snapshot.rows.find((row) => row.source === "treg-aviato" && row.signal_type === "funding");

    expect(mocks.fetchTregFallbackSignal).not.toHaveBeenCalled();
    expect(tregRow).toEqual(storedTregRow);
  });

  it("stops scoring from a stored promoted treg row once the signal is demoted", async () => {
    vi.stubEnv("TREG_TOKEN", "token");
    const storedPromotedRow = evidenceRow({
      source: "treg-aviato",
      status: "ok",
      shadow: false,
      raw_payload: signal("funding", { source: "treg-aviato", status: "ok", score: 20 }),
    });

    const snapshot = await snapshotFor([storedPromotedRow]);
    const tregRow = snapshot.rows.find((row) => row.source === "treg-aviato" && row.signal_type === "funding");

    expect(mocks.fetchTregFallbackSignal).not.toHaveBeenCalled();
    expect(snapshot.signals.funding.status).toBe("unavailable");
    expect(snapshot.signals.funding.source).toBe("explorium");
    expect(tregRow?.shadow).toBe(true);
  });

  it("keeps scoring from a stored promoted treg row while the signal stays promoted", async () => {
    vi.stubEnv("TREG_TOKEN", "token");
    vi.stubEnv("TREG_FALLBACK_SHADOW_MODE", "false");
    vi.stubEnv("TREG_PROMOTED_SIGNALS", "funding");
    const storedPromotedRow = evidenceRow({
      source: "treg-aviato",
      status: "ok",
      shadow: false,
      raw_payload: signal("funding", { source: "treg-aviato", status: "ok", score: 20 }),
    });

    const snapshot = await snapshotFor([storedPromotedRow]);

    expect(mocks.fetchTregFallbackSignal).not.toHaveBeenCalled();
    expect(snapshot.signals.funding.score).toBe(20);
  });

  it("asks treg for hiring when the primary reports no_signal, without changing scores in shadow", async () => {
    vi.stubEnv("TREG_TOKEN", "token");
    mocks.fetchHiringSignal.mockResolvedValue(signal("hiring", { status: "no_signal", score: 0 }));
    mocks.fetchTregFallbackSignal.mockImplementation(async (key: string) =>
      signal(key, { source: "treg-predictleads", status: "ok", score: 20 })
    );

    const snapshot = await snapshotFor();
    const tregRow = snapshot.rows.find((row) => row.source === "treg-predictleads" && row.signal_type === "hiring");

    expect(mocks.fetchTregFallbackSignal).toHaveBeenCalledWith("hiring", "acme.com", expect.anything());
    expect(tregRow?.shadow).toBe(true);
    expect(snapshot.signals.hiring).toMatchObject({ status: "no_signal", score: 0, source: "explorium-events" });
  });

  it("lets promoted treg hiring outrank a primary no_signal", async () => {
    vi.stubEnv("TREG_TOKEN", "token");
    vi.stubEnv("TREG_FALLBACK_SHADOW_MODE", "false");
    vi.stubEnv("TREG_PROMOTED_SIGNALS", "hiring");
    mocks.fetchHiringSignal.mockResolvedValue(signal("hiring", { status: "no_signal", score: 0 }));
    mocks.fetchTregFallbackSignal.mockImplementation(async (key: string) =>
      signal(key, { source: "treg-predictleads", status: "ok", score: 20 })
    );

    const snapshot = await snapshotFor();
    const hiringTregRows = snapshot.rows.filter(
      (row) => row.source === "treg-predictleads" && row.signal_type === "hiring"
    );

    expect(snapshot.signals.hiring.score).toBe(20);
    expect(snapshot.signals.hiring.metadata?.selected_source).toBe("treg-predictleads");
    expect(hiringTregRows).toHaveLength(1);
    expect(hiringTregRows[0].shadow).toBe(false);
  });

  it("does not ask treg for hiring when the primary reports ok", async () => {
    vi.stubEnv("TREG_TOKEN", "token");
    setPrimaryFunding("ok");

    await snapshotFor();

    expect(mocks.fetchTregFallbackSignal).not.toHaveBeenCalled();
  });

  it("keeps resolving when treg throws", async () => {
    vi.stubEnv("TREG_TOKEN", "token");
    mocks.fetchTregFallbackSignal.mockRejectedValue(new Error("provider failed"));

    const snapshot = await snapshotFor();

    expect(snapshot.signals.funding.status).toBe("unavailable");
    expect(snapshot.signals.funding.source).toBe("explorium");
    expect(snapshot.rows.some((row) => row.source === "treg-aviato")).toBe(false);
  });

  it("ignores non-treg shadow rows returned by the broader evidence query", async () => {
    const shadowRow = evidenceRow({
      source: "explorium",
      status: "ok",
      shadow: true,
      raw_payload: signal("funding", { source: "explorium", status: "ok", score: 25 }),
    });

    const snapshot = await snapshotFor([shadowRow]);

    expect(snapshot.signals.funding.status).toBe("unavailable");
    expect(snapshot.signals.funding.score).toBe(0);
    expect(snapshot.rows).not.toContainEqual(shadowRow);
  });
});
