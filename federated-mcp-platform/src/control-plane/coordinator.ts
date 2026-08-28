import { Agent } from "agents";
import type {
  ActionDecision,
  AuditEvent,
  DecideActionRequest,
  ExecutionLease,
  ExecutionResult,
  PendingAction,
  Principal,
  ProposeActionRequest,
  ToolPolicy,
} from "../contracts/action";
import { PolicyError } from "../contracts/errors";
import {
  acquireExecutionLease,
  cancelAction,
  completeExecution,
  decideAction,
  eventTypeFor,
  failExecution,
  proposeAction,
} from "../policy/action-state";
import { canonicalJson } from "../policy/canonical-json";
import { policyFor, TOOL_POLICIES } from "../policy/catalog";
import { PolicyEngine } from "../policy/engine";

type CoordinatorState = {
  pending: number;
  executing: number;
  updatedAt: number;
};

type ActionRow = {
  id: string;
  tenant_id: string;
  correlation_id: string;
  idempotency_key: string;
  server_name: string;
  tool_name: string;
  risk: PendingAction["risk"];
  arguments_json: string;
  digest: string;
  policy_version: string;
  requested_by: string;
  requested_at: number;
  expires_at: number;
  status: PendingAction["status"];
  decision_json: string | null;
  lease_json: string | null;
  result_json: string | null;
  failure: string | null;
  workflow_id: string | null;
  version: number;
};

type ApprovalWorkflowParams = {
  actionId: string;
  tenantId: string;
  digest: string;
};

type ExecuteResult = {
  summary: string;
  backendRequestId?: string;
};

const policyEngine = new PolicyEngine(TOOL_POLICIES);
const MAX_AUDIT_SUMMARY_BYTES = 16 * 1024;

function parseOptional<T>(value: string | null): T | undefined {
  return value === null ? undefined : (JSON.parse(value) as T);
}

function rowToAction(row: ActionRow): PendingAction {
  const decision = parseOptional<ActionDecision>(row.decision_json);
  const lease = parseOptional<ExecutionLease>(row.lease_json);
  const result = parseOptional<ExecutionResult>(row.result_json);
  return {
    id: row.id,
    tenantId: row.tenant_id,
    correlationId: row.correlation_id,
    idempotencyKey: row.idempotency_key,
    tool: { server: row.server_name, name: row.tool_name },
    risk: row.risk,
    argumentsJson: row.arguments_json,
    digest: row.digest,
    policyVersion: row.policy_version,
    requestedBy: row.requested_by,
    requestedAt: row.requested_at,
    expiresAt: row.expires_at,
    status: row.status,
    ...(decision ? { decision } : {}),
    ...(lease ? { lease } : {}),
    ...(result ? { result } : {}),
    ...(row.failure ? { failure: row.failure } : {}),
    ...(row.workflow_id ? { workflowId: row.workflow_id } : {}),
    version: row.version,
  };
}

function policyForAction(action: PendingAction): ToolPolicy {
  const policy = policyFor(action.tool);
  if (!policy || policy.policyVersion !== action.policyVersion) {
    throw new PolicyError("The action policy is no longer available", "unknown_tool");
  }
  return policy;
}

function truncateSummary(value: unknown): string {
  const encoded = JSON.stringify(value);
  return encoded.length <= MAX_AUDIT_SUMMARY_BYTES
    ? encoded
    : `${encoded.slice(0, MAX_AUDIT_SUMMARY_BYTES)}…`;
}

export class ApprovalCoordinator extends Agent<Env, CoordinatorState> {
  override initialState: CoordinatorState = { pending: 0, executing: 0, updatedAt: 0 };

  override onStart(): void {
    this.sql`
      CREATE TABLE IF NOT EXISTS approval_actions (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        correlation_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        server_name TEXT NOT NULL,
        tool_name TEXT NOT NULL,
        risk TEXT NOT NULL,
        arguments_json TEXT NOT NULL,
        digest TEXT NOT NULL,
        policy_version TEXT NOT NULL,
        requested_by TEXT NOT NULL,
        requested_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        status TEXT NOT NULL,
        decision_json TEXT,
        lease_json TEXT,
        result_json TEXT,
        failure TEXT,
        workflow_id TEXT,
        version INTEGER NOT NULL,
        UNIQUE (tenant_id, idempotency_key)
      )
    `;
    this.sql`
      CREATE TABLE IF NOT EXISTS approval_audit_events (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        action_id TEXT NOT NULL,
        correlation_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        actor TEXT NOT NULL,
        occurred_at INTEGER NOT NULL,
        action_digest TEXT NOT NULL,
        details_json TEXT
      )
    `;
    this.sql`
      CREATE INDEX IF NOT EXISTS approval_actions_status_idx
      ON approval_actions (status, requested_at DESC)
    `;
    this.refreshSummary();
  }

