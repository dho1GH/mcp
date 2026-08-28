/**
 * Cloudflare Worker — Flat Digital Twin v2
 * 
 * Routes:
 *   GET  /              → 3D interactive viewer
 *   GET  /api/graph     → Full spatial graph v2 JSON
 *   POST /api/mcp       → MCP tool endpoint (10 tools)
 *   GET  /api/rooms     → Room list with codes
 *   GET  /api/tools     → Available MCP tools
 *   GET  /api/health    → Health check
 */

import { FlatGraphV2, TOOLS_V2, handleToolV2 } from "./mcp-server-v2";
import graphData from "../spatial_graph_v2.json";

const graph = new FlatGraphV2(graphData as any);

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    if (path === "/api/health") {
      return json({ status: "ok", version: "2.0.0", schema: graphData.schema, tools: TOOLS_V2.length }, cors);
    }

    if (path === "/api/graph") {
      return json(graphData, cors);
    }

    if (path === "/api/rooms") {
      const rooms = Object.entries(graphData.rooms).map(([id, r]: [string, any]) => ({
        id, code: r.code, name: r.name, kind: r.kind
      }));
      return json({ rooms }, cors);
    }

    if (path === "/api/tools") {
      return json({ tools: TOOLS_V2 }, cors);
    }

    if (path === "/api/mcp" && request.method === "POST") {
      try {
        const body = await request.json() as { tool: string; arguments: Record<string, any> };
        const result = handleToolV2(graph, body.tool, body.arguments || {});
        return json({ result }, cors);
      } catch (e: any) {
        return json({ error: e.message }, cors, 400);
      }
    }

    // Serve static viewer
    if (path === "/" || path === "/index.html") {
      // In production, serve from R2/KV or static assets
      return new Response("<!-- Serve public/index.html -->", {
        headers: { "Content-Type": "text/html; charset=utf-8", ...cors }
      });
    }

    return new Response("Not Found", { status: 404 });
  }
};

function json(data: any, cors: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...cors }
  });
}
