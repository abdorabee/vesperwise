import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  addToWatchlistTool,
  getAccountTool,
  getCompanyTool,
  getOpenerBriefTool,
  listWatchlistTool,
  McpToolError,
  prioritizeTool,
  removeFromWatchlistTool,
  scoreCompanyTool,
  scoreHistoryTool,
  whatsChangedTool,
  type McpUser,
} from "@/lib/mcp/tools";

const SERVER_INSTRUCTIONS = `VesperWise scores B2B companies 0-100 by purchase intent (HOT >= 75, WARM >= 50, COLD below) from funding, hiring, news and technology signals, personalized to this user's ICP.
Only score_company spends credits (1 per fresh score; a recent cached score is free). Everything else is free.
Prefer get_company before score_company, and ask the user before scoring more than 10 companies in one go.
For "what heated up", call whats_changed, then get_opener_brief for the accounts worth contacting, and write the opener yourself.`;

const domain = z.string().trim().min(1).max(2048).describe("Company domain or URL, e.g. stripe.com");

function ok(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

/** Turns expected failures into tool errors the model can read; rethrows nothing sensitive. */
async function run(label: string, fn: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    return ok(await fn());
  } catch (error) {
    if (error instanceof McpToolError) {
      return { isError: true, content: [{ type: "text", text: error.message }] };
    }
    console.error(`[mcp] ${label} failed`, error);
    return { isError: true, content: [{ type: "text", text: `${label} failed. Try again shortly.` }] };
  }
}

const READ_ONLY = { readOnlyHint: true, openWorldHint: false } as const;

export function createVesperwiseMcpServer(user: McpUser): McpServer {
  const server = new McpServer(
    { name: "vesperwise", version: "0.1.0" },
    { instructions: SERVER_INSTRUCTIONS }
  );

  server.registerTool(
    "score_company",
    {
      title: "Score a company",
      description:
        "Runs a fresh purchase-intent score for one company. Costs 1 credit unless a recent cached score exists. Takes up to ~45 seconds.",
      inputSchema: { domain, company: z.string().trim().min(1).max(200).optional().describe("Company name, if known") },
      annotations: { readOnlyHint: false, openWorldHint: true, idempotentHint: true },
    },
    async (args, extra) => {
      const progressToken = extra._meta?.progressToken;
      let done = 0;
      const onProgress =
        progressToken === undefined
          ? undefined
          : (event: { type: string; key?: string }) => {
              done += 1;
              void extra
                .sendNotification({
                  method: "notifications/progress",
                  params: {
                    progressToken,
                    progress: done,
                    message: event.type === "signal_done" && event.key ? `Checked ${event.key}` : event.type.replace(/_/g, " "),
                  },
                })
                .catch(() => {});
            };
      return run("score_company", () => scoreCompanyTool(user, args, onProgress));
    }
  );

  server.registerTool(
    "get_company",
    {
      title: "Get a company's latest score",
      description: "Returns the latest stored score for a company without re-scoring. Free.",
      inputSchema: { domain },
      annotations: READ_ONLY,
    },
    async (args) => run("get_company", () => getCompanyTool(user, args))
  );

  server.registerTool(
    "score_history",
    {
      title: "Score history",
      description: "Score and band for each scoring run of a company over the last 90 days. Free.",
      inputSchema: { domain },
      annotations: READ_ONLY,
    },
    async (args) => run("score_history", () => scoreHistoryTool(user, args))
  );

  server.registerTool(
    "list_watchlist",
    {
      title: "List tracked accounts",
      description: "The user's tracked accounts with score, previous score, band and pipeline stage. Free.",
      inputSchema: {
        band: z.enum(["HOT", "WARM", "COLD"]).optional(),
        stage: z.enum(["cold", "warming", "hot", "engaged", "converted"]).optional(),
      },
      annotations: READ_ONLY,
    },
    async (args) => run("list_watchlist", () => listWatchlistTool(user, args))
  );

  server.registerTool(
    "add_to_watchlist",
    {
      title: "Track an account",
      description: "Adds a company to the watchlist, within the plan's account limit. Free.",
      inputSchema: { domain, company: z.string().trim().min(1).max(200).optional() },
      annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (args) => run("add_to_watchlist", () => addToWatchlistTool(user, args))
  );

  server.registerTool(
    "remove_from_watchlist",
    {
      title: "Stop tracking an account",
      description: "Removes a company from the watchlist. Its score history is kept. Free.",
      inputSchema: { domain },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async (args) => run("remove_from_watchlist", () => removeFromWatchlistTool(user, args))
  );

  server.registerTool(
    "whats_changed",
    {
      title: "What changed on my accounts",
      description:
        "Tracked accounts whose score moved, that crossed into HOT, or that were newly scored in the last N days, plus accounts not re-scored in that window. Free.",
      inputSchema: {
        days: z.number().int().min(1).max(90).optional().describe("Look-back window in days (default 7)"),
        min_delta: z.number().int().min(0).max(100).optional().describe("Ignore moves smaller than this many points"),
      },
      annotations: READ_ONLY,
    },
    async (args) => run("whats_changed", () => whatsChangedTool(user, args))
  );

  server.registerTool(
    "prioritize",
    {
      title: "Rank a list of companies",
      description: "Ranks up to 200 domains by the user's stored scores and lists the ones not scored yet. Free; does not score.",
      inputSchema: { domains: z.array(z.string().trim().min(1).max(2048)).min(1).max(200) },
      annotations: READ_ONLY,
    },
    async (args) => run("prioritize", () => prioritizeTool(user, args))
  );

  server.registerTool(
    "get_opener_brief",
    {
      title: "Brief for an outreach opener",
      description:
        "The why-now, triggers, suggested subject and talk track for one scored company, so you can write the opener. Free.",
      inputSchema: {
        domain,
        tone: z.enum(["formal", "casual", "executive"]).optional(),
        angle: z.string().trim().max(300).optional().describe("A trigger or angle to emphasize"),
      },
      annotations: READ_ONLY,
    },
    async (args) => run("get_opener_brief", () => getOpenerBriefTool(user, args))
  );

  server.registerTool(
    "get_account",
    {
      title: "Plan and credits",
      description: "The user's plan, credits left, next reset and watchlist usage. Free.",
      inputSchema: {},
      annotations: READ_ONLY,
    },
    async () => run("get_account", () => getAccountTool(user))
  );

  server.registerPrompt(
    "morning_brief",
    {
      title: "Morning brief",
      description: "What heated up on my tracked accounts, with openers for the best ones",
    },
    () => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: "Call whats_changed for the last 7 days. For up to three accounts that became HOT or rose the most, call get_opener_brief and draft a short opener for each. List stale accounts at the end and ask before re-scoring any.",
          },
        },
      ],
    })
  );

  server.registerPrompt(
    "check_company",
    {
      title: "Check a company",
      description: "Look up a company and score it only if needed",
      argsSchema: { domain: z.string().describe("Company domain") },
    },
    ({ domain: target }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Call get_company for ${target}. If it is not found or older than 7 days, ask me before running score_company (1 credit). Then summarize why now and the recommended action.`,
          },
        },
      ],
    })
  );

  return server;
}
