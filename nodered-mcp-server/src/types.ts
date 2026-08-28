// Cloudflare Worker environment bindings + secrets.
// Vars come from wrangler.toml [vars]; secrets are set via `wrangler secret put`.
export interface Env {
  NODE_RED_BASE_URL: string;
  NODE_RED_USERNAME: string;
  NODE_RED_PASSWORD: string;
  MCP_AUTH_TOKEN: string;
  CF_ACCESS_CLIENT_ID?: string;
  CF_ACCESS_CLIENT_SECRET?: string;
  MCP_OBJECT: DurableObjectNamespace;
}

// A single node within a Node-RED flow (tab). Node-RED nodes are loosely typed
// by design (each node type defines its own extra properties), so we keep the
// known/common fields explicit and allow the rest through.
export interface NodeRedNode {
  id: string;
  type: string;
  z?: string; // parent flow/tab id
  name?: string;
  x?: number;
  y?: number;
  wires?: string[][];
  [extra: string]: unknown;
}

// A flow "tab" is itself represented as a node of type "tab" in the flat array
// the admin API returns, but we model it distinctly for the tab-summary tool.
export interface FlowTab {
  id: string;
  type: "tab";
  label: string;
  disabled?: boolean;
  info?: string;
  [extra: string]: unknown;
}

export interface FlowsResponse {
  rev: string;
  flows: NodeRedNode[];
}

export interface AuthTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface InstalledNodeModule {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  local: boolean;
  types: string[];
  [extra: string]: unknown;
}
