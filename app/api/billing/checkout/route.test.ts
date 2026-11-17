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

const JSON_ACCEPT = "application/json";

function formRequest(path: string, field: string, value: string, origin?: string, accept?: string): NextRequest {
  const body = new URLSearchParams({ [field]: value });
  return new NextRequest(`https://app.example.com${path}`, {
    method: "POST",
    body,
    headers: { ...(origin ? { origin } : {}), ...(accept ? { accept } : {}) },
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

  it("redirects a form navigation back to billing with a rate-limit code", async () => {
    enforceRateLimit.mockResolvedValue(new Response(null, { status: 429 }));

    const res = await topup.POST(formRequest("/api/billing/topup", "amount", "25"));

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://app.example.com/billing?error=rate_limited");
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("still returns the limiter response to a JSON client", async () => {
    enforceRateLimit.mockResolvedValue(new Response(null, { status: 429 }));

    const res = await topup.POST(formRequest("/api/billing/topup", "amount", "25", undefined, JSON_ACCEPT));

    expect(res.status).toBe(429);
    expect(createCheckout).not.toHaveBeenCalled();
  });
});

describe("billing failures", () => {
  it("redirects a form navigation with an invalid plan to /billing?error=invalid_plan", async () => {
    const res = await checkout.POST(formRequest("/api/billing/checkout", "plan", "nope"));

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://app.example.com/billing?error=invalid_plan");
  });

  it("redirects a form navigation with an invalid top-up amount", async () => {
    const res = await topup.POST(formRequest("/api/billing/topup", "amount", "999"));

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://app.example.com/billing?error=invalid_amount");
  });

  it("redirects when payments are not configured", async () => {
    vi.stubEnv("POLAR_PRODUCT_STARTER", "");
    const res = await checkout.POST(formRequest("/api/billing/checkout", "plan", "starter"));

    expect(res.headers.get("location")).toBe("https://app.example.com/billing?error=not_configured");
  });

  it("redirects when Polar fails", async () => {
    createCheckout.mockRejectedValue(new Error("polar down"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = await checkout.POST(formRequest("/api/billing/checkout", "plan", "starter"));

    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://app.example.com/billing?error=checkout_failed");
  });

  it("keeps JSON errors for a JSON client", async () => {
    const res = await checkout.POST(formRequest("/api/billing/checkout", "plan", "nope", undefined, JSON_ACCEPT));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid plan" });
  });

  it("keeps JSON for an unauthenticated JSON client and redirects a form", async () => {
    auth.mockResolvedValue({ userId: null });
    const json = await checkout.POST(formRequest("/api/billing/checkout", "plan", "starter", undefined, JSON_ACCEPT));
    expect(json.status).toBe(401);
    const form = await checkout.POST(formRequest("/api/billing/checkout", "plan", "starter"));
    expect(form.headers.get("location")).toBe("https://app.example.com/billing?error=unauthorized");
  });
});

describe("billing success path", () => {
  it("still 303-redirects to Polar for checkout and top-up", async () => {
    const plan = await checkout.POST(formRequest("/api/billing/checkout", "plan", "starter"));
    const pack = await topup.POST(formRequest("/api/billing/topup", "amount", "25"));

    expect(plan.status).toBe(303);
    expect(plan.headers.get("location")).toBe("https://polar.example/checkout/1");
    expect(pack.status).toBe(303);
    expect(pack.headers.get("location")).toBe("https://polar.example/checkout/1");
  });
});
