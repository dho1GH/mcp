import type { AuthTokenResponse, Env, FlowsResponse, InstalledNodeModule, NodeRedNode } from "./types.js";

/**
 * Thin, typed client around the Node-RED Admin HTTP API.
 *
 * Node-RED is reached over its public hostname (via the existing Cloudflare
 * Tunnel), and is protected by `adminAuth` (username/password -> bearer
 * token), and optionally by Cloudflare Access service-token headers as a
 * second layer in front of the tunnel hostname itself.
 *
 * Token is cached in-memory for the lifetime of this object instance and
 * refreshed proactively before expiry, or reactively on a 401.
 */
export class NodeRedClient {
  private token: string | null = null;
  private tokenExpiresAt = 0; // epoch ms

  constructor(private readonly env: Env) {}

  private get baseUrl(): string {
    return this.env.NODE_RED_BASE_URL.replace(/\/+$/, "");
  }

  private accessHeaders(): Record<string, string> {
    const { CF_ACCESS_CLIENT_ID, CF_ACCESS_CLIENT_SECRET } = this.env;
    if (CF_ACCESS_CLIENT_ID && CF_ACCESS_CLIENT_SECRET) {
      return {
        "CF-Access-Client-Id": CF_ACCESS_CLIENT_ID,
        "CF-Access-Client-Secret": CF_ACCESS_CLIENT_SECRET,
      };
    }
    return {};
  }

  private async fetchToken(): Promise<string> {
    const res = await fetch(`${this.baseUrl}/auth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...this.accessHeaders(),
      },
      body: new URLSearchParams({
        client_id: "node-red-admin",
        grant_type: "password",
        scope: "*",
        username: this.env.NODE_RED_USERNAME,
        password: this.env.NODE_RED_PASSWORD,
      }),
    });

    if (!res.ok) {
      throw new Error(
        `Node-RED auth failed (${res.status}). Check NODE_RED_USERNAME/NODE_RED_PASSWORD secrets and that adminAuth is enabled in settings.js.`
      );
    }

    const data = (await res.json()) as AuthTokenResponse;
    this.token = data.access_token;
    // Refresh 60s before actual expiry to avoid racing a mid-request expiry.
    this.tokenExpiresAt = Date.now() + Math.max(data.expires_in - 60, 30) * 1000;
    return this.token;
  }

  private async ensureToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiresAt) {
      return this.token;
    }
    return this.fetchToken();
  }

  /**
   * Perform an authenticated request against the Node-RED admin API.
   * Retries once with a fresh token if the first attempt 401s.
   */
  private async request<T>(
    path: string,
    init: { method?: string; body?: unknown; extraHeaders?: Record<string, string> } = {}
  ): Promise<T> {
    const doRequest = async (token: string): Promise<Response> =>
      fetch(`${this.baseUrl}${path}`, {
        method: init.method ?? "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          ...this.accessHeaders(),
          ...(init.extraHeaders ?? {}),
        },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      });

    let token = await this.ensureToken();
    let res = await doRequest(token);

    if (res.status === 401) {
      // Token may have been invalidated server-side; force a refresh and retry once.
      this.token = null;
      token = await this.ensureToken();
      res = await doRequest(token);
    }

    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      throw new Error(
        `Node-RED API error ${res.status} on ${init.method ?? "GET"} ${path}: ${bodyText || res.statusText}`
      );
    }

    // Some endpoints (e.g. DELETE) return 204 with no body.
    if (res.status === 204) {
      return undefined as T;
    }
    return (await res.json()) as T;
  }

  // ---- Flows (full set) ----

  getFlows(): Promise<FlowsResponse> {
    return this.request<FlowsResponse>("/flows");
  }

  /**
   * Deploy a full flow set. `deploymentType` mirrors the Node-RED editor's
   * deploy modes:
   *  - "full": redeploy everything, restart all nodes
   *  - "nodes": only nodes whose config changed are restarted
   *  - "flows": only flows (tabs) whose config changed are restarted
   *  - "reload": reload from storage, discarding in-memory changes
   */
  deployFlows(
    flows: NodeRedNode[],
    rev: string,
    deploymentType: "full" | "nodes" | "flows" | "reload" = "full"
  ): Promise<FlowsResponse> {
    return this.request<FlowsResponse>("/flows", {
      method: "POST",
      body: { flows, rev },
      extraHeaders: { "Node-RED-Deployment-Type": deploymentType },
    });
  }

  // ---- Individual flow (tab) ----

  getFlow(id: string): Promise<NodeRedNode> {
    return this.request<NodeRedNode>(`/flow/${encodeURIComponent(id)}`);
  }

  createFlow(flow: Record<string, unknown>): Promise<{ id: string }> {
    return this.request<{ id: string }>("/flow", { method: "POST", body: flow });
  }

  updateFlow(id: string, flow: Record<string, unknown>): Promise<NodeRedNode> {
    return this.request<NodeRedNode>(`/flow/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: flow,
    });
  }

  deleteFlow(id: string): Promise<void> {
    return this.request<void>(`/flow/${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  // ---- Introspection ----

  getInstalledNodes(): Promise<InstalledNodeModule[]> {
    return this.request<InstalledNodeModule[]>("/nodes");
  }

  getRuntimeSettings(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("/settings");
  }
}