  async propose(request: ProposeActionRequest): Promise<PendingAction> {
    if (!request.idempotencyKey.trim()) {
      throw new PolicyError("An idempotency key is required", "invalid_transition");
    }
    const decision = policyEngine.evaluate(request.principal, request.tool);
    if (decision.outcome === "deny") {
      throw new PolicyError(decision.reason, decision.reason === "unknown_tool" ? "unknown_tool" : "missing_scope");
    }
    if (decision.outcome === "execute") {
      throw new PolicyError("Read-only tools execute without approval", "approval_required");
    }

    const existing = this.findByIdempotencyKey(
      request.principal.tenantId,
      request.idempotencyKey,
    );
    if (existing) {
      if (
        existing.tool.server !== request.tool.server ||
        existing.tool.name !== request.tool.name ||
        existing.argumentsJson !== canonicalJson(request.arguments)
      ) {
        throw new PolicyError(
          "Idempotency key was already used for a different action",
          "invalid_transition",
        );
      }
      return existing;
    }

    const now = Date.now();
    const action = await proposeAction({
      id: crypto.randomUUID(),
      correlationId: request.correlationId ?? crypto.randomUUID(),
      idempotencyKey: request.idempotencyKey,
      principal: request.principal,
      policy: decision.policy,
      arguments: request.arguments,
      now,
    });

    this.insertAction(action);
    this.appendAudit(action, request.principal.subject, now);

    try {
      const workflowId = await this.runWorkflow<ApprovalWorkflowParams>(
        "APPROVAL_WORKFLOW",
        { actionId: action.id, tenantId: action.tenantId, digest: action.digest },
        {
          id: action.id,
          metadata: {
            tenantId: action.tenantId,
            actionId: action.id,
            server: action.tool.server,
            tool: action.tool.name,
          },
          agentBinding: "ApprovalCoordinator",
        },
      );
      const withWorkflow = { ...action, workflowId, version: action.version + 1 };
      this.persistAction(withWorkflow, action.version);
      this.refreshSummary();
      return withWorkflow;
    } catch (error) {
      const failed = {
        ...action,
        status: "failed" as const,
        failure: "Approval workflow failed to start",
        version: action.version + 1,
      };
      this.persistAction(failed, action.version);
      this.appendAudit(failed, "system", Date.now(), {
        error: error instanceof Error ? error.message : "unknown",
      });
      this.refreshSummary();
      throw error;
    }
  }

  async decide(request: DecideActionRequest): Promise<PendingAction> {
    const action = this.requireAction(request.actionId, request.principal.tenantId);
    const policy = policyForAction(action);

    if (action.decision?.outcome === request.outcome && action.workflowId) {
      await this.sendDecisionToWorkflow(action, request);
      return action;
    }

    const decided = await decideAction({
      action,
      principal: request.principal,
      policy,
      policyEngine,
      outcome: request.outcome,
      ...(request.reason ? { reason: request.reason } : {}),
      now: Date.now(),
    });
    this.persistAction(decided, action.version);
    this.appendAudit(decided, request.principal.subject, Date.now());
    await this.sendDecisionToWorkflow(decided, request);
    this.refreshSummary();
    return decided;
  }

  cancel(actionId: string, principal: Principal): PendingAction {
    const action = this.requireAction(actionId, principal.tenantId);
    const cancelled = cancelAction(action, principal, Date.now());
    this.persistAction(cancelled, action.version);
    this.appendAudit(cancelled, principal.subject, Date.now());
    this.refreshSummary();
    return cancelled;
  }

  getAction(actionId: string, tenantId: string): PendingAction | null {
    const rows = this.sql<ActionRow>`
      SELECT * FROM approval_actions WHERE id = ${actionId} AND tenant_id = ${tenantId}
    `;
    return rows[0] ? rowToAction(rows[0]) : null;
  }

