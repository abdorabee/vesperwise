import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const tools = vi.hoisted(() => ({
  scoreCompanyTool: vi.fn(),
  getCompanyTool: vi.fn(),
  scoreHistoryTool: vi.fn(),
  listWatchlistTool: vi.fn(),
  addToWatchlistTool: vi.fn(),
  removeFromWatchlistTool: vi.fn(),
  whatsChangedTool: vi.fn(),
  prioritizeTool: vi.fn(),
  getOpenerBriefTool: vi.fn(),
  getAccountTool: vi.fn(),
}));

vi.mock("@/lib/mcp/tools", async () => {
  class McpToolError extends Error {
    constructor(message: string, public readonly code: string) {
      super(message);
    }
  }
  return { ...tools, McpToolError };
});

import { createVesperwiseMcpServer } from "@/lib/mcp/server";
import { McpToolError, type McpUser } from "@/lib/mcp/tools";

const user: McpUser = { userId: "user_1", plan: "starter", productCategory: "B2B SaaS", businessProfile: null };

async function connect() {
  const server = createVesperwiseMcpServer(user);
  const client = new Client({ name: "test", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

describe("VesperWise MCP server", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists the v0 tools and marks only scoring as not read-only", async () => {
    const client = await connect();
    const { tools: listed } = await client.listTools();

    expect(listed.map((t) => t.name).sort()).toEqual([
      "add_to_watchlist",
      "get_account",
      "get_company",
      "get_opener_brief",
      "list_watchlist",
      "prioritize",
      "remove_from_watchlist",
      "score_company",
      "score_history",
      "whats_changed",
    ]);
    const readOnly = listed.filter((t) => t.annotations?.readOnlyHint).map((t) => t.name);
    expect(readOnly).not.toContain("score_company");
    expect(readOnly).toContain("whats_changed");
  });

  it("passes the authenticated user, never a model-supplied one, to tools", async () => {
    tools.getCompanyTool.mockResolvedValue({ found: true, domain: "stripe.com", intent_score: 81 });
    const client = await connect();

    const result = await client.callTool({ name: "get_company", arguments: { domain: "stripe.com" } });

    expect(tools.getCompanyTool).toHaveBeenCalledWith(user, { domain: "stripe.com" });
    expect(result.isError).toBeFalsy();
    expect(JSON.parse((result.content as Array<{ text: string }>)[0].text)).toMatchObject({ intent_score: 81 });
  });

  it("returns expected failures as readable tool errors", async () => {
    tools.scoreCompanyTool.mockRejectedValue(new McpToolError("Out of credits (0 left).", "insufficient_credits"));
    const client = await connect();

    const result = await client.callTool({ name: "score_company", arguments: { domain: "acme.com" } });

    expect(result.isError).toBe(true);
    expect((result.content as Array<{ text: string }>)[0].text).toBe("Out of credits (0 left).");
  });

  it("hides unexpected errors behind a generic message", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    tools.getAccountTool.mockRejectedValue(new Error("connection string leaked"));
    const client = await connect();

    const result = await client.callTool({ name: "get_account", arguments: {} });

    expect(result.isError).toBe(true);
    expect((result.content as Array<{ text: string }>)[0].text).toBe("get_account failed. Try again shortly.");
    spy.mockRestore();
  });

  it("offers the morning brief prompt", async () => {
    const client = await connect();
    const { prompts } = await client.listPrompts();
    expect(prompts.map((p) => p.name)).toEqual(["morning_brief", "check_company"]);
  });
});
