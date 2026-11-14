import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const send = vi.fn();
const enforceRateLimit = vi.fn();

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: (...args: unknown[]) => send(...args) };
  },
}));
vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: (...args: unknown[]) => enforceRateLimit(...args),
  clientIpFromRequest: () => "203.0.113.9",
}));

const { POST } = await import("./route");

const SECRET_MESSAGE = "please call me about the confidential pricing";

function contactRequest(overrides: Record<string, unknown> = {}): NextRequest {
  return new NextRequest("http://localhost/api/contact", {
    method: "POST",
    body: JSON.stringify({
      reason: "demo",
      name: "Jane Doe",
      email: "jane@example.com",
      message: SECRET_MESSAGE,
      ...overrides,
    }),
  });
}

beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("CONTACT_TO_EMAIL", "inbox@example.com");
  vi.stubEnv("NODE_ENV", "production");
  send.mockReset().mockResolvedValue({ error: null });
  enforceRateLimit.mockReset().mockResolvedValue(null);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/contact", () => {
  it("sends to the configured recipient and rate limits by IP", async () => {
    const res = await POST(contactRequest());

    expect(res.status).toBe(200);
    expect(enforceRateLimit).toHaveBeenCalledWith({
      key: "contact:203.0.113.9",
      limit: 5,
      windowSeconds: 3600,
    });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: ["inbox@example.com"] }));
  });

  it("returns success without sending when the honeypot is filled", async () => {
    const res = await POST(contactRequest({ company_website: "https://spam.example" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(send).not.toHaveBeenCalled();
  });

  it("returns the limiter response when blocked", async () => {
    enforceRateLimit.mockResolvedValue(new Response(null, { status: 429 }));

    const res = await POST(contactRequest());

    expect(res.status).toBe(429);
    expect(send).not.toHaveBeenCalled();
  });

  it("returns 503 in production when CONTACT_TO_EMAIL is unset", async () => {
    vi.stubEnv("CONTACT_TO_EMAIL", "");
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(contactRequest());

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: "Contact form is not configured" });
    expect(send).not.toHaveBeenCalled();
  });

  it("returns 502 when Resend reports an error", async () => {
    send.mockResolvedValue({ error: { message: "domain not verified" } });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(contactRequest());

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({
      error: "Could not send your message. Please try again.",
    });
  });

  it("returns 502 when Resend throws", async () => {
    send.mockRejectedValue(new Error("network"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(contactRequest());

    expect(res.status).toBe(502);
  });

  it("logs only non-PII metadata in the non-production fallback", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "");
    const logs = [
      vi.spyOn(console, "log").mockImplementation(() => {}),
      vi.spyOn(console, "warn").mockImplementation(() => {}),
      vi.spyOn(console, "error").mockImplementation(() => {}),
    ];

    const res = await POST(contactRequest());

    expect(res.status).toBe(200);
    expect(send).not.toHaveBeenCalled();
    const logged = JSON.stringify(logs.flatMap((spy) => spy.mock.calls));
    expect(logged).toContain(String(SECRET_MESSAGE.length));
    expect(logged).not.toContain(SECRET_MESSAGE);
    expect(logged).not.toContain("jane@example.com");
    expect(logged).not.toContain("Jane Doe");
  });

  it("does not log the message when sending fails", async () => {
    send.mockRejectedValue(new Error("boom"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await POST(contactRequest());

    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(SECRET_MESSAGE);
  });

  it("rejects malformed JSON with 400", async () => {
    const req = new NextRequest("http://localhost/api/contact", { method: "POST", body: "{nope" });

    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});
