import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const upsert = vi.fn();
let removedRows: Array<{ domain: string }> = [];
const deactivatedDomains: string[] = [];

/** A chainable query stub whose terminal calls resolve per table. */
function query(table: string) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  Object.assign(chain, {
    select: (_columns?: string, options?: { head?: boolean }) => {
      if (options?.head) return { eq: () => ({ eq: async () => ({ count: 0 }) }) };
      if (table === "watchlist") return Promise.resolve({ data: removedRows, error: null });
      return chain;
    },
    eq: (column: string, value: string) => {
      if (table === "watchlist" && column === "domain") deactivatedDomains.push(value);
      return chain;
    },
    single: async () => table === "api_keys"
      ? { data: { user_id: "user_1", is_active: true } }
      : { data: { plan: "agency" } },
    update: self,
    upsert: (row: Record<string, unknown>) => {
      upsert(row);
      return { select: () => ({ single: async () => ({ data: row, error: null }) }) };
    },
  });
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  createSupabaseAdmin: () => ({ from: (table: string) => query(table) }),
}));

const { POST, DELETE } = await import("./route");

function authed(url: string, init: { method: string; body?: string }) {
  return new NextRequest(url, { ...init, headers: { authorization: "Bearer vw_test_key" } });
}

beforeEach(() => {
  upsert.mockReset();
  removedRows = [];
  deactivatedDomains.length = 0;
});

describe("POST /api/v1/watchlist", () => {
  it("returns 400 instead of crashing on malformed JSON", async () => {
    const res = await POST(authed("http://localhost/api/v1/watchlist", { method: "POST", body: "{bad" }));

    expect(res.status).toBe(400);
  });

  it("stores the canonical domain so URL variants are one entry", async () => {
    const res = await POST(authed("http://localhost/api/v1/watchlist", {
      method: "POST",
      body: JSON.stringify({ domain: "https://Stripe.com/" }),
    }));

    expect(res.status).toBe(201);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ domain: "stripe.com", company_name: "stripe.com" }));
  });
});

describe("DELETE /api/v1/watchlist", () => {
  it("returns 404 when the domain is not on the watchlist", async () => {
    const res = await DELETE(authed("http://localhost/api/v1/watchlist?domain=example.com", { method: "DELETE" }));

    expect(res.status).toBe(404);
  });

  it("removes by canonical domain", async () => {
    removedRows = [{ domain: "stripe.com" }];

    const res = await DELETE(authed("http://localhost/api/v1/watchlist?domain=https://www.Stripe.com/", { method: "DELETE" }));

    expect(res.status).toBe(200);
    expect(deactivatedDomains).toContain("stripe.com");
  });
});
