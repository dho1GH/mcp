import type { ToolPolicy, ToolReference } from "../contracts/action";

export const TOOL_POLICIES = [
  {
    tool: { server: "infrastructure", name: "infra_get_status" },
    risk: "read",
    invokeScopes: ["infra:read"],
    approveScopes: [],
    approvalTtlSeconds: 900,
    policyVersion: "2026-08-11.1",
    retryMode: "safe",
  },
  {
    tool: { server: "infrastructure", name: "infra_restart_service" },
    risk: "privileged",
    invokeScopes: ["infra:propose"],
    approveScopes: ["infra:approve"],
    approvalTtlSeconds: 900,
    policyVersion: "2026-08-11.1",
    retryMode: "never",
  },
  {
    tool: { server: "home-assistant", name: "home_get_entity_state" },
    risk: "read",
    invokeScopes: ["home:read"],
    approveScopes: [],
    approvalTtlSeconds: 900,
    policyVersion: "2026-08-11.1",
    retryMode: "safe",
  },
  {
    tool: { server: "home-assistant", name: "home_call_service" },
    risk: "write",
    invokeScopes: ["home:propose"],
    approveScopes: ["home:approve"],
    approvalTtlSeconds: 300,
    policyVersion: "2026-08-11.1",
    retryMode: "never",
  },
  {
    tool: { server: "knowledge", name: "knowledge_search" },
    risk: "read",
    invokeScopes: ["knowledge:read"],
    approveScopes: [],
    approvalTtlSeconds: 900,
    policyVersion: "2026-08-11.1",
    retryMode: "safe",
  },
  {
    tool: { server: "knowledge", name: "knowledge_update_record" },
    risk: "write",
    invokeScopes: ["knowledge:propose"],
    approveScopes: ["knowledge:approve"],
    approvalTtlSeconds: 900,
    policyVersion: "2026-08-11.1",
    retryMode: "never",
  },
] as const satisfies readonly ToolPolicy[];

export function policyFor(tool: ToolReference): ToolPolicy | undefined {
  return TOOL_POLICIES.find(
    (policy) => policy.tool.server === tool.server && policy.tool.name === tool.name,
  );
}

