import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: "user_1" }) }));
vi.mock("@/lib/supabase", () => ({ createSupabaseAdmin: () => ({}) }));
vi.mock("@/lib/score-service", () => ({ scoreCompany: vi.fn(), domainToCompanyName: (d: string) => d }));
vi.mock("@/lib/score-transition", () => ({ evaluateV2ScoreTransition: vi.fn() }));

const { POST } = await import("./route");
const call = (body: string) =>
  POST(new NextRequest("http://localhost/api/autopilot/test", { method: "POST", body }));

describe("POST /api/autopilot/test", () => {
  it("returns 400 for invalid JSON", async () => {
    const res = await call("not json");
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON" });
  });

  it("returns 400 for a missing or mistyped body", async () => {
    const res = await call(JSON.stringify({ workflow_id: 5 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid request");
  });
});
