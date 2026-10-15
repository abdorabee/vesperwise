import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ authenticateApiKey: vi.fn() }));
const users = vi.hoisted(() => ({ loadMcpUser: vi.fn() }));

vi.mock("@/lib/api-key-auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api-key-auth")>()),
  authenticateApiKey: auth.authenticateApiKey,
}));
vi.mock("@/lib/mcp/tools", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mcp/tools")>()),
  loadMcpUser: users.loadMcpUser,
}));
vi.mock("@/lib/supabase", () => ({ createSupabaseAdmin: vi.fn() }));

import { GET, POST } from "@/app/api/mcp/route";

const initialize = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } },
};

function mcpRequest(key?: string) {
  return new Request("https://www.vesperwise.com/api/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...(key ? { authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify(initialize),
  });
}

describe("/api/mcp", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a request without an API key", async () => {
    const res = await POST(mcpRequest());
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain("Bearer");
    expect(auth.authenticateApiKey).not.toHaveBeenCalled();
  });

  it("rejects a revoked or unknown key", async () => {
    auth.authenticateApiKey.mockResolvedValue(null);
    const res = await POST(mcpRequest("vesperwise_revoked"));
    expect(res.status).toBe(401);
    expect(auth.authenticateApiKey).toHaveBeenCalledWith("vesperwise_revoked");
  });

  it("initializes an MCP session for a valid key", async () => {
    auth.authenticateApiKey.mockResolvedValue("user_1");
    users.loadMcpUser.mockResolvedValue({ userId: "user_1", plan: "free", productCategory: "B2B SaaS", businessProfile: null });

    const res = await POST(mcpRequest("vesperwise_good"));
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('"name":"vesperwise"');
  });

  it("does not offer a standalone stream", async () => {
    const res = await GET();
    expect(res.status).toBe(405);
  });
});
