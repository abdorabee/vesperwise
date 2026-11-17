import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.fn();
const createCheckout = vi.fn();
const enforceRateLimit = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({ auth: () => auth() }));
vi.mock("@/lib/polar", () => ({
  getPolar: () => ({ checkouts: { create: (...args: unknown[]) => createCheckout(...args) } }),
}));
vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: (...args: unknown[]) => enforceRateLimit(...args),
}));

const checkout = await import("./route");
const topup = await import("../topup/route");

function formRequest(path: string, field: string, value: string, origin?: string): NextRequest {
  const body = new URLSearchParams({ [field]: value });
  return new NextRequest(`https://app.example.com${path}`, {
    method: "POST",
    body,
    headers: origin ? { origin } : {},
  });
}

beforeEach(() => {
  vi.stubEnv("POLAR_PRODUCT_STARTER", "prod_starter");
  vi.stubEnv("POLAR_PRODUCT_TOPUP_25", "prod_topup_25");
  auth.mockReset().mockResolvedValue({ userId: "user_1" });
  enforceRateLimit.mockReset().mockResolvedValue(null);
  createCheckout.mockReset().mockResolvedValue({ url: "https://polar.example/checkout/1" });
});

describe("billing return URLs", () => {
  it("checkout ignores a forged Origin header", async () => {
    await checkout.POST(formRequest("/api/billing/checkout", "plan", "starter", "https://evil.example"));

    expect(createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ success_url: "https://app.example.com/billing?success=true" }),
    );
  });

  it("topup ignores a forged Origin header", async () => {
    await topup.POST(formRequest("/api/billing/topup", "amount", "25", "https://evil.example"));

    expect(createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ success_url: "https://app.example.com/billing?topup=true" }),
    );
  });
});

describe("billing rate limit", () => {
  it("limits checkout per user", async () => {
    await checkout.POST(formRequest("/api/billing/checkout", "plan", "starter"));

    expect(enforceRateLimit).toHaveBeenCalledWith({
      key: "billing:user_1",
      limit: 10,
      windowSeconds: 60,
    });
  });

  it("returns the limiter response without creating a checkout", async () => {
    enforceRateLimit.mockResolvedValue(new Response(null, { status: 429 }));

    const res = await topup.POST(formRequest("/api/billing/topup", "amount", "25"));

    expect(res.status).toBe(429);
    expect(createCheckout).not.toHaveBeenCalled();
  });
});
