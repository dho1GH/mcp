export const RISK_CLASSES = [
  "read",
  "write",
  "privileged",
  "destructive",
  "external",
] as const;

export type RiskClass = (typeof RISK_CLASSES)[number];

export type PrincipalKind = "human" | "mcp_client" | "service";

export type Principal = {
  tenantId: string;
  subject: string;
  kind: PrincipalKind;
  scopes: readonly string[];
};

export type ToolReference = {
  server: string;
  name: string;
};

export type ToolPolicy = {
  tool: ToolReference;
  risk: RiskClass;
  invokeScopes: readonly string[];
  approveScopes: readonly string[];
  approvalTtlSeconds: number;
  policyVersion: string;
  retryMode: "safe" | "never";
};

export type ActionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "expired"
  | "executing"
  | "succeeded"
  | "failed"
  | "execution_unknown";

export type ActionDecision = {
  outcome: "approved" | "rejected";
  decidedBy: string;
  decidedAt: number;
  reason?: string;
};

export type ExecutionLease = {
  leaseId: string;
  acquiredAt: number;
  expiresAt: number;
};

export type ExecutionResult = {
  completedAt: number;
  summary: string;
  backendRequestId?: string;
};

export type PendingAction = {
  id: string;
  tenantId: string;
  correlationId: string;
  idempotencyKey: string;
  tool: ToolReference;
  risk: Exclude<RiskClass, "read">;
  argumentsJson: string;
  digest: string;
  policyVersion: string;
  requestedBy: string;
  requestedAt: number;
  expiresAt: number;
  status: ActionStatus;
  decision?: ActionDecision;
  lease?: ExecutionLease;
  result?: ExecutionResult;
  failure?: string;
  workflowId?: string;
  version: number;
};

export type ProposeActionRequest = {
  principal: Principal;
  tool: ToolReference;
  arguments: unknown;
  idempotencyKey: string;
  correlationId?: string;
};

export type DecideActionRequest = {
  principal: Principal;
  actionId: string;
  outcome: ActionDecision["outcome"];
  reason?: string;
};

export type AuditEventType =
  | "action.proposed"
  | "action.approved"
  | "action.rejected"
  | "action.cancelled"
  | "action.expired"
  | "action.execution_started"
  | "action.succeeded"
  | "action.failed"
  | "action.execution_unknown";

export type AuditEvent = {
  id: string;
  tenantId: string;
  actionId: string;
  correlationId: string;
  type: AuditEventType;
  actor: string;
  occurredAt: number;
  actionDigest: string;
  details?: Readonly<Record<string, string | number | boolean | null>>;
};

export type InvocationDecision =
  | { outcome: "execute"; policy: ToolPolicy }
  | { outcome: "propose"; policy: ToolPolicy }
  | { outcome: "deny"; reason: string };
