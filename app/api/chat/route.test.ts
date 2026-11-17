import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const authMock = vi.fn();
const rpc = vi.fn();
const streamTextMock = vi.fn();
const rateLimitMock = vi.fn();
const sessionInsert = vi.fn();
let userRow: Record<string, unknown> | null = null;

vi.mock("@clerk/nextjs/server", () => ({ auth: () => authMock() }));
vi.mock("@/lib/rate-limit", () => ({
  enforcePlanRateLimit: (...args: unknown[]) => rateLimitMock(...args),
}));
vi.mock("@/lib/copilot", () => ({
  buildCopilotContext: async () => ({ recentScores: [], watchlist: [] }),
  buildCopilotSystemPrompt: () => "system",
}));
vi.mock("@/lib/copilot-ai-tools", () => ({ copilotSdkTools: () => ({}) }));
vi.mock("@ai-sdk/openai", () => ({ createOpenAI: () => ({ chat: () => "model" }) }));
vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  streamText: (...args: unknown[]) => streamTextMock(...args),
}));

function chain(result: unknown) {
  const node: Record<string, unknown> = {};
  for (const method of ["select", "eq", "order", "limit", "update"]) node[method] = () => node;
  node.single = async () => result;
  node.maybeSingle = async () => result;
  node.then = (resolve: (value: unknown) => unknown) => resolve(result);
  return node;
}

vi.mock("@/lib/supabase", () => ({
  createSupabaseAdmin: () => ({
    rpc: (...args: unknown[]) => rpc(...args),
    from: (table: string) => {
      if (table === "users") return chain({ data: userRow, error: null });
      if (table === "chat_sessions") {
        return {
          ...chain({ data: null, error: null }),
          insert: (row: unknown) => ({ select: () => ({ single: async () => sessionInsert(row) }) }),
        };
      }
      return { ...chain({ data: [], error: null }), insert: async () => ({ error: null }) };
    },
  }),
}));

const { POST } = await import("./route");

const SECRET = "SECRET provider detail sk-123";

function jsonRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function imageRequest(file: File): NextRequest {
  const form = new FormData();
  form.set("message", "look");
  form.set("image", file);
  return new NextRequest("http://localhost/api/chat", { method: "POST", body: form });
}

async function* okStream() {
  yield { type: "text-delta", text: "hi" };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.stubEnv("OPENROUTER_API_KEY", "test-key");
  authMock.mockResolvedValue({ userId: "user_1" });
  userRow = { id: "user_1", plan: "free", role: "ae", credits_remaining: 5, product_category: null, business_profile: null };
  rateLimitMock.mockResolvedValue(null);
  rpc.mockResolvedValue({ error: null });
  sessionInsert.mockReturnValue({ data: { id: "sess_1" }, error: null });
  streamTextMock.mockReturnValue({ fullStream: okStream() });
});

describe("POST /api/chat validation", () => {
  it("returns 401 when unauthenticated", async () => {
    authMock.mockResolvedValue({ userId: null });
    expect((await POST(jsonRequest({ message: "hi" }))).status).toBe(401);
  });

  it("returns 400 for invalid JSON", async () => {
    expect((await POST(jsonRequest("{nope"))).status).toBe(400);
  });

  it("returns 400 for a non-string message", async () => {
    expect((await POST(jsonRequest({ message: 42 }))).status).toBe(400);
  });

  it("returns 400 for an oversized message", async () => {
    expect((await POST(jsonRequest({ message: "a".repeat(8_001) }))).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns 400 for a disallowed image type", async () => {
    const res = await POST(imageRequest(new File(["x"], "a.svg", { type: "image/svg+xml" })));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an oversized image", async () => {
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "a.png", { type: "image/png" });
    const res = await POST(imageRequest(big));
    expect([400, 413]).toContain(res.status);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("POST /api/chat gating", () => {
  it("returns the limiter response when rate limited, before any work", async () => {
    rateLimitMock.mockResolvedValue(NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 }));
    const res = await POST(jsonRequest({ message: "hi" }));
    expect(res.status).toBe(429);
    expect(rateLimitMock).toHaveBeenCalledWith("user_1", "free", "chat");
    expect(rpc).not.toHaveBeenCalled();
    expect(streamTextMock).not.toHaveBeenCalled();
  });

  it("returns 402 and never calls the model when the atomic deduction fails", async () => {
    rpc.mockResolvedValue({ error: { message: "insufficient_credits", code: "P0001" } });
    const res = await POST(jsonRequest({ message: "hi" }));
    expect(res.status).toBe(402);
    expect(await res.json()).toEqual({ error: "Insufficient credits", code: "insufficient_credits" });
    expect(streamTextMock).not.toHaveBeenCalled();
  });

  it("returns 500 for other deduction failures", async () => {
    rpc.mockResolvedValue({ error: { message: "boom", code: "XX000" } });
    expect((await POST(jsonRequest({ message: "hi" }))).status).toBe(500);
    expect(streamTextMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/chat streaming", () => {
  it("streams text, charges once and does not refund on success", async () => {
    const res = await POST(jsonRequest({ message: "hi" }));
    const text = await res.text();
    expect(text).toContain('"type":"text"');
    expect(text).toContain('"type":"done"');
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("deduct_chat_credit", expect.anything());
  });

  it("never leaks the raw error and refunds when the model fails before output", async () => {
    streamTextMock.mockImplementation(() => {
      throw new Error(SECRET);
    });
    const res = await POST(jsonRequest({ message: "hi" }));
    const text = await res.text();
    expect(text).toContain('"type":"error"');
    expect(text).not.toContain("SECRET");
    expect(rpc).toHaveBeenCalledWith("increment_credits", expect.objectContaining({ p_user_id: "user_1" }));
  });

  it("does not leak stream error parts and does not refund once output was produced", async () => {
    streamTextMock.mockReturnValue({
      fullStream: (async function* () {
        yield { type: "text-delta", text: "partial" };
        yield { type: "error", error: new Error(SECRET) };
      })(),
    });
    const text = await (await POST(jsonRequest({ message: "hi" }))).text();
    expect(text).not.toContain("SECRET");
    expect(text).toContain("The AI service is unavailable.");
    expect(rpc).not.toHaveBeenCalledWith("increment_credits", expect.anything());
  });
});
