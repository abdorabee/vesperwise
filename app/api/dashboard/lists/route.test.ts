import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.fn();
const insertedList = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({ auth: () => auth() }));
vi.mock("@/lib/lists-data", () => ({
  buildListsOverview: vi.fn(),
  ensureDefaultList: vi.fn(),
  previewSmartListCount: vi.fn(async () => 3),
}));
vi.mock("@/lib/supabase", () => ({
  createSupabaseAdmin: () => ({
    from: () => ({
      insert: (row: unknown) => {
        insertedList(row);
        return { select: () => ({ single: async () => ({ data: { id: "l1" }, error: null }) }) };
      },
    }),
  }),
}));

const { POST, PUT } = await import("./route");

function jsonRequest(method: string, body: string): NextRequest {
  return new NextRequest("http://localhost/api/dashboard/lists", { method, body });
}

beforeEach(() => {
  auth.mockReset().mockResolvedValue({ userId: "user_1" });
  insertedList.mockReset();
});

describe("POST /api/dashboard/lists validation", () => {
  it("returns 400 Invalid JSON for a malformed body", async () => {
    const res = await POST(jsonRequest("POST", "{nope"));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Invalid JSON" });
  });

  it("returns 400 for a wrong-typed name", async () => {
    const res = await POST(jsonRequest("POST", JSON.stringify({ name: 42 })));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "Invalid request", fields: ["name"] });
    expect(insertedList).not.toHaveBeenCalled();
  });

  it("returns 400 for too many domains", async () => {
    const domains = Array.from({ length: 501 }, (_, i) => ({ domain: `d${i}.com` }));

    const res = await POST(jsonRequest("POST", JSON.stringify({ name: "x", domains })));

    expect(res.status).toBe(400);
  });

  it("returns 400 for an arbitrary rule shape", async () => {
    const res = await POST(
      jsonRequest("POST", JSON.stringify({ name: "x", list_type: "smart", rules: [{ evil: true }] })),
    );

    expect(res.status).toBe(400);
  });

  it("creates a valid manual list with a trimmed name", async () => {
    const res = await POST(jsonRequest("POST", JSON.stringify({ name: "  Targets  " })));

    expect(res.status).toBe(201);
    expect(insertedList).toHaveBeenCalledWith(expect.objectContaining({ name: "Targets", user_id: "user_1" }));
  });
});

describe("PUT /api/dashboard/lists validation", () => {
  it("returns 400 when rules are missing", async () => {
    const res = await PUT(jsonRequest("PUT", "{}"));

    expect(res.status).toBe(400);
  });

  it("previews a valid rule set", async () => {
    const rules = [{ field: "score", op: ">=", value: 75 }];

    const res = await PUT(jsonRequest("PUT", JSON.stringify({ rules })));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ count: 3 });
  });
});
