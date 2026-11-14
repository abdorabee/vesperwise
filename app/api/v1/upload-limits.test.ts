import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const scoreCompany = vi.fn();
const inCalls: string[][] = [];

vi.mock("@/lib/rate-limit", () => ({ enforcePlanRateLimit: async () => null, enforceRateLimit: async () => null }));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: "user_1" }) }));
vi.mock("@/lib/dev-credit-bypass", () => ({ isDevCreditBypassEnabled: () => false }));
vi.mock("@/lib/cache", () => ({ cacheGet: async () => null, scoreResultCacheKey: () => "k" }));
vi.mock("@/lib/score-service", () => ({
  scoreCompany: (...args: unknown[]) => scoreCompany(...args),
  domainToCompanyName: (domain: string) => domain,
  canonicalizeDomain: (domain: string) => domain.trim().toLowerCase(),
  scoringProfileHash: () => "hash",
  InsufficientCreditsError: class InsufficientCreditsError extends Error {},
  InvalidDomainError: class InvalidDomainError extends Error {},
}));
vi.mock("@/lib/supabase", () => ({
  createSupabaseAdmin: () => ({
    from: () => {
      const result = {
        data: { plan: "agency", product_category: "B2B SaaS", business_profile: null, credits_remaining: 50 },
        error: null,
      };
      const self: Record<string, unknown> = {};
      for (const name of ["select", "eq", "gt", "order"]) self[name] = () => self;
      self.in = (_column: string, values: string[]) => {
        inCalls.push(values);
        return self;
      };
      self.single = async () => result;
      self.maybeSingle = async () => result;
      self.then = (resolve: (value: { data: unknown[]; error: null }) => void) => resolve({ data: [], error: null });
      return self;
    },
  }),
}));

const prioritize = await import("./prioritize/route");
const bulkInline = await import("./score/bulk-inline/route");

function csvRequest(url: string, csv: string): NextRequest {
  const form = new FormData();
  form.set("file", new File([csv], "rows.csv", { type: "text/csv" }));
  return new NextRequest(url, { method: "POST", body: form });
}

function domainCsv(count: number): string {
  return ["domain", ...Array.from({ length: count }, (_, i) => `site${i}.com`)].join("\n");
}

beforeEach(() => {
  scoreCompany.mockReset();
  inCalls.length = 0;
});

describe("POST /api/v1/prioritize caps", () => {
  it("returns 413 when the upload exceeds the byte cap", async () => {
    const oversized = `domain\n${"a".repeat(1024 * 1024 + 1)}`;

    const res = await prioritize.POST(csvRequest("http://localhost/api/v1/prioritize", oversized));

    expect(res.status).toBe(413);
  });

  it("returns 413 when the upload exceeds the row cap", async () => {
    const res = await prioritize.POST(csvRequest("http://localhost/api/v1/prioritize", domainCsv(1001)));

    expect(res.status).toBe(413);
    expect(inCalls).toHaveLength(0);
  });

  it("chunks the domain lookup instead of sending one huge list", async () => {
    const res = await prioritize.POST(csvRequest("http://localhost/api/v1/prioritize", domainCsv(450)));

    expect(res.status).toBe(200);
    expect(inCalls.length).toBeGreaterThan(1);
    expect(Math.max(...inCalls.map((chunk) => chunk.length))).toBeLessThanOrEqual(200);
  });
});

describe("POST /api/v1/score/bulk-inline", () => {
  it("returns 413 when the upload exceeds the byte cap", async () => {
    const oversized = `domain\n${"a".repeat(1024 * 1024 + 1)}`;

    const res = await bulkInline.POST(csvRequest("http://localhost/api/v1/score/bulk-inline", oversized));

    expect(res.status).toBe(413);
  });

  it("reports a fixed code instead of the raw error message for a failed row", async () => {
    scoreCompany.mockRejectedValue(new Error("upstream secret sk-999 exploded"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const res = await bulkInline.POST(csvRequest("http://localhost/api/v1/score/bulk-inline", "domain\nacme.io"));

    expect(res.status).toBe(200);
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain("sk-999");
    expect(text).toContain("scoring_failed");
    consoleError.mockRestore();
  });
});
