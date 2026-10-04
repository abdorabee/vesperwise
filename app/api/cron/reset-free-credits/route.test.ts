import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const rpc = vi.fn();

vi.mock("@/lib/supabase", () => ({
  createSupabaseAdmin: () => ({ rpc: (...args: unknown[]) => rpc(...args) }),
}));

const { GET } = await import("./route");

function cronRequest(authorization?: string): NextRequest {
  const headers: Record<string, string> = authorization ? { authorization } : {};
  return new NextRequest("http://localhost/api/cron/reset-free-credits", { headers });
}

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "cron_test_secret");
  rpc.mockReset().mockResolvedValue({ data: 3, error: null });
});

describe("GET /api/cron/reset-free-credits", () => {
  it("refills free users with the free plan allowance", async () => {
    const res = await GET(cronRequest("Bearer cron_test_secret"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ refilled: 3 });
    expect(rpc).toHaveBeenCalledWith("reset_free_credits", { p_allowance: 20 });
  });

  it("rejects requests without the cron secret", async () => {
    for (const header of [undefined, "Bearer wrong", "cron_test_secret"]) {
      const res = await GET(cronRequest(header));
      expect(res.status, String(header)).toBe(401);
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it("fails closed when CRON_SECRET is not configured", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const res = await GET(cronRequest("Bearer "));

    expect(res.status).toBe(503);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns 500 when the reset fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "db down" } });

    const res = await GET(cronRequest("Bearer cron_test_secret"));

    expect(res.status).toBe(500);
  });
});
