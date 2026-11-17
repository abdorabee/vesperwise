import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.fn();
const eqCalls: Array<[string, unknown]> = [];
const mutated = vi.fn();
let listRow: { list_type: string; is_system: boolean } | null = null;

vi.mock("@clerk/nextjs/server", () => ({ auth: () => auth() }));
vi.mock("@/lib/supabase", () => ({
  createSupabaseAdmin: () => ({
    from: () => {
      const q: Record<string, unknown> = {
        select: () => q,
        upsert: () => {
          mutated("upsert");
          return q;
        },
        delete: () => {
          mutated("delete");
          return q;
        },
        update: () => q,
        single: async () => ({ data: { id: "m1" }, error: null }),
        eq: (col: string, val: unknown) => {
          eqCalls.push([col, val]);
          return q;
        },
        maybeSingle: async () => ({ data: listRow }),
        then: (resolve: (v: unknown) => void) => resolve({ error: null }),
      };
      return q;
    },
  }),
}));

const { POST, DELETE } = await import("./route");

const ctx = { params: Promise.resolve({ id: "l1" }) };

beforeEach(() => {
  auth.mockReset().mockResolvedValue({ userId: "user_1" });
  eqCalls.length = 0;
  mutated.mockReset();
  listRow = { list_type: "manual", is_system: false };
});

describe("members routes on the system watchlist list", () => {
  it("POST returns 409 without writing", async () => {
    listRow = { list_type: "manual", is_system: true };
    const req = new NextRequest("http://localhost/x", { method: "POST", body: JSON.stringify({ domain: "a.com" }) });

    expect((await POST(req, ctx)).status).toBe(409);
    expect(mutated).not.toHaveBeenCalled();
  });

  it("DELETE returns 409 without writing", async () => {
    listRow = { list_type: "manual", is_system: true };
    const req = new NextRequest("http://localhost/x?domain=a.com", { method: "DELETE" });

    expect((await DELETE(req, ctx)).status).toBe(409);
    expect(mutated).not.toHaveBeenCalled();
  });
});

describe("DELETE member on a manual list", () => {
  it("removes the member scoped to the user and list", async () => {
    const req = new NextRequest("http://localhost/x?domain=A.com", { method: "DELETE" });

    const res = await DELETE(req, ctx);

    expect(res.status).toBe(200);
    expect(mutated).toHaveBeenCalledWith("delete");
    expect(eqCalls).toContainEqual(["user_id", "user_1"]);
    expect(eqCalls).toContainEqual(["domain", "a.com"]);
  });

  it("requires a domain", async () => {
    const req = new NextRequest("http://localhost/x", { method: "DELETE" });

    expect((await DELETE(req, ctx)).status).toBe(400);
  });

  it("returns 404 for another user's list", async () => {
    listRow = null;
    const req = new NextRequest("http://localhost/x?domain=a.com", { method: "DELETE" });

    expect((await DELETE(req, ctx)).status).toBe(404);
  });
});
