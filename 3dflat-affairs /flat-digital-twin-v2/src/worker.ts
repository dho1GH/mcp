/**
 * Cloudflare Worker — Flat Digital Twin
 * 
 * Routes:
 *   GET  /              → 3D interactive viewer (index.html)
 *   GET  /api/graph     → Full spatial graph JSON
 *   POST /api/mcp       → MCP-compatible tool endpoint
 *   GET  /api/rooms     → List all rooms
 *   GET  /api/rooms/:id → Room detail
 *   GET  /api/health    → Health check
 */

import { FlatGraph, TOOLS, handleTool } from "./mcp-server";
import graphData from "../spatial_graph.json";

const graph = new FlatGraph(graphData as any);

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for MCP clients
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // ---- API Routes ----

    if (path === "/api/health") {
      return json({ status: "ok", version: "1.0.0", tools: TOOLS.length }, corsHeaders);
    }

    if (path === "/api/graph") {
      return json(graphData, corsHeaders);
    }

    if (path === "/api/rooms") {
      const rooms = graph.getRooms().map(r => r.properties);
      return json({ rooms }, corsHeaders);
    }

    if (path === "/api/tools") {
      return json({ tools: TOOLS }, corsHeaders);
    }

    // MCP endpoint
    if (path === "/api/mcp" && request.method === "POST") {
      try {
        const body = await request.json() as { tool: string; arguments: Record<string, any> };
        const result = handleTool(graph, body.tool, body.arguments || {});
        return json({ result }, corsHeaders);
      } catch (e: any) {
        return json({ error: e.message }, corsHeaders, 400);
      }
    }

    // ---- Serve static viewer ----
    // In production, serve from R2 or KV. For now, inline.
    if (path === "/" || path === "/index.html") {
      return new Response(VIEWER_HTML, {
        headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders }
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

// The viewer HTML will be injected at build time or served from KV/R2
const VIEWER_HTML = `<!-- See public/index.html — this placeholder is replaced at build -->`;
