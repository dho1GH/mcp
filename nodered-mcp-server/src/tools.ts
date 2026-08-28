import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { NodeRedClient } from "./nodered-client.js";
import type { Env, FlowTab, NodeRedNode } from "./types.js";

const CHARACTER_LIMIT = 25_000;

function truncated(text: string): string {
  if (text.length <= CHARACTER_LIMIT) return text;
  return `${text.slice(0, CHARACTER_LIMIT)}\n\n...[truncated ${
    text.length - CHARACTER_LIMIT
  } characters. Use a more specific tool (e.g. nodered_get_flow with a tab id) to see full detail.]`;
}

/** Successful tool result: text for the model to read, plus structured data for clients that want it. */
function textResult(text: string, structuredContent?: unknown) {
  return {
    content: [{ type: "text" as const, text }],
    ...(structuredContent !== undefined ? { structuredContent } : {}),
  };
}

/** Failed tool result, matching the MCP SDK's expected error shape. */
function errorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true,
  };
}

/**
 * Registers every Node-RED tool on the given MCP server instance.
 * Called once per request from the stateless handler factory in index.ts.
 */
export function registerNodeRedTools(server: McpServer, env: Env): void {
  const client = new NodeRedClient(env);

  // ---- Read-only: full flow set ----
  server.registerTool(
    "nodered_get_flows",
    {
      title: "Get all Node-RED flows",
      description: `Fetch the complete Node-RED flow configuration: every tab, node, and wire, plus the current revision id ("rev").

The "rev" value MUST be passed back unchanged to nodered_deploy_flows when deploying, so Node-RED can detect if someone else changed flows in between (optimistic concurrency).

Returns: { rev: string, flows: NodeRedNode[] } as JSON text. This can be large on complex installs; prefer nodered_list_flow_tabs for an overview, or nodered_get_flow for a single tab.`,
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async () => {
      try {
        const data = await client.getFlows();
        return textResult(truncated(JSON.stringify(data)), data);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  // ---- Read-only: tab summary (agent-friendly overview) ----
  server.registerTool(
    "nodered_list_flow_tabs",
    {
      title: "List Node-RED flow tabs (overview)",
      description: `Fetch a concise summary of every flow tab: id, label, enabled/disabled state, and how many nodes live on it.

Use this FIRST when you need to orient yourself before editing, instead of pulling the entire flow set with nodered_get_flows. Once you know which tab you need, use nodered_get_flow with its id.

Returns: JSON array of { id, label, disabled, nodeCount }.`,
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async () => {
      try {
        const { flows } = await client.getFlows();
        const tabs = flows.filter((n): n is FlowTab => n.type === "tab");
        const summary = tabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          disabled: Boolean(tab.disabled),
          nodeCount: flows.filter((n) => n.z === tab.id).length,
        }));
        return textResult(JSON.stringify(summary, null, 2), { tabs: summary });
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  // ---- Read-only: single tab ----
  server.registerTool(
    "nodered_get_flow",
    {
      title: "Get a single Node-RED flow tab",
      description: `Fetch one flow tab's node configuration by its tab id (use nodered_list_flow_tabs to find ids).

Returns: the flow tab configuration as JSON, including its own metadata (label, disabled) -- note this does NOT include the child nodes on the tab; those come back as part of nodered_get_flows filtered by "z" == this tab id, or use nodered_get_flows and filter client-side for full detail on this tab's contents.

Args:
  - id (string, required): the tab's id, e.g. "a1b2c3d4.ef5678"`,
      inputSchema: { id: z.string().min(1).describe("Flow tab id") },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ id }: { id: string }) => {
      try {
        const flow = await client.getFlow(id);
        return textResult(JSON.stringify(flow, null, 2), flow as unknown as Record<string, unknown>);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  // ---- Destructive: full deploy ----
  server.registerTool(
    "nodered_deploy_flows",
    {
      title: "Deploy the full Node-RED flow set",
      description: `Replace ALL flows in Node-RED with the provided flow set and deploy them. This is the same action as pressing "Deploy" in the Node-RED editor with the full flow set loaded.

This is DESTRUCTIVE: anything not included in "flows" will be removed. Always call nodered_get_flows immediately before this to get the current "rev" and the full current flow array, modify only what's needed, and pass the complete resulting array back -- never a partial one.

Args:
  - flows (array, required): the COMPLETE array of flow/tab/node objects, as returned by nodered_get_flows, with your changes applied.
  - rev (string, required): the revision id from your most recent nodered_get_flows call. If it's stale (someone else deployed in between), Node-RED will reject this and you should re-fetch and retry.
  - deploymentType ('full' | 'nodes' | 'flows' | 'reload', optional, default 'full'): mirrors the Node-RED editor's deploy modes. 'full' restarts everything and is the safest default; 'nodes' or 'flows' only restart what changed.

Returns: the new { rev } after deploy on success.

Error Handling:
  - Returns "Error: Node-RED API error 409..." if the rev is stale -- re-fetch flows and retry with the new rev.`,
      inputSchema: {
        flows: z.array(z.record(z.string(), z.unknown())).min(1).describe("Complete flow set (tabs + nodes) to deploy"),
        rev: z.string().min(1).describe("Revision id from the most recent nodered_get_flows call"),
        deploymentType: z.enum(["full", "nodes", "flows", "reload"]).default("full"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
    },
    async ({
      flows,
      rev,
      deploymentType,
    }: {
      flows: Record<string, unknown>[];
      rev: string;
      deploymentType: "full" | "nodes" | "flows" | "reload";
    }) => {
      try {
        const result = await client.deployFlows(flows as unknown as NodeRedNode[], rev, deploymentType);
        return textResult(`Deployed successfully. New rev: ${result.rev}`, result as unknown as Record<string, unknown>);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  // ---- Destructive: create tab ----
  server.registerTool(
    "nodered_create_flow",
    {
      title: "Create a new Node-RED flow tab",
      description: `Create a brand-new flow tab (with optional nodes already on it) without touching any other existing tab. Safer than nodered_deploy_flows when you only need to ADD a new tab.

Args:
  - flow (object, required): a flow tab definition, e.g. { "label": "Kitchen Lighting", "nodes": [...] }. Node-RED assigns the tab its id.

Returns: { id } of the newly created tab.`,
      inputSchema: { flow: z.record(z.string(), z.unknown()).describe("New flow tab definition (label, nodes, etc.)") },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ flow }: { flow: Record<string, unknown> }) => {
      try {
        const result = await client.createFlow(flow);
        return textResult(`Created flow tab with id: ${result.id}`, result);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  // ---- Destructive: update single tab ----
  server.registerTool(
    "nodered_update_flow",
    {
      title: "Update a single Node-RED flow tab",
      description: `Replace one flow tab's contents (its nodes and metadata) by id, without touching any other tab. Safer than nodered_deploy_flows for a change scoped to one tab.

Args:
  - id (string, required): the tab id to update (see nodered_list_flow_tabs).
  - flow (object, required): the full replacement definition for this tab, including all nodes that should remain on it.

Returns: the updated flow tab.`,
      inputSchema: {
        id: z.string().min(1).describe("Flow tab id to update"),
        flow: z.record(z.string(), z.unknown()).describe("Complete replacement definition for this tab"),
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ id, flow }: { id: string; flow: Record<string, unknown> }) => {
      try {
        const result = await client.updateFlow(id, flow);
        return textResult(`Updated flow tab ${id}`, result as unknown as Record<string, unknown>);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  // ---- Destructive: delete tab ----
  server.registerTool(
    "nodered_delete_flow",
    {
      title: "Delete a Node-RED flow tab",
      description: `Permanently delete a flow tab and every node on it. This cannot be undone from Node-RED's side -- if you need a rollback path, call nodered_get_flow first and keep the result.

Args:
  - id (string, required): the tab id to delete.`,
      inputSchema: { id: z.string().min(1).describe("Flow tab id to delete") },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    },
    async ({ id }: { id: string }) => {
      try {
        await client.deleteFlow(id);
        return textResult(`Deleted flow tab ${id}`);
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  // ---- Read-only: installed node types ----
  server.registerTool(
    "nodered_list_installed_nodes",
    {
      title: "List installed Node-RED node types",
      description: `List every node module installed in this Node-RED instance and the node "type" strings each one provides (e.g. "hue-bridge", "inject", "function").

Call this BEFORE writing new flow JSON that references a node type you haven't confirmed exists -- referencing an uninstalled type will deploy but show as broken in the editor.

Returns: JSON array of { id, name, version, enabled, types: string[] }.`,
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async () => {
      try {
        const nodes = await client.getInstalledNodes();
        const summary = nodes.map((n) => ({
          id: n.id,
          name: n.name,
          version: n.version,
          enabled: n.enabled,
          types: n.types,
        }));
        return textResult(truncated(JSON.stringify(summary, null, 2)), { modules: summary });
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  // ---- Read-only: runtime settings ----
  server.registerTool(
    "nodered_get_runtime_settings",
    {
      title: "Get Node-RED runtime settings",
      description: `Fetch the safe, non-secret subset of Node-RED's runtime settings (version, editor theme config, context storage config, etc.) exposed via the admin API. Useful for confirming the target instance/version before writing version-specific flow JSON.

Returns: JSON object of runtime settings.`,
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async () => {
      try {
        const settings = await client.getRuntimeSettings();
        return textResult(truncated(JSON.stringify(settings, null, 2)), settings);
      } catch (err) {
        return errorResult(err);
      }
    }
  );
}
