import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const user = { plan: "free" };

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: "user_1" }),
}));

vi.mock("@/lib/supabase", () => ({
  createSupabaseAdmin: () => ({
    from: () => {
      const result = { data: user, error: null, count: 0 };
      const query = {
        select: () => query,
        eq: () => query,
        single: async () => ({ data: user, error: null }),
        maybeSingle: async () => ({ data: user, error: null }),
        then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
      };
      return query;
    },
  }),
}));

vi.mock("@/lib/score-service", () => ({
  scoreCompany: vi.fn(),
  domainToCompanyName: (domain: string) => domain,
  canonicalizeDomain: (domain: string) => domain,
  InsufficientCreditsError: class InsufficientCreditsError extends Error {},
}));

const { POST: postBulkInline } = await import("./bulk-inline/route");
const { POST: postPrioritize } = await import("../prioritize/route");
const { POST: postExport } = await import("../export/csv/route");
const { POST: postAutopilot } = await import("../../autopilot/workflows/route");

function csvRequest() {
  const form = new FormData();
  form.set("file", new File(["domain\nacme.com\n"], "accounts.csv", { type: "text/csv" }));
  return new NextRequest("http://localhost/api/v1/score/bulk-inline", { method: "POST", body: form });
}

describe("plan gates return 403 for free and starter", () => {
  beforeEach(() => {
    user.plan = "free";
  });

  it("blocks free CSV bulk upload", async () => {
    const response = await postBulkInline(csvRequest());
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toMatch(/Upgrade to Plus/);
  });

  it.each(["free", "starter"])("blocks %s CSV prioritize", async (plan) => {
    user.plan = plan;
    const response = await postPrioritize(new NextRequest("http://localhost/api/v1/prioritize", { method: "POST" }));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toMatch(/Upgrade to Plus/);
  });

  it.each(["free", "starter"])("blocks %s CSV export", async (plan) => {
    user.plan = plan;
    const response = await postExport(new NextRequest("http://localhost/api/v1/export/csv", {
      method: "POST",
      body: JSON.stringify({ columns: [{ key: "domain", label: "Domain" }], rows: [] }),
    }));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toMatch(/CSV upload and export/);
    expect(body.upgrade_to).toBe("plus");
  });

  it("blocks starter autopilot create", async () => {
    user.plan = "starter";
    const response = await postAutopilot(new NextRequest("http://localhost/api/autopilot/workflows", {
      method: "POST",
      body: JSON.stringify({
        name: "Watch scores",
        conditions: [{ type: "score_above", params: { threshold: 80 } }],
        actions: [{ type: "notification", params: {} }],
      }),
    }));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toMatch(/Starter plan/);
    expect(body.upgrade_to).toBe("plus");
  });
});
