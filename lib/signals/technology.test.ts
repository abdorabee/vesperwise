import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTechnologySignal, scoreTechnologyChanges } from "./technology";

const NOW = new Date("2026-07-15T12:00:00.000Z");
const epochDaysAgo = (days: number) => Math.floor((NOW.getTime() - days * 86_400_000) / 1000);

describe("scoreTechnologyChanges", () => {
  it("scores a newly adopted relevant technology from FirstDetected", () => {
    const result = scoreTechnologyChanges([
      { Name: "HubSpot", FirstDetected: epochDaysAgo(20), LastDetected: epochDaysAgo(1) },
    ], NOW);

    expect(result.score).toBe(15);
    expect(result.observedAt).toBe("2026-06-25T12:00:00.000Z");
    expect(result.evidence[0]).toMatchObject({
      source: "builtwith",
      fetched_at: NOW.toISOString(),
      metadata: { change: "adopted", points: 15 },
    });
  });

  it("deduplicates the same technology across BuiltWith paths", () => {
    const result = scoreTechnologyChanges([
      { Name: "Salesforce", FirstDetected: epochDaysAgo(10), LastDetected: epochDaysAgo(2) },
      { Name: "salesforce", FirstDetected: epochDaysAgo(8), LastDetected: epochDaysAgo(1) },
    ], NOW);

    expect(result.score).toBe(15);
    expect(result.evidence).toHaveLength(1);
    expect(result.observedAt).toBe("2026-07-05T12:00:00.000Z");
  });

  it("dates a removal proxy from LastDetected", () => {
    const result = scoreTechnologyChanges([
      { Name: "Pipedrive", FirstDetected: epochDaysAgo(500), LastDetected: epochDaysAgo(120) },
    ], NOW);

    expect(result.score).toBe(10);
    expect(result.observedAt).toBe("2026-03-17T12:00:00.000Z");
    expect(result.evidence[0]?.metadata).toMatchObject({ change: "removed", points: 10 });
  });

  it("keeps stable tools as context rather than intent", () => {
    const result = scoreTechnologyChanges([
      { Name: "Intercom", FirstDetected: epochDaysAgo(500), LastDetected: epochDaysAgo(2) },
      { Name: "Unrelated Framework", FirstDetected: epochDaysAgo(2), LastDetected: epochDaysAgo(1) },
    ], NOW);

    expect(result.score).toBe(0);
    expect(result.observedAt).toBeNull();
    expect(result.activeTools).toEqual(["Intercom"]);
    expect(result.evidence).toEqual([]);
  });
});

describe("fetchTechnologySignal", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("does not turn Free API category aggregates into zero intent", async () => {
    vi.stubEnv("BUILTWITH_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        domain: "acme.com",
        groups: [{
          name: "analytics",
          categories: [{ name: "Analytics" }],
        }],
      }),
    }));

    const result = await fetchTechnologySignal("acme.com");

    expect(result).toMatchObject({
      status: "unavailable",
      score: 0,
      detail: "Technology data unavailable",
      observed_at: null,
      source: "builtwith",
      metadata: {
        reason: "insufficient_provider_detail",
        provider_schema: "free1",
      },
    });
    expect(result.detail).not.toMatch(/BuiltWith/);
  });
});

describe("buildTechnologySignal", () => {
  it("stamps a custom source on the technology signal and evidence", async () => {
    const { buildTechnologySignal } = await import("./technology");

    const result = buildTechnologySignal([
      { Name: "HubSpot", FirstDetected: epochDaysAgo(20), LastDetected: epochDaysAgo(1) },
    ], NOW, NOW.toISOString(), "treg-predictleads");

    expect(result).toMatchObject({
      status: "ok",
      score: 15,
      source: "treg-predictleads",
      observed_at: "2026-06-25T12:00:00.000Z",
    });
    expect(result.evidence).toHaveLength(1);
    expect(result.evidence?.[0]).toMatchObject({
      source: "treg-predictleads",
      fetched_at: NOW.toISOString(),
    });
  });

  it("returns the fallback no-signal result for an empty technology list", async () => {
    const { buildTechnologySignal } = await import("./technology");

    const result = buildTechnologySignal([], NOW, NOW.toISOString());

    expect(result).toMatchObject({
      status: "no_signal",
      score: 0,
      observed_at: null,
      source: "builtwith",
      detail: "No dated tech stack changes detected",
      metadata: { active_tools: [] },
    });
    expect(result.evidence).toEqual([]);
  });
});
