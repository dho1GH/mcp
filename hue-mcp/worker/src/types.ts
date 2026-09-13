export interface Env {
  HUE_EXECUTOR_BASE_URL: string;
  HUE_EXECUTOR_BEARER_TOKEN: string;
  MCP_AUTH_TOKEN: string;
  AUDIT_LOG: KVNamespace;
}

export interface AuditEntry {
  event_id: string;
  timestamp: string;
  tool: string;
  args: unknown;
  result: "executed" | "failed";
  detail?: string;
  duration_ms: number;
}
