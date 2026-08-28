import { HueClient } from "./hue-client";
import { toolDefinitions, callTool } from "./tools";
import type { Env } from "./types";

interface WorkerEnv extends Env {
  AUDIT_LOG: KVNamespace;
}

function unauthorized() {
  return new Response("Unauthorized", { status: 401 });
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response("ok");
    }

    if (url.pathname !== "/mcp") {
      return new Response("Not found", { status: 404 });
    }

    const authHeader = request.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!env.MCP_AUTH_TOKEN || token !== env.MCP_AUTH_TOKEN) {
      return unauthorized();
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const body = (await request.json()) as { jsonrpc: string; id: number | string; method: string; params?: any };

    if (body.method === "tools/list") {
      return Response.json({
        jsonrpc: "2.0",
        id: body.id,
        result: { tools: toolDefinitions },
      });
    }

    if (body.method === "tools/call") {
      const hue = new HueClient(env);
      try {
        const result = await callTool(
          { env, audit: env.AUDIT_LOG, hue },
          body.params.name,
          body.params.arguments ?? {}
        );
        return Response.json({
          jsonrpc: "2.0",
          id: body.id,
          result: { content: [{ type: "text", text: JSON.stringify(result) }] },
        });
      } catch (error) {
        return Response.json({
          jsonrpc: "2.0",
          id: body.id,
          error: { code: -32000, message: error instanceof Error ? error.message : String(error) },
        });
      }
    }

    return Response.json({
      jsonrpc: "2.0",
      id: body.id,
      error: { code: -32601, message: `Unknown method: ${body.method}` },
    });
  },
};
