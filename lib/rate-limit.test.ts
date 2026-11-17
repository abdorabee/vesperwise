import { beforeEach, describe, expect, it, vi } from "vitest";
import { PLAN_RATE_LIMIT } from "@/lib/types";

const rpc = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase", () => ({
  createSupabaseAdmin: () => ({ rpc }),
}));

import {
  checkRateLimit,
  clientIpFromRequest,
  enforcePlanRateLimit,
  enforceRateLimit,
} from "@/lib/rate-limit";

function allowedRow(remaining: number) {
  return { data: [{ allowed: true, remaining, retry_after_seconds: 30 }], error: null };
}

function blockedRow(retryAfter: number) {
  return { data: [{ allowed: false, remaining: 0, retry_after_seconds: retryAfter }], error: null };
}

describe("checkRateLimit", () => {
  beforeEach(() => {
    rpc.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("returns ok with remaining when under the limit and passes defaults to the RPC", async () => {
    rpc.mockResolvedValue(allowedRow(7));

    const result = await checkRateLimit({ key: "api:user_1", limit: 10 });

    expect(result).toEqual({ ok: true, remaining: 7 });
    expect(rpc).toHaveBeenCalledWith("check_rate_limit", {
      p_key: "api:user_1",
      p_limit: 10,
      p_window_seconds: 60,
    });
  });

  it("maps a blocked row to retryAfter", async () => {
    rpc.mockResolvedValue(blockedRow(42));

    const result = await checkRateLimit({ key: "api:user_1", limit: 10, windowSeconds: 120 });

    expect(result).toEqual({ ok: false, retryAfter: 42 });
    expect(rpc).toHaveBeenCalledWith("check_rate_limit", {
      p_key: "api:user_1",
      p_limit: 10,
      p_window_seconds: 120,
    });
  });

  it("fails open when the RPC returns an error", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "function does not exist" } });

    const result = await checkRateLimit({ key: "contact:1.2.3.4", limit: 5 });

    expect(result.ok).toBe(true);
  });

  it("fails open when the RPC throws", async () => {
    rpc.mockRejectedValue(new Error("network down"));

    const result = await checkRateLimit({ key: "api:user_1", limit: 5 });

    expect(result.ok).toBe(true);
  });

  it("never logs the full key", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    const spy = vi.spyOn(console, "error");

    await checkRateLimit({ key: "contact:9.9.9.9", limit: 5 });

    expect(JSON.stringify(spy.mock.calls)).not.toContain("9.9.9.9");
  });
});

describe("enforceRateLimit", () => {
  beforeEach(() => {
    rpc.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("returns null when allowed", async () => {
    rpc.mockResolvedValue(allowedRow(3));

    expect(await enforceRateLimit({ key: "chat:u", limit: 5 })).toBeNull();
  });

  it("returns a 429 with Retry-After and JSON body when blocked", async () => {
    rpc.mockResolvedValue(blockedRow(17));

    const res = await enforceRateLimit({ key: "chat:u", limit: 5 });

    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);
    expect(res!.headers.get("Retry-After")).toBe("17");
    expect(await res!.json()).toEqual({ error: "Rate limit exceeded", code: "rate_limited" });
  });
});

describe("enforcePlanRateLimit", () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue(allowedRow(1));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("uses the plan's limit and the default api scope", async () => {
    await enforcePlanRateLimit("user_1", "growth");

    expect(rpc).toHaveBeenCalledWith("check_rate_limit", {
      p_key: "api:user_1",
      p_limit: PLAN_RATE_LIMIT.growth,
      p_window_seconds: 60,
    });
  });

  it("honors a custom scope", async () => {
    await enforcePlanRateLimit("user_1", "starter", "bulk");

    expect(rpc).toHaveBeenCalledWith(
      "check_rate_limit",
      expect.objectContaining({ p_key: "bulk:user_1", p_limit: PLAN_RATE_LIMIT.starter })
    );
  });

  it.each([["mystery"], [null], [undefined]])("falls back to the free limit for plan %s", async (plan) => {
    await enforcePlanRateLimit("user_1", plan);

    expect(rpc).toHaveBeenCalledWith(
      "check_rate_limit",
      expect.objectContaining({ p_limit: PLAN_RATE_LIMIT.free })
    );
  });
});

describe("clientIpFromRequest", () => {
  it("uses the first x-forwarded-for entry", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "1.1.1.1, 2.2.2.2" } });
    expect(clientIpFromRequest(req)).toBe("1.1.1.1");
  });

  it("falls back to x-real-ip", () => {
    const req = new Request("http://x", { headers: { "x-real-ip": "3.3.3.3" } });
    expect(clientIpFromRequest(req)).toBe("3.3.3.3");
  });

  it("returns unknown when no header is present", () => {
    expect(clientIpFromRequest(new Request("http://x"))).toBe("unknown");
  });
});
