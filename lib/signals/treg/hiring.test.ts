import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import hiringFixture from "./__fixtures__/predictleads-job-openings.json";
import { fetchTregHiringSignal } from "./hiring";

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
      "X-Treg-Call-Id": "call_hiring",
      "X-Treg-Cost-Micro": "3456",
    }),
    json: async () => data,
  };
}

describe("fetchTregHiringSignal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-02T12:00:00.000Z"));
    vi.stubEnv("TREG_TOKEN", "test-token");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("maps PredictLeads job openings without copying descriptions", async () => {
    vi.stubGlobal("fetch", vi.fn<FetchMock>().mockResolvedValue(jsonResponse(200, hiringFixture)));

    const result = await fetchTregHiringSignal("stripe.com");

    expect(result.status).toBe("ok");
    expect(result.score).toBeGreaterThan(0);
    expect(result.source).toBe("treg-predictleads");
    expect(result.evidence?.[0]?.source_url).toBe("https://stripe.com/careers/listing/data-analyst-intern/8194291");
    expect(result.metadata).toMatchObject({
      source: "treg-predictleads",
      unique_job_titles: 3,
      crawler_potentially_blocked: false,
      treg_call_id: "call_hiring",
      treg_cost_micro: 3456,
      fallback_for: "explorium-events",
    });
    expect(JSON.stringify(result)).not.toContain("description");
    expect(JSON.stringify(result)).not.toContain("trimmed");
  });

  it("returns no_signal for an empty PredictLeads job response", async () => {
    vi.stubGlobal("fetch", vi.fn<FetchMock>().mockResolvedValue(jsonResponse(200, {
      data: [],
    })));

    const result = await fetchTregHiringSignal("empty.example");

    expect(result).toMatchObject({
      status: "no_signal",
      score: 0,
      observed_at: null,
      source: "treg-predictleads",
      metadata: {
        total_job_count: 0,
        fallback_for: "explorium-events",
      },
    });
  });

  it("maps Treg 404 hiring failures to not_found", async () => {
    vi.stubGlobal("fetch", vi.fn<FetchMock>().mockResolvedValue(jsonResponse(404, {
      error: "missing",
    })));

    const result = await fetchTregHiringSignal("missing.example");

    expect(result).toMatchObject({
      status: "not_found",
      score: 0,
      detail: "Hiring data unavailable",
      metadata: {
        reason: "http_404",
      },
    });
  });

  it("sends the PredictLeads hiring query with a 90-day date-only window", async () => {
    const fetchMock = vi.fn<FetchMock>().mockResolvedValue(jsonResponse(200, hiringFixture));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    await fetchTregHiringSignal("stripe.com", controller.signal);

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(`${url.origin}${url.pathname}`).toBe("https://treg.to/call/predictleads.companies.job_openings");
    expect(url.searchParams.get("company_id_or_domain")).toBe("stripe.com");
    expect(url.searchParams.get("not_closed")).toBe("true");
    expect(url.searchParams.get("first_seen_at_from")).toBe("2026-07-04");
    expect(url.searchParams.get("limit")).toBe("100");
    expect(headers.get("X-Treg-Route-Max-Cost")).toBe("0.05");
    expect(headers.get("X-Treg-Meta")).toBe("feature=score, signal=hiring");
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
  });
});
