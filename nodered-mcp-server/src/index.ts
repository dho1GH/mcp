import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { registerNodeRedTools } from "./tools.js";
import type { Env } from "./types.js";

function createServer(env: Env): McpServer {
  const server = new McpServer({
    name: "nodered-mcp-server",
    version: "1.0.0",
  });
  registerNodeRedTools(server, env);
  return server;
}

/**
 * Constant-time-ish comparison to avoid trivial timing leaks on the shared
 * MCP_AUTH_TOKEN check. Not a substitute for real OAuth, but this server
 * sits behind Cloudflare (and optionally Access) already, so a single
 * shared secret checked here is the pragmatic floor, not the whole fence.
 */
function tokensMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function isAuthorized(request: Request, env: Env): boolean {
  const header = request.headers.get("Authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return false;
  return tokensMatch(token, env.MCP_AUTH_TOKEN);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response("ok", { status: 200 });
    }

    if (!isAuthorized(request, env)) {
      return new Response(
        JSON.stringify({ error: "unauthorized", message: "Missing or invalid Bearer token" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    return createMcpHandler(() => createServer(env))(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
