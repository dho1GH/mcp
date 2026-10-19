import { McpServer } from "@modelcontextprotocol/server";
import { createMcpHandler } from "agents/mcp/server";
import { registerHueTools } from "./tools.js";
import type { Env } from "./types.js";

function createServer(env: Env): McpServer {
  const server = new McpServer({
    name: "hue-mcp-server",
    version: "1.0.0",
  });
  registerHueTools(server, env);
  return server;
}

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
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    return createMcpHandler(() => createServer(env))(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
