import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = { plan: "free" };

vi.mock("@/lib/supabase", () => ({
  createSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "api_keys") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: { user_id: "user_1", is_active: true }, error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { plan: state.plan }, error: null }),
            maybeSingle: async () => ({ data: { plan: state.plan }, error: null }),
          }),
        }),
      };
    },
  }),
}));

vi.mock("@/lib/score-service", () => ({
  scoreCompany: vi.fn(),
  domainToCompanyName: (domain: string) => domain,
}));

vi.mock("@/lib/bulk-job-runner", () => ({
  sweepStaleBulkJobs: vi.fn(),
  advanceStoredBulkJob: vi.fn(),
  retryStoredBulkWebhook: vi.fn(),
  freshBulkState: vi.fn(),
  isBulkState: vi.fn(),
}));

const { POST } = await import("./route");

function request() {
  return new NextRequest("http://localhost/api/v1/score/bulk", {
    method: "POST",
    headers: { authorization: "Bearer test-key", "content-type": "application/json" },
    body: JSON.stringify({ companies: [{ domain: "acme.com" }] }),
  });
}

describe("POST /api/v1/score/bulk plan gate", () => {
  beforeEach(() => {
    state.plan = "free";
  });

  it.each(["free", "starter"])("returns 403 for %s", async (plan) => {
    state.plan = plan;
    const response = await POST(request());
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.message).toMatch(/Upgrade to Plus/);
    expect(body.upgrade_to).toBe("plus");
  });
});
