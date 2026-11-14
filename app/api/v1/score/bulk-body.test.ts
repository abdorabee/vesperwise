import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const freshBulkState = vi.fn();

vi.mock("@/lib/rate-limit", () => ({ enforcePlanRateLimit: async () => null, enforceRateLimit: async () => null }));
vi.mock("@/lib/score-service", () => ({ scoreCompany: vi.fn(), domainToCompanyName: (d: string) => d }));
vi.mock("@/lib/bulk-job-runner", () => ({
  sweepStaleBulkJobs: vi.fn(),
  advanceStoredBulkJob: vi.fn(),
  retryStoredBulkWebhook: vi.fn(),
  freshBulkState: (...args: unknown[]) => freshBulkState(...args),
  isBulkState: vi.fn(),
  assertPublicWebhookUrl: async () => null,
}));
vi.mock("@/lib/supabase", () => ({
  createSupabaseAdmin: () => ({
    from: (table: string) => {
      const row = table === "api_keys" ? { user_id: "user_1", is_active: true } : { plan: "agency" };
      const self: Record<string, unknown> = {};
      self.select = () => self;
      self.eq = () => self;
      self.in = () => self;
      self.single = async () => ({ data: row, error: null });
      self.maybeSingle = async () => ({ data: row, error: null });
      return self;
    },
  }),
}));

const { POST } = await import("./bulk/route");

function request(body: string, authorized: boolean) {
  return new NextRequest("http://localhost/api/v1/score/bulk", {
    method: "POST",
    headers: { "content-type": "application/json", ...(authorized ? { authorization: "Bearer k" } : {}) },
    body,
  });
}

describe("POST /api/v1/score/bulk body handling", () => {
  it("returns 401 for an unauthenticated request with a malformed body", async () => {
    const res = await POST(request("{not json", false));

    expect(res.status).toBe(401);
  });

  it("returns 400 for malformed JSON after authenticating", async () => {
    const res = await POST(request("{not json", true));

    expect(res.status).toBe(400);
  });

  it.each([
    ["missing companies", {}],
    ["empty companies", { companies: [] }],
    ["non-array companies", { companies: "acme.io" }],
    ["too many companies", { companies: Array.from({ length: 1001 }, () => ({ domain: "a.io" })) }],
    ["wrong field types", { companies: [{ domain: 5 }] }],
  ])("returns 400 for %s", async (_label, body) => {
    const res = await POST(request(JSON.stringify(body), true));

    expect(res.status).toBe(400);
    expect(freshBulkState).not.toHaveBeenCalled();
  });
});
