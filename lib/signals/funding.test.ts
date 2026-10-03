import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchFundingSignal } from "./funding";

const NOW = new Date("2026-07-15T12:00:00.000Z");

describe("fetchFundingSignal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.stubEnv("EXPLORIUM_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("uses the actual latest-round date as observed_at", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ matched_businesses: [{ business_id: "biz_1" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            known_funding_total_value: 22_000_000,
            last_funding_round_date: "2026-06-03",
            last_funding_round_type: "Series B",
            number_of_funding_rounds: 3,
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchFundingSignal("acme.com");

    expect(result.status).toBe("ok");
    expect(result.score).toBe(25);
    expect(result.observed_at).toBe("2026-06-03T00:00:00.000Z");
    expect(result.source).toBe("explorium");
    expect(result.evidence?.[0]).toMatchObject({
      observed_at: result.observed_at,
      fetched_at: NOW.toISOString(),
      source: "explorium",
    });
  });

  it("does not turn undated historical funding into fresh intent", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ matched_businesses: [{ business_id: "biz_1" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          known_funding_total_value: 100_000_000,
          number_of_funding_rounds: 8,
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchFundingSignal("acme.com");

    expect(result.status).toBe("no_signal");
    expect(result.score).toBe(0);
    expect(result.observed_at).toBeNull();
    expect(result.detail).toContain("latest round date unavailable");
  });

  it("does not score a future-dated funding event as fresh intent", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ matched_businesses: [{ business_id: "biz_1" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          known_funding_total_value: 50_000_000,
          last_funding_round_date: "2099-01-01T00:00:00.000Z",
          last_funding_round_type: "Series B",
          number_of_funding_rounds: 2,
        }),
      }));

    const result = await fetchFundingSignal("acme.com");

    expect(result).toMatchObject({
      status: "no_signal",
      score: 0,
      observed_at: null,
      source: "explorium",
    });
    expect(result.evidence).toEqual([]);
  });

  it("distinguishes an unmatched company from a provider outage", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ matched_businesses: [] }),
    }));

    const result = await fetchFundingSignal("missing.example");

    expect(result.status).toBe("not_found");
    expect(result.score).toBe(0);
  });
});

describe("scoreFundingRounds", () => {
  it("stamps a custom source on capped recent round evidence", async () => {
    const { scoreFundingRounds } = await import("./funding");

    const result = scoreFundingRounds({
      lastRoundDate: "2026-06-15T12:00:00.000Z",
      roundType: "Seed",
      totalValue: 15_000_000,
      rounds: 3,
    }, NOW, NOW.toISOString(), "treg-aviato");

    expect(result).toMatchObject({
      status: "ok",
      score: 25,
      observed_at: "2026-06-15T12:00:00.000Z",
      source: "treg-aviato",
      detail: "Seed closed 30d ago; 3 funding rounds",
    });
    expect(result.evidence).toHaveLength(1);
    expect(result.evidence?.[0]).toMatchObject({
      source: "treg-aviato",
      observed_at: "2026-06-15T12:00:00.000Z",
      fetched_at: NOW.toISOString(),
      metadata: {
        age_days: 30,
        total_funding_value: 15_000_000,
        funding_rounds: 3,
      },
    });
  });

  it("keeps undated historical totals as no-signal context", async () => {
    const { scoreFundingRounds } = await import("./funding");

    const result = scoreFundingRounds({
      totalValue: 100_000_000,
      rounds: 4,
    }, NOW, NOW.toISOString());

    expect(result).toMatchObject({
      status: "no_signal",
      score: 0,
      observed_at: null,
      source: "explorium",
      detail: "$100M total raised; latest round date unavailable",
      metadata: {
        total_funding_value: 100_000_000,
        funding_rounds: 4,
      },
    });
    expect(result.evidence).toEqual([]);
  });

  it("treats an invalid round date as no-signal", async () => {
    const { scoreFundingRounds } = await import("./funding");

    const result = scoreFundingRounds({
      lastRoundDate: "not-a-date",
      roundType: "Series A",
      totalValue: 0,
      rounds: 2,
    }, NOW, NOW.toISOString());

    expect(result).toMatchObject({
      status: "no_signal",
      score: 0,
      observed_at: null,
      detail: "No recent funding activity detected",
    });
    expect(result.evidence).toEqual([]);
  });
});
