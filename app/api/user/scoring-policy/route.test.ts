import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const auth = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({ auth: () => auth() }));
vi.mock("@/lib/supabase", () => ({ createSupabaseAdmin: () => ({}) }));

const { PUT, DELETE } = await import("./route");

function jsonRequest(method: string, body: string): NextRequest {
  return new NextRequest("http://localhost/api/user/scoring-policy", { method, body });
}

beforeEach(() => {
  auth.mockReset().mockResolvedValue({ userId: "user_1" });
});

describe("PUT /api/user/scoring-policy validation", () => {
  it("returns 400 Invalid JSON for a malformed body", async () => {
    const res = await PUT(jsonRequest("PUT", "{nope"));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Invalid JSON" });
  });

  it("returns 400 for wrong-typed fields", async () => {
    const res = await PUT(jsonRequest("PUT", JSON.stringify({ policy: {}, name: 5, active: "yes" })));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "Invalid request" });
  });

  it("returns 400 for an oversized name", async () => {
    const res = await PUT(jsonRequest("PUT", JSON.stringify({ policy: {}, name: "x".repeat(501) })));

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/user/scoring-policy validation", () => {
  it("returns 400 for a malformed body", async () => {
    const res = await DELETE(jsonRequest("DELETE", ""));

    expect(res.status).toBe(400);
  });

  it("returns 400 for a non-string id", async () => {
    const res = await DELETE(jsonRequest("DELETE", JSON.stringify({ id: 7 })));

    expect(res.status).toBe(400);
  });
});
