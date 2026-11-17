import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.fn();
const insert = vi.fn();
const update = vi.fn();
const eqCalls: Array<[string, string]> = [];

vi.mock("@clerk/nextjs/server", () => ({ auth: () => auth() }));
vi.mock("@/lib/supabase", () => ({
  createSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "users") {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { plan: "pro" } }) }) }) };
      }
      return {
        select: () => ({ eq: async () => ({ count: 0 }) }),
        insert: (row: unknown) => {
          insert(row);
          return { select: () => ({ single: async () => ({ data: { id: "w1" }, error: null }) }) };
        },
        update: (row: unknown) => {
          update(row);
          const chain = {
            eq: (column: string, value: string) => {
              eqCalls.push([column, value]);
              return chain;
            },
            select: () => ({ single: async () => ({ data: { id: "w1" }, error: null }) }),
          };
          return chain;
        },
      };
    },
  }),
}));

const { POST } = await import("./route");
const { PATCH } = await import("./[id]/route");

const post = (body: string) =>
  new NextRequest("http://localhost/api/autopilot/workflows", { method: "POST", body });
const patch = (body: string) =>
  new NextRequest("http://localhost/api/autopilot/workflows/w1", { method: "PATCH", body });
const params = { params: Promise.resolve({ id: "w1" }) };

const valid = {
  name: "Hot",
  conditions: [{ type: "score_above", params: { threshold: 70 } }],
  actions: [{ type: "webhook", params: { url: "https://example.com/hook" } }],
};

describe("autopilot workflow routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eqCalls.length = 0;
    auth.mockResolvedValue({ userId: "user_1" });
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await POST(post("{nope"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("returns 400 with paths only for an unsafe body, without echoing values", async () => {
    const body = { ...valid, actions: [{ type: "webhook", params: { url: "http://169.254.169.254/secret" } }] };
    const res = await POST(post(JSON.stringify(body)));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid request");
    expect(json.issues[0].path).toBe("actions.0.params.url");
    expect(JSON.stringify(json)).not.toContain("169.254");
    expect(insert).not.toHaveBeenCalled();
  });

  it("inserts a valid workflow scoped to the signed-in user", async () => {
    const res = await POST(post(JSON.stringify(valid)));
    expect(res.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "user_1", name: "Hot" }));
  });

  it("rejects unauthenticated requests before parsing", async () => {
    auth.mockResolvedValue({ userId: null });
    expect((await POST(post("{}"))).status).toBe(401);
  });

  it("PATCH validates only provided fields and keeps user scoping", async () => {
    const res = await PATCH(patch(JSON.stringify({ is_enabled: false })), params);
    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ is_enabled: false }));
    expect(update.mock.calls[0][0]).not.toHaveProperty("actions");
    expect(eqCalls).toEqual([["id", "w1"], ["user_id", "user_1"]]);
  });

  it("PATCH rejects bad JSON and unsafe actions", async () => {
    expect((await PATCH(patch("{x"), params)).status).toBe(400);
    const bad = { actions: [{ type: "webhook", params: { url: "https://a.test/x", headers: { a: "b" } } }] };
    expect((await PATCH(patch(JSON.stringify(bad)), params)).status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });
});
