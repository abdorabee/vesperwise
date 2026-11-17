import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.fn();
const enforceRateLimit = vi.fn();
const insert = vi.fn();
let activeCount = 0;

vi.mock("@clerk/nextjs/server", () => ({ auth: () => auth() }));
vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: (...args: unknown[]) => enforceRateLimit(...args),
}));
vi.mock("@/lib/supabase", () => ({
  createSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: async () => ({ count: activeCount, error: null }),
        }),
      }),
      insert: (row: unknown) => {
        insert(row);
        return {
          select: () => ({
            single: async () => ({ data: { id: "k1", label: "Default" }, error: null }),
          }),
        };
      },
    }),
  }),
}));

const { POST } = await import("./route");

function createRequest(): NextRequest {
  return new NextRequest("http://localhost/api/user/api-keys", {
    method: "POST",
    body: JSON.stringify({ label: "CI" }),
  });
}

beforeEach(() => {
  activeCount = 0;
  auth.mockReset().mockResolvedValue({ userId: "user_1" });
  enforceRateLimit.mockReset().mockResolvedValue(null);
  insert.mockReset();
});

describe("POST /api/user/api-keys", () => {
  it("creates a key and rate limits per user", async () => {
    const res = await POST(createRequest());

    expect(res.status).toBe(201);
    expect(enforceRateLimit).toHaveBeenCalledWith({
      key: "apikeys:user_1",
      limit: 10,
      windowSeconds: 3600,
    });
  });

  it("returns 409 at the active key cap without inserting", async () => {
    activeCount = 25;

    const res = await POST(createRequest());

    expect(res.status).toBe(409);
    expect(insert).not.toHaveBeenCalled();
  });

  it("returns the limiter response when blocked", async () => {
    enforceRateLimit.mockResolvedValue(new Response(null, { status: 429 }));

    const res = await POST(createRequest());

    expect(res.status).toBe(429);
    expect(insert).not.toHaveBeenCalled();
  });
});
