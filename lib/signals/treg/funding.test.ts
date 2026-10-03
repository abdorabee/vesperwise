import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import fundingFixture from "./__fixtures__/aviato-funding-rounds.json";
import { fetchTregFundingSignal } from "./funding";

interface MockTregResponse {
  ok: boolean;
  status: number;
  headers: Headers;
  json: () => Promise<unknown>;
}

type FetchMock = (input: RequestInfo | URL, init?: RequestInit) => Promise<MockTregResponse>;

function jsonResponse(status: number, data: unknown): MockTregResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({
      "X-Treg-Call-Id": "call_funding",
      "X-Treg-Cost-Micro": "2345",
    }),
    json: async () => data,
  };
}

function getFetchUrl(fetchMock: ReturnType<typeof vi.fn<FetchMock>>): URL {
  return new URL(String(fetchMock.mock.calls[0]?.[0]));
}

function getFetchHeaders(fetchMock: ReturnType<typeof vi.fn<FetchMock>>): Headers {
  return new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
}

describe("fetchTregFundingSignal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2023-05-10T00:00:00.000Z"));
    vi.stubEnv("TREG_TOKEN", "test-token");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("scores the latest valid Aviato round even when rounds are not sorted", async () => {
    const fetchMock = vi.fn<FetchMock>().mockResolvedValue(jsonResponse(200, fundingFixture));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchTregFundingSignal("stripe.com");

    expect(result).toMatchObject({
      status: "ok",
      score: 25,
      source: "treg-aviato",
      observed_at: "2023-04-25T00:00:00.000Z",
      metadata: {
        last_funding_round_type: "Grant",
        funding_rounds: 19,
        treg_call_id: "call_funding",
        treg_cost_micro: 2345,
        fallback_for: "explorium",
      },
    });
    expect(result.detail).toContain("Grant closed 15d ago");
    expect(result.evidence?.[0]).toMatchObject({
      source: "treg-aviato",
      metadata: {
        funding_rounds: 19,
      },
    });
  });

  it("keeps old funding as historical context when the latest round is stale", async () => {
    vi.setSystemTime(new Date("2026-10-02T12:00:00.000Z"));
    vi.stubGlobal("fetch", vi.fn<FetchMock>().mockResolvedValue(jsonResponse(200, fundingFixture)));

    const result = await fetchTregFundingSignal("stripe.com");

    expect(result).toMatchObject({
      status: "ok",
      score: 10,
      source: "treg-aviato",
      metadata: {
        funding_rounds: 19,
      },
    });
  });

  it("returns no_signal for an empty Aviato funding response", async () => {
    vi.stubGlobal("fetch", vi.fn<FetchMock>().mockResolvedValue(jsonResponse(200, {
      fundingRounds: [],
    })));

    const result = await fetchTregFundingSignal("empty.example");

    expect(result).toMatchObject({
      status: "no_signal",
      score: 0,
      observed_at: null,
      source: "treg-aviato",
      metadata: {
        funding_rounds: 0,
        fallback_for: "explorium",
      },
    });
  });

  it("maps Treg 404 funding failures to not_found", async () => {
    vi.stubGlobal("fetch", vi.fn<FetchMock>().mockResolvedValue(jsonResponse(404, {
      error: "missing",
    })));

    const result = await fetchTregFundingSignal("missing.example");

    expect(result).toMatchObject({
      status: "not_found",
      score: 0,
      detail: "Funding data unavailable",
      metadata: {
        reason: "http_404",
        treg_call_id: "call_funding",
        treg_cost_micro: 2345,
      },
    });
  });

  it("returns unavailable without fetching when the Treg token is missing", async () => {
    vi.stubEnv("TREG_TOKEN", "");
    const fetchMock = vi.fn<FetchMock>();
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchTregFundingSignal("stripe.com");

    expect(result).toMatchObject({
      status: "unavailable",
      score: 0,
      metadata: { reason: "missing_api_key" },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the Aviato endpoint, query, max-cost, meta header, and abort signal through callTreg", async () => {
    const fetchMock = vi.fn<FetchMock>().mockResolvedValue(jsonResponse(200, fundingFixture));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    await fetchTregFundingSignal("stripe.com", controller.signal);

    const url = getFetchUrl(fetchMock);
    const headers = getFetchHeaders(fetchMock);
    expect(`${url.origin}${url.pathname}`).toBe("https://treg.to/call/aviato.companies.funding_rounds");
    expect(url.searchParams.get("website")).toBe("stripe.com");
    expect(url.searchParams.get("perPage")).toBe("100");
    expect(url.searchParams.get("page")).toBe("0");
    expect(headers.get("X-Treg-Route-Max-Cost")).toBe("0.02");
    expect(headers.get("X-Treg-Meta")).toBe("feature=score, signal=funding");
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
  });

  it("fails closed when the Aviato payload is not an object", async () => {
    vi.stubGlobal("fetch", vi.fn<FetchMock>().mockResolvedValue(jsonResponse(200, null)));

    const result = await fetchTregFundingSignal("stripe.com");

    expect(result).toMatchObject({
      status: "unavailable",
      score: 0,
      metadata: {
        reason: "unexpected_payload",
        fallback_for: "explorium",
      },
    });
  });
});
