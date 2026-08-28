# Federated MCP platform architecture

## System shape

```text
Codex / other MCP clients
          |
          | Streamable HTTP + OAuth
          v
Cloudflare Access and MCP Portal
          |
          +---- Infrastructure MCP Worker ---- private infrastructure API/MCP
          |
          +---- Home Assistant MCP Worker ---- private HA API/MCP
          |
          +---- Knowledge MCP Worker --------- private search/graph API/MCP
                         |
                         | service binding/RPC
                         v
                Approval Control Plane
                  Agent + Workflow
```

The Portal is the catalog and routing plane. It is not the human-approval
authority. Every domain MCP Worker applies policy before a backend call, and
every backend must independently reject unapproved privileged actions where
that defense can be added.

## Tool contract

Domain servers publish stable, namespaced tool names:

- `infra_get_status`
- `infra_restart_service`
- `home_get_entity_state`
- `home_call_service`
- `knowledge_search`
- `knowledge_update_record`

Names are globally unique before they reach the Portal. This prevents a Portal
rename or server-order change from silently routing a call to the wrong domain.

Each tool is assigned one risk class:

| Risk | Default behavior |
| --- | --- |
| `read` | Execute after identity and scope checks |
| `write` | Create approval request |
| `privileged` | Create approval request with stricter approver scope |
| `destructive` | Create approval request; short expiry; no automatic retry |
| `external` | Create approval request because effects are visible to others |

Unknown tools and tools without policy metadata fail closed.

## Approval lifecycle

```text
PROPOSED -> PENDING -> APPROVED -> EXECUTING -> SUCCEEDED
                 |         |           |
                 |         |           +-> FAILED
                 |         +-> EXPIRED
                 +-> REJECTED
                 +-> CANCELLED
```

Terminal states cannot transition. Approval and execution use compare-and-set
semantics inside one tenant-scoped Agent. The execution lease prevents two
Workflow deliveries or retries from invoking the backend twice.

An MCP write-tool response is intentionally asynchronous:

```json
{
  "status": "pending_approval",
  "approval_id": "...",
  "expires_at": "...",
  "summary": "Restart service home-graph-api on servers",
  "status_tool": "gateway_get_action"
}
```

The original MCP request does not remain open while a human decides. Clients
can call a read-only status tool, while the approval UI receives live state
from the tenant Agent.

## Identity and authorization

- Access/OAuth establishes the client and human identity at the edge.
- The Worker derives identity from verified authentication context, never from
  tool arguments such as `actor_id`.
- MCP clients receive scopes for proposing actions, not approving them.
- Approval routes require an approver group/scope and CSRF-safe browser flow.
- Worker-to-backend calls use service bindings where possible. Tunnel-backed
  services use separate Access service credentials stored as Worker secrets.
- Backend credentials never enter tool results, logs, D1 rows, or MCP schemas.

## Failure behavior

- One failed domain server does not hide tools from healthy Portal servers.
- Read calls have bounded timeouts and do not retry unsafe methods.
- A write is never reported as executed until the backend returns a verified
  success result.
- Ambiguous backend timeouts remain `execution_unknown` and require operator
  reconciliation; they are not automatically retried.
- Workflow callbacks and logs carry the approval ID and a generated correlation
  ID, but not secrets or unrestricted tool arguments.

## Deployment boundary

Local code, tests, generated types, and Wrangler dry runs are reversible and
may proceed. Creating Portal entries, Access applications, tunnels, secrets,
routes, DNS records, Workers, databases, or production deployments requires an
explicit reviewed deployment approval.

