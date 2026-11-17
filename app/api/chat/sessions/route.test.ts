import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authMock = vi.fn();
const messageInsert = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({ auth: () => authMock() }));
vi.mock("@/lib/supabase", () => ({
  createSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === "chat_messages") return { insert: async (row: unknown) => messageInsert(row) };
      return {
        insert: () => ({
          select: () => ({
            single: async () => ({ data: { id: "s1", title: "t", created_at: "x", updated_at: "x" }, error: null }),
          }),
        }),
      };
    },
  }),
}));

const { POST } = await import("./route");

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/chat/sessions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ userId: "user_1" });
  messageInsert.mockResolvedValue({ error: null });
});

describe("POST /api/chat/sessions seed validation", () => {
  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue({ userId: null });
    expect((await POST(request({}))).status).toBe(401);
  });

  it("accepts a valid seed", async () => {
    const res = await POST(request({ title: "x", seed: { user: "q", assistant: "a", presentation: [], tools: [] } }));
    expect(res.status).toBe(200);
    expect(messageInsert).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["non-string user", { user: 5 }],
    ["oversized user", { user: "a".repeat(8_001) }],
    ["oversized assistant", { assistant: "a".repeat(16_001) }],
    ["non-array presentation", { assistant: "a", presentation: "nope" }],
    ["too many blocks", { assistant: "a", presentation: Array.from({ length: 13 }, () => ({})) }],
    ["oversized billing", { assistant: "a", billing: "b".repeat(121) }],
  ])("returns 400 for %s", async (_label, seed) => {
    const res = await POST(request({ seed }));
    expect(res.status).toBe(400);
    expect(messageInsert).not.toHaveBeenCalled();
  });
});
