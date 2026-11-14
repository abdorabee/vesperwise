import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const scoreCompany = vi.fn();
const scorePerson = vi.fn();
const clerkAuth = vi.fn(async (): Promise<{ userId: string | null }> => ({ userId: "user_session" }));

vi.mock("@clerk/nextjs/server", () => ({ auth: () => clerkAuth() }));
vi.mock("@/lib/rate-limit", () => ({ enforcePlanRateLimit: async () => null, enforceRateLimit: async () => null }));
vi.mock("@/lib/dev-credit-bypass", () => ({ isDevCreditBypassEnabled: () => false }));
vi.mock("@/lib/person-score-service", () => ({ scorePerson: (...args: unknown[]) => scorePerson(...args) }));
vi.mock("@/lib/score-service", () => ({
  scoreCompany: (...args: unknown[]) => scoreCompany(...args),
  ScoreServiceError: class ScoreServiceError extends Error {},
  InsufficientCreditsError: class InsufficientCreditsError extends Error {},
  ScoreInProgressError: class ScoreInProgressError extends Error {},
  InvalidDomainError: class InvalidDomainError extends Error {},
  IdempotencyConflictError: class IdempotencyConflictError extends Error {},
  UnscorableDomainError: class UnscorableDomainError extends Error {},
}));
vi.mock("@/lib/supabase", () => ({
  createSupabaseAdmin: () => ({
    from: (table: string) => {
      const row = table === "api_keys"
        ? { user_id: "user_key", is_active: true }
        : { plan: "pro", product_category: "B2B SaaS", business_profile: null, credits_remaining: 9 };
      const self: Record<string, unknown> = {};
      self.select = () => self;
      self.eq = () => self;
      self.update = () => self;
      self.maybeSingle = async () => ({ data: row, error: null });
      self.single = async () => ({ data: row, error: null });
      return self;
    },
  }),
}));

const scoreRoute = await import("./route");
const personRoute = await import("./person/route");

const RESULT = { company: "Acme", domain: "acme.io", intent_score: 80, score_band: "HOT", cached: false, charged: true };

function req(url: string, init: { method?: string; key?: boolean; body?: unknown } = {}) {
  return new NextRequest(url, {
    method: init.method ?? "GET",
    headers: {
      ...(init.key ? { authorization: "Bearer vw_key" } : {}),
      ...(init.body ? { "content-type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
}

beforeEach(() => {
  scoreCompany.mockReset();
  scorePerson.mockReset();
  scoreCompany.mockResolvedValue(RESULT);
  scorePerson.mockResolvedValue({ person_name: "Ada" });
  clerkAuth.mockResolvedValue({ userId: "user_session" });
});

describe("GET /api/v1/score", () => {
  it("rejects session callers with 405 and an Allow header, without spending credits", async () => {
    const res = await scoreRoute.GET(req("http://localhost/api/v1/score?domain=acme.io"));

    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("POST");
    expect(await res.json()).toMatchObject({ error: "Use POST", code: "method_not_allowed" });
    expect(scoreCompany).not.toHaveBeenCalled();
  });

  it("still serves API-key callers", async () => {
    const res = await scoreRoute.GET(req("http://localhost/api/v1/score?domain=acme.io", { key: true }));

    expect(res.status).toBe(200);
    expect(scoreCompany).toHaveBeenCalledWith(expect.objectContaining({ userId: "user_key", domain: "acme.io" }));
  });

  it("keeps POST available to sessions", async () => {
    const res = await scoreRoute.POST(req("http://localhost/api/v1/score", { method: "POST", body: { domain: "acme.io" } }));

    expect(res.status).toBe(200);
  });
});

describe("/api/v1/score/person", () => {
  it("rejects session GET with 405 and an Allow header", async () => {
    const res = await personRoute.GET(req("http://localhost/api/v1/score/person?email=a@acme.io"));

    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("POST");
    expect(scorePerson).not.toHaveBeenCalled();
  });

  it("still serves API-key GET", async () => {
    const res = await personRoute.GET(req("http://localhost/api/v1/score/person?email=a@acme.io", { key: true }));

    expect(res.status).toBe(200);
    expect(scorePerson).toHaveBeenCalledWith(expect.objectContaining({ email: "a@acme.io", userId: "user_key" }));
  });

  it("scores a session POST with a JSON body", async () => {
    const res = await personRoute.POST(
      req("http://localhost/api/v1/score/person", { method: "POST", body: { email: "a@acme.io" } }),
    );

    expect(res.status).toBe(200);
    expect(scorePerson).toHaveBeenCalledWith(expect.objectContaining({ userId: "user_session" }));
  });

  it("rejects a POST without any identifier", async () => {
    const res = await personRoute.POST(
      req("http://localhost/api/v1/score/person", { method: "POST", body: { title: "CEO" } }),
    );

    expect(res.status).toBe(400);
  });

  it("never returns the raw error message on failure", async () => {
    scorePerson.mockRejectedValue(new Error("secret upstream key sk-123 failed"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const res = await personRoute.POST(
      req("http://localhost/api/v1/score/person", { method: "POST", body: { email: "a@acme.io" } }),
    );

    expect(res.status).toBe(500);
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain("sk-123");
    expect(text).toContain("scoring_failed");
    consoleError.mockRestore();
  });
});
