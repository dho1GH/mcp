import { describe, expect, it } from "vitest";
import type { PendingAction, Principal, ToolPolicy } from "../src/contracts/action";
import { PolicyError } from "../src/contracts/errors";
import {
  acquireExecutionLease,
  cancelAction,
  completeExecution,
  decideAction,
  expireAction,
  failExecution,
  proposeAction,
} from "../src/policy/action-state";
import { canonicalJson } from "../src/policy/canonical-json";
import { PolicyEngine } from "../src/policy/engine";

const readPolicy: ToolPolicy = {
  tool: { server: "infra", name: "infra_get_status" },
  risk: "read",
  invokeScopes: ["infra:read"],
  approveScopes: [],
  approvalTtlSeconds: 900,
  policyVersion: "2026-08-11.1",
  retryMode: "safe",
};

const writePolicy: ToolPolicy = {
  tool: { server: "infra", name: "infra_restart_service" },
  risk: "privileged",
  invokeScopes: ["infra:propose"],
  approveScopes: ["infra:approve"],
  approvalTtlSeconds: 900,
  policyVersion: "2026-08-11.1",
  retryMode: "never",
};

const requester: Principal = {
  tenantId: "tenant-a",
  subject: "codex-client",
  kind: "mcp_client",
  scopes: ["infra:read", "infra:propose"],
};

const approver: Principal = {
  tenantId: "tenant-a",
  subject: "human@example.com",
  kind: "human",
  scopes: ["infra:approve"],
};

const engine = new PolicyEngine([readPolicy, writePolicy]);
const now = Date.UTC(2026, 7, 11, 12, 0, 0);

async function pendingAction(): Promise<PendingAction> {
  return proposeAction({
    id: "action-1",
    correlationId: "correlation-1",
    idempotencyKey: "request-1",
    principal: requester,
    policy: writePolicy,
    arguments: { service: "home-graph-api", host: "servers" },
    now,
  });
}

describe("PolicyEngine", () => {
  it("allows a scoped read to execute directly", () => {
    expect(engine.evaluate(requester, readPolicy.tool).outcome).toBe("execute");
  });

  it("turns a scoped side effect into a proposal", () => {
    expect(engine.evaluate(requester, writePolicy.tool).outcome).toBe("propose");
  });

  it("fails closed for unknown tools and missing scopes", () => {
    expect(engine.evaluate(requester, { server: "infra", name: "unknown" })).toEqual({
      outcome: "deny",
      reason: "unknown_tool",
    });
    expect(
      engine.evaluate({ ...requester, scopes: [] }, readPolicy.tool),
    ).toEqual({ outcome: "deny", reason: "missing_invoke_scope" });
  });

  it("rejects duplicate policy entries", () => {
    expect(() => new PolicyEngine([readPolicy, readPolicy])).toThrow("Duplicate tool policy");
  });
});

describe("approval state machine", () => {
  it("canonicalizes arguments before binding the approval digest", async () => {
    const first = await pendingAction();
    const second = await proposeAction({
      id: "action-2",
      correlationId: "correlation-2",
      idempotencyKey: "request-2",
      principal: requester,
      policy: writePolicy,
      arguments: { host: "servers", service: "home-graph-api" },
      now,
    });

    expect(first.argumentsJson).toBe(canonicalJson({ host: "servers", service: "home-graph-api" }));
    expect(first.digest).toBe(second.digest);
  });

  it("does not let an MCP client approve its own proposal", async () => {
    await expect(
      decideAction({
        action: await pendingAction(),
        principal: requester,
        policy: writePolicy,
        policyEngine: engine,
        outcome: "approved",
        now: now + 1,
      }),
    ).rejects.toMatchObject({ code: "human_required" } satisfies Partial<PolicyError>);
  });

  it("does not allow cross-tenant approval", async () => {
    await expect(
      decideAction({
        action: await pendingAction(),
        principal: { ...approver, tenantId: "tenant-b" },
        policy: writePolicy,
        policyEngine: engine,
        outcome: "approved",
        now: now + 1,
      }),
    ).rejects.toMatchObject({ code: "missing_scope" } satisfies Partial<PolicyError>);
  });

  it("detects mutation of approval-bound action data", async () => {
    const action = await pendingAction();
    await expect(
      decideAction({
        action: { ...action, argumentsJson: canonicalJson({ service: "different" }) },
        principal: approver,
        policy: writePolicy,
        policyEngine: engine,
        outcome: "approved",
        now: now + 1,
      }),
    ).rejects.toMatchObject({ code: "digest_mismatch" } satisfies Partial<PolicyError>);
  });

  it("expires rather than approving a stale proposal", async () => {
    const action = await pendingAction();
    await expect(
      decideAction({
        action,
        principal: approver,
        policy: writePolicy,
        policyEngine: engine,
        outcome: "approved",
        now: action.expiresAt,
      }),
    ).rejects.toMatchObject({ code: "expired" } satisfies Partial<PolicyError>);

    expect(expireAction(action, action.expiresAt).status).toBe("expired");
  });

  it("supports rejection and requester cancellation as terminal outcomes", async () => {
    const rejected = await decideAction({
      action: await pendingAction(),
      principal: approver,
      policy: writePolicy,
      policyEngine: engine,
      outcome: "rejected",
      reason: "Maintenance window closed",
      now: now + 1,
    });
    expect(rejected.status).toBe("rejected");
    expect(() => cancelAction(rejected, requester, now + 2)).toThrowError(
      expect.objectContaining({ code: "invalid_transition" }),
    );

    expect(cancelAction(await pendingAction(), requester, now + 1).status).toBe("cancelled");
  });

  it("leases and completes one approved execution exactly once", async () => {
    const approved = await decideAction({
      action: await pendingAction(),
      principal: approver,
      policy: writePolicy,
      policyEngine: engine,
      outcome: "approved",
      now: now + 1,
    });
    const executing = acquireExecutionLease({
      action: approved,
      leaseId: "lease-1",
      now: now + 2,
      ttlMs: 30_000,
    });

    expect(executing.status).toBe("executing");
    expect(() =>
      acquireExecutionLease({
        action: executing,
        leaseId: "lease-2",
        now: now + 3,
        ttlMs: 30_000,
      }),
    ).toThrowError(expect.objectContaining({ code: "invalid_transition" }));

    const succeeded = completeExecution(executing, "lease-1", {
      completedAt: now + 4,
      summary: "Service restarted",
      backendRequestId: "backend-1",
    });
    expect(succeeded.status).toBe("succeeded");
    expect(() =>
      completeExecution(succeeded, "lease-1", {
        completedAt: now + 5,
        summary: "Duplicate",
      }),
    ).toThrowError(expect.objectContaining({ code: "lease_conflict" }));
  });

  it("distinguishes a confirmed failure from an ambiguous side effect", async () => {
    const approved = await decideAction({
      action: await pendingAction(),
      principal: approver,
      policy: writePolicy,
      policyEngine: engine,
      outcome: "approved",
      now: now + 1,
    });
    const executing = acquireExecutionLease({
      action: approved,
      leaseId: "lease-1",
      now: now + 2,
      ttlMs: 30_000,
    });

    expect(failExecution(executing, "lease-1", "HTTP 400", false).status).toBe("failed");
    expect(failExecution(executing, "lease-1", "Timeout after send", true).status).toBe(
      "execution_unknown",
    );
  });
});
