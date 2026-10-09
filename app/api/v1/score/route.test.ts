import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createSseParser } from "@/lib/score-progress";

const scoreCompany = vi.fn();

const clerkAuth = vi.fn(async (): Promise<{ userId: string | null }> => ({ userId: "user_test" }));
vi.mock("@clerk/nextjs/server", () => ({ auth: () => clerkAuth() }));
vi.mock("@/lib/dev-credit-bypass", () => ({ isDevCreditBypassEnabled: () => false }));
const keyUpdate = vi.fn();

vi.mock("@/lib/supabase", () => ({
  createSupabaseAdmin: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => table === "api_keys"
            ? { data: { user_id: "user_test", is_active: true }, error: null }
            : { data: { product_category: "B2B SaaS", business_profile: null }, error: null },
        }),
      }),
      update: (values: Record<string, unknown>) => ({
        eq: (column: string, value: string) => keyUpdate(table, values, column, value),
      }),
    }),
  }),
}));
vi.mock("@/lib/score-service", async () => {
  class ScoreServiceError extends Error {
    constructor(message: string, public code: string) { super(message); }
  }
  class InsufficientCreditsError extends ScoreServiceError {
    constructor(public creditsRemaining: number) { super("Insufficient credits", "insufficient_credits"); }
  }
  class ScoreInProgressError extends ScoreServiceError {
    constructor(public runId: string) { super("A score for this domain is already in progress", "score_in_progress"); }
  }
  class InvalidDomainError extends ScoreServiceError {}
  class IdempotencyConflictError extends ScoreServiceError {}
  class UnscorableDomainError extends ScoreServiceError {
    constructor(public result: unknown) { super("unscorable", "unscorable_domain"); }
  }
  return {
    scoreCompany: (...args: unknown[]) => scoreCompany(...args),
    ScoreServiceError,
    InsufficientCreditsError,
    ScoreInProgressError,
    InvalidDomainError,
    IdempotencyConflictError,
    UnscorableDomainError,
  };
});

const RESULT = { company: "Acme", domain: "acme.io", intent_score: 82, score_band: "HOT", cached: false, charged: true };

function request(accept?: string) {
  return new NextRequest("http://localhost/api/v1/score", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(accept ? { Accept: accept } : {}) },
    body: JSON.stringify({ domain: "acme.io" }),
  });
}

async function readEvents(response: Response) {
  const parse = createSseParser();
  const text = await response.text();
  return parse(text).map((message) => ({ event: message.event, data: JSON.parse(message.data) as Record<string, unknown> }));
}

