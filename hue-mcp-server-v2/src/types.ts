export interface Env {
  HUE_BRIDGE_IP: string;
  HUE_APP_KEY: string;
  MCP_AUTH_TOKEN: string;
  CF_ACCESS_CLIENT_ID?: string;
  CF_ACCESS_CLIENT_SECRET?: string;
}

/**
 * Grant shape, matching the pattern established in hue-metadata-grant.json
 * and the wider agentic-control-plane authority model:
 * narrow scope, explicit allow/forbid lists, single-use or time-bound expiry.
 */
export interface Grant {
  grantId: string;
  scope: string;
  systems: string[];
  allowedOperations: string[];
  allowedTargets: string[]; // light/room/zone names or ids this grant covers; "*" means unrestricted within scope
  forbiddenSystems: string[];
  forbiddenOperations: string[];
  expires: "after_single_execution" | string; // ISO date, or the single-execution sentinel
  postAuditRequired: boolean;
  usedAt?: string; // set once consumed, for single-execution grants
}

export type HueOperation =
  | "read"
  | "metadata_write"
  | "state_write"
  | "scene_recall";

export interface HueLight {
  id: string;
  id_v1?: string;
  metadata?: { name?: string };
  on?: { on: boolean };
  dimming?: { brightness: number };
}

export interface AuditEntry {
  event_id: string;
  timestamp: string;
  tool: string;
  grant_id?: string;
  args: unknown;
  result: "allowed" | "blocked" | "executed" | "failed";
  detail?: string;
}
