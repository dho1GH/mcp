# V4 capability runtime

## Invariants

- Read capabilities execute directly.
- Every mutation creates `CapabilityExecutionWorkflow`.
- The workflow checks scoped pre-approval or waits for explicit approval.
- Mutations execute through a concrete adapter and attempt read-after-write verification.
- MCP is the assistant-facing capability surface.

## MCP endpoint

`POST /mcp` implements the HTTP JSON-RPC methods used for MCP initialization, tool discovery, and tool calls.

Tools:

- `capability_list`
- `hue_read_inventory`
- `hue_rename_light`
- `hue_set_light_state`
- `execution_get_status`
- `execution_approve`
- `execution_reject`

## Required Worker configuration

Secrets:

- `API_BEARER_TOKEN`
- `HUE_EXECUTOR_BASE_URL`
- `HUE_EXECUTOR_BEARER_TOKEN`

Variable:

- `PREAPPROVED_GRANTS_JSON`

Example:

```json
[
  {
    "id": "open-plan-lighting",
    "capabilityId": "hue.set_light_state",
    "allowedTargets": ["<hue-light-id>"],
    "allowedArgumentKeys": ["lightId", "on", "brightness", "colorTemp"],
    "expiresAt": "2027-01-01T00:00:00Z"
  }
]
```

## Hue executor contract

The mini-PC service under `local-executors/hue` exposes:

- `GET /v1/lights`
- `GET /v1/lights/:id`
- `PUT /v1/lights/:id/name`
- `PUT /v1/lights/:id/state`

Expose it to the Worker through a private Cloudflare Tunnel or Service binding-equivalent route, then set `HUE_EXECUTOR_BASE_URL`.