describe("POST /api/v1/score", () => {
  beforeEach(() => {
    scoreCompany.mockReset();
  });

  it("keeps the default JSON path unchanged for API clients", async () => {
    scoreCompany.mockResolvedValue(RESULT);
    const { POST } = await import("./route");
    const response = await POST(request());
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("X-IIQ-Cache")).toBe("miss");
    expect(await response.json()).toEqual(RESULT);
    expect(scoreCompany.mock.calls[0][0].onProgress).toBeUndefined();
  });

  it("streams progress events then the result when Accept is text/event-stream", async () => {
    scoreCompany.mockImplementation(async (opts: { onProgress?: (event: unknown) => void }) => {
      opts.onProgress?.({ type: "signal_done", key: "funding", status: "ok", detail: "Series B", source: "explorium" });
      opts.onProgress?.({ type: "signal_done", key: "hiring", status: "no_signal", source: "scrapling" });
      opts.onProgress?.({
        type: "score_ready",
        company: "Acme",
        domain: "acme.io",
        intent_score: 82,
        score_band: "HOT",
        last_updated: "2026-10-09T12:00:00.000Z",
        contributions: [{
          type: "hiring",
          rawScore: 80,
          effectiveWeight: 19,
          daysAgo: 4,
          observedAt: "2026-10-05T12:00:00.000Z",
          summary: "Hiring sales leaders",
          contribution: 20,
          status: "ok",
        }],
      });
      opts.onProgress?.({
        type: "brief",
        spec: {
          version: 1,
          headline: "BuiltWith says Acme is ready",
          personas: ["VP Sales"],
          openers: {
            hiring: {
              "VP Sales": "OpenPageRank should never leak into opener text.",
            },
          },
          layout: [
            { type: "score_hero" },
            { type: "why_now", text: "Use GNews signal text without naming the vendor." },
          ],
        },
      });
      opts.onProgress?.({ type: "reasoning_start" });
      opts.onProgress?.({ type: "reasoning_done" });
      return RESULT;
    });
    const { POST } = await import("./route");
    const response = await POST(request("text/event-stream"));
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    const events = await readEvents(response);
    expect(events.map((event) => event.event === "progress" ? `${event.event}:${event.data.type}${event.data.key ? `:${event.data.key}` : ""}` : event.event)).toEqual([
      "progress:signal_done:funding",
      "progress:signal_done:hiring",
      "progress:score_ready",
      "progress:brief",
      "progress:reasoning_start",
      "progress:reasoning_done",
      "result",
    ]);
    expect(events[0]?.data.source).toBe("company");
    expect(events[1]?.data.source).toBe("careers");
    const brief = events.find((event) => event.data.type === "brief")?.data.spec as { headline?: string; layout?: Array<{ text?: string }>; openers?: Record<string, Record<string, string>> } | undefined;
    expect(JSON.stringify(brief)).not.toMatch(/BuiltWith|OpenPageRank|GNews/i);
    expect(brief?.headline).toContain("public data");
    expect(events.at(-1)?.data).toEqual(RESULT);
  });

  it("maps provider ids in the JSON score body", async () => {
    scoreCompany.mockResolvedValue({
      ...RESULT,
      signals: {
        funding: {
          source: "explorium",
          evidence: [{ source: "gnews" }],
          metadata: { selected_source: "builtwith", fallback_source: "firecrawl" },
        },
      },
      contributions: [{ selectedSource: "scrapling" }],
    });
    const { POST } = await import("./route");
    const body = await (await POST(request())).json();
    expect(body.signals.funding.source).toBe("company");
    expect(body.signals.funding.evidence[0].source).toBe("news");
    expect(body.signals.funding.metadata).toEqual({
      selected_source: "technology",
      fallback_source: "website",
    });
    expect(body.contributions[0].selectedSource).toBe("careers");
    expect(JSON.stringify(body)).not.toMatch(/explorium|gnews|builtwith|firecrawl|scrapling/i);
  });

  it("ends the stream with a typed 402 error carrying credits", async () => {
    const { POST } = await import("./route");
    const { InsufficientCreditsError } = await import("@/lib/score-service");
    scoreCompany.mockRejectedValue(new InsufficientCreditsError(0));
    const events = await readEvents(await POST(request("text/event-stream")));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ event: "error", data: { status: 402, code: "insufficient_credits", credits_remaining: 0 } });
  });

  it("ends the stream with a 409 carrying retry_after_seconds", async () => {
    const { POST } = await import("./route");
    const { ScoreInProgressError } = await import("@/lib/score-service");
    scoreCompany.mockRejectedValue(new ScoreInProgressError("run_1"));
    const events = await readEvents(await POST(request("text/event-stream")));
    expect(events[0]).toMatchObject({ event: "error", data: { status: 409, retry_after_seconds: 2, score_run_id: "run_1" } });
  });

  it("stamps last_used for API-key requests without blocking on failure", async () => {
    scoreCompany.mockResolvedValue(RESULT);
    keyUpdate.mockReset();
    keyUpdate.mockResolvedValue({ error: { message: "db down" } });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { POST } = await import("./route");
    const response = await POST(new NextRequest("http://localhost/api/v1/score", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer vw_test_key" },
      body: JSON.stringify({ domain: "acme.io" }),
    }));
    expect(response.status).toBe(200);
    expect(keyUpdate).toHaveBeenCalledTimes(1);
    const [table, values, column] = keyUpdate.mock.calls[0];
    expect(table).toBe("api_keys");
    expect(column).toBe("key_hash");
    expect(typeof values.last_used).toBe("string");
    warn.mockRestore();
  });

  it("still returns JSON 402 on the default path", async () => {
    const { POST } = await import("./route");
    const { InsufficientCreditsError } = await import("@/lib/score-service");
    scoreCompany.mockRejectedValue(new InsufficientCreditsError(3));
    const response = await POST(request());
    expect(response.status).toBe(402);
    expect(await response.json()).toMatchObject({ code: "insufficient_credits", credits_remaining: 3 });
  });
});

describe("POST /api/v1/score without credentials", () => {
  beforeEach(() => {
    scoreCompany.mockReset();
    clerkAuth.mockResolvedValueOnce({ userId: null });
  });

  function anonymous(body: string) {
    return new NextRequest("http://localhost/api/v1/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
  }

  it.each([["an empty object", "{}"], ["malformed JSON", "{not json"]])(
    "returns 401 before validating %s",
    async (_label, body) => {
      const { POST } = await import("./route");

      const response = await POST(anonymous(body));

      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({ type: "error", code: "unauthorized" });
      expect(scoreCompany).not.toHaveBeenCalled();
    }
  );
});