  listActions(tenantId: string, limit = 50): PendingAction[] {
    const boundedLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
    return this.sql<ActionRow>`
      SELECT * FROM approval_actions
      WHERE tenant_id = ${tenantId}
      ORDER BY requested_at DESC
      LIMIT ${boundedLimit}
    `.map(rowToAction);
  }

  listAuditEvents(tenantId: string, actionId: string): AuditEvent[] {
    type AuditRow = {
      id: string;
      tenant_id: string;
      action_id: string;
      correlation_id: string;
      event_type: AuditEvent["type"];
      actor: string;
      occurred_at: number;
      action_digest: string;
      details_json: string | null;
    };
    return this.sql<AuditRow>`
      SELECT * FROM approval_audit_events
      WHERE tenant_id = ${tenantId} AND action_id = ${actionId}
      ORDER BY occurred_at ASC
    `.map((row) => {
      const details = row.details_json
        ? (JSON.parse(row.details_json) as NonNullable<AuditEvent["details"]>)
        : undefined;
      return {
        id: row.id,
        tenantId: row.tenant_id,
        actionId: row.action_id,
        correlationId: row.correlation_id,
        type: row.event_type,
        actor: row.actor,
        occurredAt: row.occurred_at,
        actionDigest: row.action_digest,
        ...(details ? { details } : {}),
      };
    });
  }

  async connectUpstream(name: string, url: string): Promise<
    | { id: string; state: "ready" }
    | { id: string; state: "authenticating"; authUrl: string }
  > {
    if (!policyForServer(name)) {
      throw new PolicyError("Server is not present in the policy catalog", "unknown_tool");
    }
    return this.addMcpServer(name, url, { transport: { type: "streamable-http" } });
  }

  acquireLease(actionId: string, digest: string, leaseId: string): PendingAction {
    const action = this.requireActionById(actionId);
    if (action.digest !== digest) {
      throw new PolicyError("Workflow digest does not match action", "digest_mismatch");
    }
    const leased = acquireExecutionLease({
      action,
      leaseId,
      now: Date.now(),
      ttlMs: 5 * 60 * 1_000,
    });
    this.persistAction(leased, action.version);
    this.appendAudit(leased, "workflow", Date.now());
    this.refreshSummary();
    return leased;
  }

  async executeLeasedAction(actionId: string, leaseId: string): Promise<ExecuteResult> {
    const action = this.requireActionById(actionId);
    if (action.status !== "executing" || action.lease?.leaseId !== leaseId) {
      throw new PolicyError("Matching execution lease required", "lease_conflict");
    }

    await this.mcp.waitForConnections({ timeout: 10_000 });
    const state = this.getMcpServers();
    const serverEntry = Object.entries(state.servers).find(
      ([id, server]) => id === action.tool.server || server.name === action.tool.server,
    );
    if (!serverEntry || serverEntry[1].state !== "ready") {
      throw new Error(`Upstream MCP server is unavailable: ${action.tool.server}`);
    }

    const [serverId] = serverEntry;
    const result = await this.mcp.callTool({
      serverId,
      name: action.tool.name,
      arguments: JSON.parse(action.argumentsJson) as Record<string, unknown>,
    });
    return {
      summary: truncateSummary(result),
      backendRequestId: action.correlationId,
    };
  }

  recordSuccess(actionId: string, leaseId: string, result: ExecuteResult): PendingAction {
    const action = this.requireActionById(actionId);
    const executionResult: ExecutionResult = {
      completedAt: Date.now(),
      summary: result.summary,
      ...(result.backendRequestId ? { backendRequestId: result.backendRequestId } : {}),
    };
    const completed = completeExecution(action, leaseId, executionResult);
    this.persistAction(completed, action.version);
    this.appendAudit(completed, "workflow", Date.now());
    this.refreshSummary();
    return completed;
  }

  recordFailure(
    actionId: string,
    leaseId: string,
    failure: string,
    ambiguous: boolean,
  ): PendingAction {
    const action = this.requireActionById(actionId);
    const failed = failExecution(action, leaseId, failure, ambiguous);
    this.persistAction(failed, action.version);
    this.appendAudit(failed, "workflow", Date.now());
    this.refreshSummary();
    return failed;
  }

