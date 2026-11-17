import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const scoreCompany = vi.fn();
const upsert = vi.fn();
const enforcePlanRateLimit = vi.fn();
const bulkRunner = vi.hoisted(() => ({
  sweepStaleBulkJobs: vi.fn(),
  advanceStoredBulkJob: vi.fn(),
  retryStoredBulkWebhook: vi.fn(),
  freshBulkState: vi.fn(),
  isBulkState: vi.fn(),
  assertPublicWebhookUrl: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  enforcePlanRateLimit: (...args: unknown[]) => enforcePlanRateLimit(...args),
  enforceRateLimit: async () => null,
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: null }) }));
vi.mock("@/lib/dev-credit-bypass", () => ({ isDevCreditBypassEnabled: () => false }));
vi.mock("@/lib/bulk-job-runner", () => bulkRunner);
vi.mock("@/lib/score-service", () => ({
  scoreCompany: (...args: unknown[]) => scoreCompany(...args),
  domainToCompanyName: (domain: string) => domain,
  canonicalizeDomain: (domain: string) => domain,
  InvalidDomainError: class InvalidDomainError extends Error {},
  InsufficientCreditsError: class InsufficientCreditsError extends Error {},
  ScoreInProgressError: class ScoreInProgressError extends Error {},
  ScoreServiceError: class ScoreServiceError extends Error {},
  UnscorableDomainError: class UnscorableDomainError extends Error {},
  IdempotencyConflictError: class IdempotencyConflictError extends Error {},
}));

function tableRow(table: string) {
  return table === "api_keys"
    ? { user_id: "user_1", is_active: true }
    : { plan: "agency", product_category: "B2B SaaS", business_profile: null, credits_remaining: 5 };
}

function chain(table: string): Record<string, unknown> {
  const self: Record<string, unknown> = {};
  for (const name of ["select", "eq", "in", "order", "gt", "gte", "update"]) self[name] = () => self;
  self.maybeSingle = async () => ({ data: tableRow(table), error: null });
  self.single = async () => ({ data: tableRow(table), error: null });
  self.upsert = (row: unknown) => {
    upsert(row);
    return self;
  };
  return self;
}

vi.mock("@/lib/supabase", () => ({
  createSupabaseAdmin: () => ({ from: (table: string) => chain(table) }),
}));

const score = await import("./score/route");
const bulk = await import("./score/bulk/route");
const watchlist = await import("./watchlist/route");

function blocked(): NextResponse {
  return NextResponse.json({ code: "rate_limited" }, { status: 429, headers: { "Retry-After": "7" } });
}

function post(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: { authorization: "Bearer vw_key", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  scoreCompany.mockReset();
  upsert.mockReset();
  enforcePlanRateLimit.mockReset();
  bulkRunner.advanceStoredBulkJob.mockReset();
  enforcePlanRateLimit.mockResolvedValue(blocked());
});

describe("per-plan rate limit on /api/v1", () => {
  it("returns 429 for POST /score without scoring", async () => {
    const res = await score.POST(post("http://localhost/api/v1/score", { domain: "acme.io" }));

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("7");
    expect(scoreCompany).not.toHaveBeenCalled();
    expect(enforcePlanRateLimit).toHaveBeenCalledWith("user_1", "agency", "api");
  });

  it("returns 429 for POST /score/bulk without queueing a job", async () => {
    const res = await bulk.POST(post("http://localhost/api/v1/score/bulk", { companies: [{ domain: "acme.io" }] }));

    expect(res.status).toBe(429);
    expect(bulkRunner.advanceStoredBulkJob).not.toHaveBeenCalled();
    expect(scoreCompany).not.toHaveBeenCalled();
  });

  it("returns 429 for POST /watchlist without writing", async () => {
    const res = await watchlist.POST(post("http://localhost/api/v1/watchlist", { domain: "acme.io" }));

    expect(res.status).toBe(429);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("lets the request through when the limiter allows it", async () => {
    enforcePlanRateLimit.mockResolvedValue(null);

    const res = await watchlist.POST(post("http://localhost/api/v1/watchlist", { domain: "acme.io" }));

    expect(res.status).toBe(201);
  });
});
