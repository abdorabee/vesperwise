import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import newsFixture from "./__fixtures__/akta-company-news.json";
import { fetchTregNewsSignal } from "./news";

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
      "X-Treg-Call-Id": "call_news",
      "X-Treg-Cost-Micro": "5678",
    }),
    json: async () => data,
  };
}

function newsPayload(title: string, website: string, publishedDate: string): unknown {
  return {
    data: [{
      title,
      url: "https://example.com/news",
      published_date: publishedDate,
      ai_summary: "Leadership update for the company.",
      full_text: "This full article body should never be copied.",
      company_mentions: [{
        website,
        is_primary: true,
      }],
    }],
  };
}

describe("fetchTregNewsSignal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-04T12:00:00.000Z"));
    vi.stubEnv("TREG_TOKEN", "test-token");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("keeps only primary Akta mentions for the requested company", async () => {
    vi.stubGlobal("fetch", vi.fn<FetchMock>().mockResolvedValue(jsonResponse(200, newsFixture)));

    const result = await fetchTregNewsSignal("stripe.com");

    expect(result).toMatchObject({
      source: "treg-akta",
      metadata: {
        articles_considered: 2,
        non_primary_articles_ignored: 1,
        fallback_for: "gnews",
      },
    });
    expect(JSON.stringify(result)).not.toContain("full_text");
  });

  it("scores a recent primary leadership article", async () => {
    vi.stubGlobal("fetch", vi.fn<FetchMock>().mockResolvedValue(jsonResponse(200, newsPayload(
      "Acme appoints new CEO",
      "acme.com",
      "2026-10-02T12:00:00Z",
    ))));

    const result = await fetchTregNewsSignal("acme.com");

    expect(result.status).toBe("ok");
    expect(result.score).toBeGreaterThan(0);
    expect(result.evidence?.[0]).toMatchObject({
      source: "treg-akta",
      label: "Acme appoints new CEO",
    });
  });

  it("parses Akta date-times without timezones as UTC", async () => {
    vi.stubGlobal("fetch", vi.fn<FetchMock>().mockResolvedValue(jsonResponse(200, newsPayload(
      "Acme appoints new CEO",
      "acme.com",
      "2026-10-02T14:00:10",
    ))));

    const result = await fetchTregNewsSignal("acme.com");

    expect(result.evidence?.[0]?.observed_at).toBe("2026-10-02T14:00:10.000Z");
  });

  it("returns no_signal for an empty Akta news response", async () => {
    vi.stubGlobal("fetch", vi.fn<FetchMock>().mockResolvedValue(jsonResponse(200, {
      data: [],
    })));

    const result = await fetchTregNewsSignal("acme.com");

    expect(result).toMatchObject({
      status: "no_signal",
      score: 0,
      observed_at: null,
      metadata: {
        articles_considered: 0,
        non_primary_articles_ignored: 0,
      },
    });
  });

  it("matches www, protocol, path, trailing-dot, and case variants of the requested domain", async () => {
    vi.stubGlobal("fetch", vi.fn<FetchMock>().mockResolvedValue(jsonResponse(200, newsPayload(
      "Stripe appoints new CEO",
      "https://www.STRIPE.com./about",
      "2026-10-02T12:00:00Z",
    ))));

    const result = await fetchTregNewsSignal("HTTPS://WWW.stripe.COM/path");

    expect(result).toMatchObject({
      status: "ok",
      metadata: {
        articles_considered: 1,
        non_primary_articles_ignored: 0,
      },
    });
  });

  it("sends the Akta query with a 30-day date-only window", async () => {
    const fetchMock = vi.fn<FetchMock>().mockResolvedValue(jsonResponse(200, newsFixture));
    vi.stubGlobal("fetch", fetchMock);

    await fetchTregNewsSignal("stripe.com");

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(`${url.origin}${url.pathname}`).toBe("https://treg.to/call/akta.companies.news");
    expect(url.searchParams.get("company")).toBe("stripe.com");
    expect(url.searchParams.get("start_date")).toBe("2026-09-04");
    expect(url.searchParams.get("limit")).toBe("10");
    expect(url.searchParams.get("group_articles")).toBe("true");
    expect(headers.get("X-Treg-Route-Max-Cost")).toBe("0.03");
    expect(headers.get("X-Treg-Meta")).toBe("feature=score, signal=news");
  });
});
