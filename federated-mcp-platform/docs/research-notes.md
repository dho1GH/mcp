# Federated MCP research notes

Updated: 2026-08-11

## Objective

Build one authenticated MCP surface for clients while retaining independently
deployable infrastructure, Home Assistant, and knowledge MCP servers. Read-only
operations may execute immediately. Side-effecting operations must stop at a
durable, auditable human approval boundary.

## Current evidence

- Cloudflare's current server path is stateless `createMcpHandler()` using the
  MCP v2 server package. `McpAgent` is a deprecated, feature-frozen legacy path.
- An Agents SDK `Agent` can maintain authenticated MCP client connections and
  restores server configuration and OAuth material from its SQLite storage.
- Cloudflare Workflows provide durable approval waits, rejection, timeout,
  retry, progress, cancellation, and resumption primitives.
- Stateless MCP elicitation is useful for structured input, but an in-flight
  elicitation is not durable across Durable Object eviction. It cannot be the
  sole approval boundary for this system.
- The local workspace contains an HITL Workflow prototype and a deterministic
  capability-policy prototype. Both are useful references, but neither is a
  production MCP federation layer.
- Historical inventory mentions `mcp.itsjeff.org`, `personalos-mcp`, and one
  connected Cloudflare Tunnel, but the relationship and current live endpoints
  are unresolved. No deployment assumption may be based on those names.

## Hypothesis tree

### H1: Cloudflare MCP Portal plus independently deployed domain MCP Workers

Confidence: **0.90 — selected**.

- The Portal owns aggregation, the single client URL, server selection, and
  tool exposure.
- Each domain Worker owns typed tools, backend credentials, and domain-specific
  authorization.
- A shared approval control plane owns proposals, decisions, execution leases,
  idempotency, and audit evidence.
- A write tool creates a proposal and returns a pending action. An authenticated
  human UI approves or rejects it. A Workflow performs the approved action and
  records the terminal result.

This preserves real deployment and failure boundaries without requiring us to
write a dynamic MCP protocol proxy.

### H2: One custom Worker dynamically proxies every upstream MCP tool

Confidence: **0.07 — rejected for the first version**.

It centralizes approval policy, but dynamic tool-schema federation requires a
custom proxy layer or a stale replicated catalog. It duplicates Portal
capabilities and creates a larger protocol and availability blast radius.

### H3: One monolithic MCP Worker containing every tool

Confidence: **0.03 — rejected**.

It is simpler but contradicts the chosen independently deployed MCP-server
model and couples credentials, failure modes, and release schedules.

## State ownership

| State | Owner | Reason |
| --- | --- | --- |
| Client identity and session | Cloudflare Access/OAuth | Edge identity boundary |
| Portal server/tool catalog | MCP Portal | Aggregation and exposure policy |
| Tool schemas and backend mapping | Domain MCP Worker | Versioned with implementation |
| Pending approval and decision | Approval Agent SQLite | Strong per-tenant coordination |
| Long wait and execution progress | Approval Workflow | Durable event wait and retries |
| Immutable audit projection | Approval Agent SQLite initially | Queryable evidence near coordinator |
| Backend business state | Existing backend | Gateway never becomes system of record |

## Human-approval invariant

No model or MCP client can turn a proposal into executable authority. Only an
authenticated human decision received on the approval control-plane route can
issue an execution lease. Approval is bound to a canonical digest of the exact
tenant, actor, domain, tool, arguments, policy version, and expiry.

Before execution, the Workflow must revalidate:

1. the approval is still current and unexpired;
2. the proposal digest still matches the stored action;
3. the tool's current policy still permits execution;
4. no terminal result or active execution lease already exists;
5. the approving identity is authorized and is not merely an MCP client claim.

## Open inventory questions

- Authoritative URLs and transports for the three initial backend MCP servers.
- Whether each backend already exposes MCP or should receive a typed Worker
  adapter over its existing HTTP API.
- Cloudflare Access organization, identity provider, approver group, and target
  custom domain.
- Whether approval should initially use the bundled web panel, email, or an
  existing operations surface.
- Required approval timeout and whether any tool needs two-person approval.

These questions do not block local control-plane and contract implementation.
They block live integration and deployment.

## Sources

- Cloudflare Agents SDK repository: `docs/agents/mcp-client.md`,
  `docs/agents/mcp-servers.md`, `docs/agents/human-in-the-loop.md`, and
  `docs/agents/workflows.md`, read from `main` on 2026-08-11.
- Cloudflare Workers production best practices, updated 2026-06-03.
- Cloudflare remote MCP and MCP Portal documentation, read 2026-08-11.

