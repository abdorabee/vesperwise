import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.fn();
const eqCalls: Array<[string, unknown]> = [];
const deleteCalled = vi.fn();
let listRow: { is_system: boolean } | null = null;

vi.mock("@clerk/nextjs/server", () => ({ auth: () => auth() }));
vi.mock("@/lib/lists-data", () => ({ buildListDetailForId: vi.fn() }));
vi.mock("@/lib/supabase", () => ({
  createSupabaseAdmin: () => ({
    from: () => {
      const q: Record<string, unknown> = {
        select: () => q,
        delete: () => {
          deleteCalled();
          return q;
        },
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

const { DELETE } = await import("./route");

const ctx = { params: Promise.resolve({ id: "l1" }) };
const request = () => new NextRequest("http://localhost/api/dashboard/lists/l1", { method: "DELETE" });

beforeEach(() => {
  auth.mockReset().mockResolvedValue({ userId: "user_1" });
  eqCalls.length = 0;
  deleteCalled.mockReset();
  listRow = { is_system: false };
});

describe("DELETE /api/dashboard/lists/[id]", () => {
  it("returns 401 when signed out", async () => {
    auth.mockResolvedValue({ userId: null });

    expect((await DELETE(request(), ctx)).status).toBe(401);
  });

  it("returns 409 and deletes nothing for the system watchlist list", async () => {
    listRow = { is_system: true };

    const res = await DELETE(request(), ctx);

    expect(res.status).toBe(409);
    expect(deleteCalled).not.toHaveBeenCalled();
  });

  it("returns 404 for a list the user does not own", async () => {
    listRow = null;

    expect((await DELETE(request(), ctx)).status).toBe(404);
    expect(deleteCalled).not.toHaveBeenCalled();
  });

  it("deletes a normal list scoped to the user", async () => {
    const res = await DELETE(request(), ctx);

    expect(res.status).toBe(200);
    expect(deleteCalled).toHaveBeenCalled();
    expect(eqCalls).toContainEqual(["user_id", "user_1"]);
  });
});
