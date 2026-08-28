import type {
  InvocationDecision,
  Principal,
  ToolPolicy,
  ToolReference,
} from "../contracts/action";

function toolKey(tool: ToolReference): string {
  return `${tool.server}::${tool.name}`;
}

function hasAllScopes(principal: Principal, required: readonly string[]): boolean {
  const actual = new Set(principal.scopes);
  return required.every((scope) => actual.has(scope));
}

export class PolicyEngine {
  private readonly policies: ReadonlyMap<string, ToolPolicy>;

  constructor(policies: readonly ToolPolicy[]) {
    const entries = policies.map((policy) => [toolKey(policy.tool), policy] as const);
    if (new Set(entries.map(([key]) => key)).size !== entries.length) {
      throw new Error("Duplicate tool policy");
    }
    this.policies = new Map(entries);
  }

  evaluate(principal: Principal, tool: ToolReference): InvocationDecision {
    const policy = this.policies.get(toolKey(tool));
    if (!policy) return { outcome: "deny", reason: "unknown_tool" };

    if (principal.tenantId.length === 0 || principal.subject.length === 0) {
      return { outcome: "deny", reason: "invalid_identity" };
    }

    if (!hasAllScopes(principal, policy.invokeScopes)) {
      return { outcome: "deny", reason: "missing_invoke_scope" };
    }

    return policy.risk === "read"
      ? { outcome: "execute", policy }
      : { outcome: "propose", policy };
  }

  canApprove(principal: Principal, policy: ToolPolicy): boolean {
    return principal.kind === "human" && hasAllScopes(principal, policy.approveScopes);
  }
}

