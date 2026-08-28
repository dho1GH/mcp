import type {
  ActionDecision,
  AuditEventType,
  ExecutionResult,
  PendingAction,
  Principal,
  ToolPolicy,
} from "../contracts/action";
import { PolicyError } from "../contracts/errors";
import { canonicalJson, sha256Hex } from "./canonical-json";
import { PolicyEngine } from "./engine";

export type ProposalInput = {
  id: string;
  correlationId: string;
  idempotencyKey: string;
  principal: Principal;
  policy: ToolPolicy;
  arguments: unknown;
  now: number;
};

function assertNonReadPolicy(
  policy: ToolPolicy,
): asserts policy is ToolPolicy & { risk: Exclude<ToolPolicy["risk"], "read"> } {
  if (policy.risk === "read") {
    throw new PolicyError("Read-only tools execute directly", "approval_required");
  }
}

function assertMutable(action: PendingAction): void {
  if (
    ["rejected", "cancelled", "expired", "succeeded", "failed", "execution_unknown"].includes(
      action.status,
    )
  ) {
    throw new PolicyError(`Action is terminal: ${action.status}`, "invalid_transition");
  }
}

function increment(action: PendingAction, patch: Partial<PendingAction>): PendingAction {
  return { ...action, ...patch, version: action.version + 1 };
}

export async function actionDigest(input: {
  tenantId: string;
  tool: ToolPolicy["tool"];
  argumentsJson: string;
  policyVersion: string;
  expiresAt: number;
}): Promise<string> {
  return sha256Hex(canonicalJson(input));
}

export async function proposeAction(input: ProposalInput): Promise<PendingAction> {
  assertNonReadPolicy(input.policy);
  const argumentsJson = canonicalJson(input.arguments);
  const expiresAt = input.now + input.policy.approvalTtlSeconds * 1_000;
  const digest = await actionDigest({
    tenantId: input.principal.tenantId,
    tool: input.policy.tool,
    argumentsJson,
    policyVersion: input.policy.policyVersion,
    expiresAt,
  });

  return {
    id: input.id,
    tenantId: input.principal.tenantId,
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey,
    tool: input.policy.tool,
    risk: input.policy.risk,
    argumentsJson,
    digest,
    policyVersion: input.policy.policyVersion,
    requestedBy: input.principal.subject,
    requestedAt: input.now,
    expiresAt,
    status: "pending",
    version: 1,
  };
}

export async function decideAction(input: {
  action: PendingAction;
  principal: Principal;
  policy: ToolPolicy;
  policyEngine: PolicyEngine;
  outcome: ActionDecision["outcome"];
  reason?: string;
  now: number;
}): Promise<PendingAction> {
  const { action, principal, policy, policyEngine, now } = input;
  assertMutable(action);
  if (action.status !== "pending") {
    throw new PolicyError("Only pending actions can be decided", "invalid_transition");
  }
  if (action.tenantId !== principal.tenantId) {
    throw new PolicyError("Cross-tenant decision denied", "missing_scope");
  }
  if (!policyEngine.canApprove(principal, policy)) {
    throw new PolicyError("A scoped human approver is required", "human_required");
  }
  if (now >= action.expiresAt) {
    throw new PolicyError("Approval request expired", "expired");
  }

  const expectedDigest = await actionDigest({
    tenantId: action.tenantId,
    tool: action.tool,
    argumentsJson: action.argumentsJson,
    policyVersion: action.policyVersion,
    expiresAt: action.expiresAt,
  });
  if (expectedDigest !== action.digest) {
    throw new PolicyError("Action digest mismatch", "digest_mismatch");
  }

  const decision: ActionDecision = {
    outcome: input.outcome,
    decidedBy: principal.subject,
    decidedAt: now,
    ...(input.reason ? { reason: input.reason } : {}),
  };
  return increment(action, {
    decision,
    status: input.outcome === "approved" ? "approved" : "rejected",
  });
}

export function cancelAction(action: PendingAction, actor: Principal, now: number): PendingAction {
  assertMutable(action);
  if (action.tenantId !== actor.tenantId) {
    throw new PolicyError("Cross-tenant cancellation denied", "missing_scope");
  }
  if (actor.subject !== action.requestedBy && !actor.scopes.includes("actions:cancel:any")) {
    throw new PolicyError("Cancellation scope required", "missing_scope");
  }
  if (!["pending", "approved"].includes(action.status)) {
    throw new PolicyError("Action can no longer be cancelled", "invalid_transition");
  }
  return increment(action, {
    status: "cancelled",
    failure: `Cancelled by ${actor.subject} at ${new Date(now).toISOString()}`,
  });
}

export function expireAction(action: PendingAction, now: number): PendingAction {
  assertMutable(action);
  if (!["pending", "approved"].includes(action.status) || now < action.expiresAt) {
    throw new PolicyError("Action is not eligible for expiry", "invalid_transition");
  }
  return increment(action, { status: "expired" });
}

export function acquireExecutionLease(input: {
  action: PendingAction;
  leaseId: string;
  now: number;
  ttlMs: number;
}): PendingAction {
  const { action, leaseId, now, ttlMs } = input;
  assertMutable(action);
  if (action.status !== "approved") {
    throw new PolicyError("Approved action required", "invalid_transition");
  }
  if (now >= action.expiresAt) {
    throw new PolicyError("Approval expired before execution", "expired");
  }
  if (action.lease) {
    throw new PolicyError("Execution lease already exists", "lease_conflict");
  }
  return increment(action, {
    status: "executing",
    lease: { leaseId, acquiredAt: now, expiresAt: now + ttlMs },
  });
}

export function completeExecution(
  action: PendingAction,
  leaseId: string,
  result: ExecutionResult,
): PendingAction {
  if (action.status !== "executing" || action.lease?.leaseId !== leaseId) {
    throw new PolicyError("Matching execution lease required", "lease_conflict");
  }
  return increment(action, { status: "succeeded", result });
}

export function failExecution(
  action: PendingAction,
  leaseId: string,
  failure: string,
  ambiguous: boolean,
): PendingAction {
  if (action.status !== "executing" || action.lease?.leaseId !== leaseId) {
    throw new PolicyError("Matching execution lease required", "lease_conflict");
  }
  return increment(action, {
    status: ambiguous ? "execution_unknown" : "failed",
    failure,
  });
}

export function eventTypeFor(action: PendingAction): AuditEventType {
  switch (action.status) {
    case "pending":
      return "action.proposed";
    case "approved":
      return "action.approved";
    case "rejected":
      return "action.rejected";
    case "cancelled":
      return "action.cancelled";
    case "expired":
      return "action.expired";
    case "executing":
      return "action.execution_started";
    case "succeeded":
      return "action.succeeded";
    case "failed":
      return "action.failed";
    case "execution_unknown":
      return "action.execution_unknown";
  }
}

