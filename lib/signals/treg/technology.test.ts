import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import technologyFixture from "./__fixtures__/predictleads-technology-detections.json";
import { fetchTregTechnologySignal } from "./technology";

interface MockTregResponse {
  ok: boolean;
  status: number;
  headers: Headers;
  json: () => Promise<unknown>;
}

type FetchMock = (input: RequestInfo | URL, init?: RequestInit) => Promise<MockTregResponse>;

const NOW = new Date("2026-10-02T12:00:00.000Z");

function jsonResponse(status: number, data: unknown): MockTregResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({
      "X-Treg-Call-Id": "call_technology",
      "X-Treg-Cost-Micro": "4567",
    }),
    json: async () => data,
  };
}

function daysAgoIso(days: number): string {
  return new Date(NOW.getTime() - days * 86_400_000).toISOString();
}

function technologyPayload(
  name: string,
  score: number,
  firstSeenDaysAgo: number,
  lastSeenDaysAgo: number = 1,
): unknown {
  return {
    data: [{
      id: "det_1",
      type: "technology_detection",
      attributes: {
        first_seen_at: daysAgoIso(firstSeenDaysAgo),
        last_seen_at: daysAgoIso(lastSeenDaysAgo),
        score,
      },
      relationships: {
        technology: {
          data: {
            id: "tech_1",
            type: "technology",
          },
        },
      },
    }],
    included: [{
      id: "tech_1",
      type: "technology",
      attributes: { name },
    }],
  };
}

describe("fetchTregTechnologySignal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.stubEnv("TREG_TOKEN", "test-token");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("returns no_signal for the real PredictLeads fixture when there are no CRM or sales tools", async () => {
    vi.stubGlobal("fetch", vi.fn<FetchMock>().mockResolvedValue(jsonResponse(200, technologyFixture)));

    const result = await fetchTregTechnologySignal("stripe.com");

    expect(result).toMatchObject({
      status: "no_signal",
      score: 0,
      source: "treg-predictleads",
      metadata: {
        active_tools: [],
        fallback_for: "builtwith",
      },
    });
  });

  it("scores a recent high-confidence Salesforce adoption", async () => {
    vi.stubGlobal("fetch", vi.fn<FetchMock>().mockResolvedValue(jsonResponse(200, technologyPayload(
      "Salesforce",
      0.75,
      10,
    ))));

    const result = await fetchTregTechnologySignal("acme.com");

    expect(result).toMatchObject({
      status: "ok",
      score: 15,
      observed_at: "2026-09-22T12:00:00.000Z",
      source: "treg-predictleads",
    });
    expect(result.evidence?.[0]).toMatchObject({
      label: "Adopted Salesforce",
      source: "treg-predictleads",
    });
  });

  it("drops low-confidence technology detections", async () => {
    vi.stubGlobal("fetch", vi.fn<FetchMock>().mockResolvedValue(jsonResponse(200, technologyPayload(
      "Salesforce",
      0.25,
      10,
    ))));

    const result = await fetchTregTechnologySignal("acme.com");

    expect(result).toMatchObject({
      status: "no_signal",
      score: 0,
      observed_at: null,
    });
  });

  it("does not turn stale PredictLeads last_seen_at into a removed migration signal", async () => {
    vi.stubGlobal("fetch", vi.fn<FetchMock>().mockResolvedValue(jsonResponse(200, technologyPayload(
      "HubSpot",
      0.9,
      200,
      200,
    ))));

    const result = await fetchTregTechnologySignal("acme.com");

    expect(result.score).toBe(0);
    expect(result.detail).not.toContain("Removed");
    expect(JSON.stringify(result.evidence)).not.toContain("Removed");
  });

  it("skips detections whose technology id cannot be resolved", async () => {
    vi.stubGlobal("fetch", vi.fn<FetchMock>().mockResolvedValue(jsonResponse(200, {
      data: [{
        attributes: {
          first_seen_at: daysAgoIso(10),
          last_seen_at: daysAgoIso(1),
          score: 0.9,
        },
        relationships: {
          technology: {
            data: { id: "missing_tech" },
          },
        },
      }],
      included: [],
    })));

    const result = await fetchTregTechnologySignal("acme.com");

    expect(result).toMatchObject({
      status: "no_signal",
      score: 0,
      observed_at: null,
    });
  });

  it("maps Treg 404 technology failures to not_found", async () => {
    vi.stubGlobal("fetch", vi.fn<FetchMock>().mockResolvedValue(jsonResponse(404, {
      error: "missing",
    })));

    const result = await fetchTregTechnologySignal("missing.example");

    expect(result).toMatchObject({
      status: "not_found",
      score: 0,
      detail: "Technology data unavailable",
      metadata: { reason: "http_404" },
    });
  });
});
