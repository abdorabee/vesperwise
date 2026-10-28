import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticateApiKey, bearerToken } from "@/lib/api-key-auth";
import { createVesperwiseMcpServer } from "@/lib/mcp/server";
import { loadMcpUser } from "@/lib/mcp/tools";

// score_company can take as long as POST /api/v1/score.
export const maxDuration = 45;

function jsonRpcError(status: number, message: string, headers?: Record<string, string>): Response {
  return Response.json(
    { jsonrpc: "2.0", error: { code: status === 401 ? -32001 : -32000, message }, id: null },
    { status, headers }
  );
}

/**
 * VesperWise MCP server (Streamable HTTP, stateless). Each request is
 * authenticated with a VesperWise API key and gets its own server instance,
 * so no session state lives between calls.
 */
export async function POST(req: Request): Promise<Response> {
  const apiKey = bearerToken(req.headers.get("authorization"));
  const userId = apiKey ? await authenticateApiKey(apiKey) : null;
  if (!userId) {
    return jsonRpcError(401, "Missing or invalid VesperWise API key. Create one at https://www.vesperwise.com/api-keys.", {
      "WWW-Authenticate": 'Bearer realm="vesperwise"',
    });
  }

  const user = await loadMcpUser(userId);
  if (!user) return jsonRpcError(401, "Workspace user was not found.");

  const server = createVesperwiseMcpServer(user);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  return transport.handleRequest(req);
}

// Stateless server: no standalone SSE stream and no sessions to end.
function methodNotAllowed(): Response {
  return jsonRpcError(405, "Method not allowed. Send MCP requests with POST.", { Allow: "POST" });
}

export const GET = methodNotAllowed;
export const DELETE = methodNotAllowed;