  private findByIdempotencyKey(tenantId: string, key: string): PendingAction | null {
    const rows = this.sql<ActionRow>`
      SELECT * FROM approval_actions
      WHERE tenant_id = ${tenantId} AND idempotency_key = ${key}
    `;
    return rows[0] ? rowToAction(rows[0]) : null;
  }

  private requireAction(actionId: string, tenantId: string): PendingAction {
    const action = this.getAction(actionId, tenantId);
    if (!action) throw new PolicyError("Action not found", "invalid_transition");
    return action;
  }

  private requireActionById(actionId: string): PendingAction {
    const rows = this.sql<ActionRow>`SELECT * FROM approval_actions WHERE id = ${actionId}`;
    if (!rows[0]) throw new PolicyError("Action not found", "invalid_transition");
    return rowToAction(rows[0]);
  }

  private insertAction(action: PendingAction): void {
    this.sql`
      INSERT INTO approval_actions (
        id, tenant_id, correlation_id, idempotency_key, server_name, tool_name,
        risk, arguments_json, digest, policy_version, requested_by, requested_at,
        expires_at, status, decision_json, lease_json, result_json, failure,
        workflow_id, version
      ) VALUES (
        ${action.id}, ${action.tenantId}, ${action.correlationId}, ${action.idempotencyKey},
        ${action.tool.server}, ${action.tool.name}, ${action.risk}, ${action.argumentsJson},
        ${action.digest}, ${action.policyVersion}, ${action.requestedBy}, ${action.requestedAt},
        ${action.expiresAt}, ${action.status}, null, null, null, null, null, ${action.version}
      )
    `;
  }

  private persistAction(action: PendingAction, expectedVersion: number): void {
    const updated = this.sql<{ id: string }>`
      UPDATE approval_actions SET
        status = ${action.status},
        decision_json = ${action.decision ? JSON.stringify(action.decision) : null},
        lease_json = ${action.lease ? JSON.stringify(action.lease) : null},
        result_json = ${action.result ? JSON.stringify(action.result) : null},
        failure = ${action.failure ?? null},
        workflow_id = ${action.workflowId ?? null},
        version = ${action.version}
      WHERE id = ${action.id} AND version = ${expectedVersion}
      RETURNING id
    `;
    if (!updated[0]) {
      throw new PolicyError("Concurrent action update rejected", "lease_conflict");
    }
  }

  private appendAudit(
    action: PendingAction,
    actor: string,
    occurredAt: number,
    details?: AuditEvent["details"],
  ): void {
    this.sql`
      INSERT INTO approval_audit_events (
        id, tenant_id, action_id, correlation_id, event_type, actor,
        occurred_at, action_digest, details_json
      ) VALUES (
        ${crypto.randomUUID()}, ${action.tenantId}, ${action.id}, ${action.correlationId},
        ${eventTypeFor(action)}, ${actor}, ${occurredAt}, ${action.digest},
        ${details ? JSON.stringify(details) : null}
      )
    `;
  }

  private async sendDecisionToWorkflow(
    action: PendingAction,
    request: DecideActionRequest,
  ): Promise<void> {
    if (!action.workflowId) {
      throw new PolicyError("Action has no approval workflow", "invalid_transition");
    }
    if (request.outcome === "approved") {
      await this.approveWorkflow(action.workflowId, {
        reason: request.reason ?? "Approved",
        metadata: { approvedBy: request.principal.subject, actionDigest: action.digest },
      });
    } else {
      await this.rejectWorkflow(action.workflowId, {
        reason: request.reason ?? "Rejected",
      });
    }
  }

  private refreshSummary(): void {
    const rows = this.sql<{ status: PendingAction["status"]; count: number }>`
      SELECT status, COUNT(*) AS count FROM approval_actions
      WHERE status IN ('pending', 'executing') GROUP BY status
    `;
    const count = (status: PendingAction["status"]) =>
      rows.find((row) => row.status === status)?.count ?? 0;
    this.setState({ pending: count("pending"), executing: count("executing"), updatedAt: Date.now() });
  }
}

function policyForServer(server: string): boolean {
  return TOOL_POLICIES.some((policy) => policy.tool.server === server);
}

export type { ApprovalWorkflowParams, ExecuteResult };
