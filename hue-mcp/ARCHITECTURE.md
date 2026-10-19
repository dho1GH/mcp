# Hue MCP — Architecture & Provenance

Two-tier MCP server for Philips Hue bridge control, deployed as:

```
MCP client (Claude/Portal)
  → CF Worker (edge, MCP protocol + audit)
    → CF Tunnel
      → Local executor (LAN, Hue Bridge CLIP v2)
        → Hue Bridge
```

## Source Variants

This system was synthesised from three existing implementations in this
repository. Each source contributed specific patterns; nothing was written
from scratch without a reference.

### 1. `nodered-mcp-server/` — Architectural template

The CF Worker entry point, auth, and tool registration pattern were taken
directly from this server, which was already deployed and working.

| What was reused | Source file | Target file |
|---|---|---|
| `createMcpHandler` + `McpServer` wiring | `nodered-mcp-server/src/index.ts` | `worker/src/index.ts` |
| Constant-time `tokensMatch()` for bearer auth | `nodered-mcp-server/src/index.ts:22–28` | `worker/src/index.ts:15–22` |
| `isAuthorized()` pattern (header parse → compare) | `nodered-mcp-server/src/index.ts:30–35` | `worker/src/index.ts:24–29` |
| `registerTool()` with zod schemas + annotations | `nodered-mcp-server/src/tools.ts` | `worker/src/tools.ts` |
| `Env` interface pattern | `nodered-mcp-server/src/types.ts` | `worker/src/types.ts` |
| `wrangler.toml` structure | `nodered-mcp-server/wrangler.toml` | `worker/wrangler.toml` |
| `package.json` deps (`@modelcontextprotocol/server`, `agents`, `zod`) | `nodered-mcp-server/package.json` | `worker/package.json` |

**Adaptations:**
- Added `HUE_EXECUTOR_BASE_URL`, `HUE_EXECUTOR_BEARER_TOKEN`, and `AUDIT_LOG`
  KV binding to `Env` (nodered-mcp-server had `NODERED_BASE_URL` and
  `NODERED_BEARER_TOKEN`; no KV)
- Replaced all Node-RED tool definitions with 19 Hue tools
- Added `HueProxy` HTTP client class (`worker/src/hue-proxy.ts`) calling
  the local executor instead of Node-RED

### 2. `work-mamaz-main/local-executors/hue/` — Local executor + Hue client

The local-executor HTTP server and HueClientService were adapted from this
deployed prototype.

| What was reused | Source file | Target file |
|---|---|---|
| HTTP server structure (`http.createServer`, bearer auth, JSON helpers) | `work-mamaz-main/local-executors/hue/src/server.ts` | `local-executor/src/server.ts` |
| `HueClientService` class (lazy init, `requestJson()` via `node:https`, `rejectUnauthorized: false` for bridge self-signed cert) | `work-mamaz-main/local-executors/hue/src/hue-client.ts` | `local-executor/src/hue-client.ts` |
| 1Password SDK integration (`loadHueConfig`, `OP_SERVICE_ACCOUNT_TOKEN`, environment ID `vsl3suvn4s2dnekt6hr5fpykl4`) | `work-mamaz-main/local-executors/hue/src/hue-client.ts:15–28` | `local-executor/src/hue-client.ts:14–37` |
| Hue CLIP v2 API paths (`/clip/v2/resource/light`, etc.) | `work-mamaz-main/local-executors/hue/src/hue-client.ts` | `local-executor/src/hue-client.ts` |

**Adaptations:**
- Expanded from 4 endpoints (lights list, lights/:id, lights/:id/name,
  lights/:id/state) to 20 endpoints covering sensors, entertainment,
  behaviors, scenes, groups, and resolvers
- Added `404` detection from error messages (`server.ts:123`)
- Made 1Password import dynamic so TypeScript compiles without the native
  binary (`local-executor/src/hue-client.ts:19` — `await import(...)`)
- Added `REQUEST_TIMEOUT_MS` constant (was hardcoded inline)
- Added `HueLight` interface for typed light data (`local-executor/src/hue-client.ts:87–95`)

### 3. `hue-mcp-server-v2/` — Tool definitions, audit, resolvers

The tool surface, audit pattern, and light/scene resolvers were adapted
from this variant, which ran as a monolithic CF Worker (no local executor).

| What was reused | Source file | Target file |
|---|---|---|
| Tool names and descriptions (all 12 read tools, 5 write tools) | `hue-mcp-server-v2/src/tools.ts:53–213` | `worker/src/tools.ts` |
| MCP annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`) per tool | `hue-mcp-server-v2/src/tools.ts` | `worker/src/tools.ts` |
| `AuditEntry` interface shape | `hue-mcp-server-v2/src/types.ts:35–42` | `worker/src/types.ts:9–17` |
| `newAuditEntry()` with `crypto.randomUUID()` | `hue-mcp-server-v2/src/grant.ts:58–69` | `worker/src/audit.ts:3–19` |
| `writeAudit()` to KV as `audit:{timestamp}:{event_id}` | `hue-mcp-server-v2/src/tools.ts:43–45` | `worker/src/audit.ts:21–23` |
| Light resolver (v2 id → v1 numeric id → exact name) | `hue-mcp-server-v2/src/hue-client.ts` (inlined in tool handlers) | `local-executor/src/hue-client.ts:240–254` |
| Scene resolver (id → exact name, ambiguous error) | `hue-mcp-server-v2/src/hue-client.ts` | `local-executor/src/hue-client.ts:256–269` |
| Input validation (brightness 0–100, mirek 153–500, xy 0–1, non-empty strings) | `hue-mcp-server-v2/src/tools.ts:5–38` | `local-executor/src/hue-client.ts:148–164` |

**What was intentionally removed:**

- **Grant system** (`hue-mcp-server-v2/src/grant.ts`, `Grant` interface in
  `types.ts`). In the UMCP architecture, authority is handled at the
  Cloudflare MCP Portal / Access layer. Per-tool grant-as-argument is
  replaced by Portal-level authentication. The grant system was a
  per-variant solution for the same problem; it does not compose with the
  Portal's auth model.
- **`grant_id` field on `AuditEntry`**. Removed because there are no grants.
- **`"allowed"` and `"blocked"` result states on `AuditEntry`**. Only
  `"executed"` and `"failed"` remain; the Portal's Access logs cover
  allowed/blocked at the auth boundary.
- **JSON-RPC envelope in the Worker** (`hue-mcp-server-v2/src/index.ts`).
  Replaced by the `createMcpHandler` pattern from `nodered-mcp-server`,
  which handles the MCP transport.
- **Direct bridge access from the Worker**. v2 had `HUE_BRIDGE_IP` and
  `HUE_APP_KEY` as Worker env vars and talked to the bridge from
  Cloudflare's edge (which cannot reach a LAN device). The two-tier
  architecture uses a local executor on the LAN via CF Tunnel.

**What was added (not in any source):**

- **`audited()` and `auditedText()` wrappers** (`worker/src/tools.ts:24–63`).
  In v2, audit writes were inline in each tool handler's switch case.
  The wrapper pattern eliminates duplication: every tool gets timing,
  success/failure recording, and KV persistence in one place.
- **`hue_get_light` tool** — single-light detail. v2 had lights-list only.
- **`hue_resolve_light` and `hue_resolve_scene` tools** — exposed as
  first-class MCP tools. In v2, resolution was internal to the write
  handlers (the caller passed a `lightKey`/`sceneKey` and the handler
  resolved it). Making them tools lets the MCP client resolve before
  calling write tools, which is cleaner with the Portal pattern.
- **`structuredContent` in tool responses** (`worker/src/tools.ts:9`).
  Read tools return both the JSON string (for text clients) and the parsed
  object as `structuredContent` (for programmatic clients).

## File Layout

```
hue-mcp/
├── .gitignore
├── ARCHITECTURE.md              ← this file
├── worker/                      ← CF Worker (edge)
│   ├── src/
│   │   ├── index.ts             ← entry point, bearer auth, createMcpHandler
│   │   ├── tools.ts             ← 19 MCP tools with audit wrappers
│   │   ├── hue-proxy.ts         ← HTTP client calling local executor
│   │   ├── audit.ts             ← newAuditEntry(), writeAudit() to KV
│   │   └── types.ts             ← Env, AuditEntry interfaces
│   ├── test/
│   │   ├── auth.test.ts         ← constant-time comparison (5 tests)
│   │   └── audit.test.ts        ← audit entry + KV persistence (5 tests)
│   ├── wrangler.toml
│   ├── tsconfig.json
│   └── package.json
└── local-executor/              ← Node.js server (LAN)
    ├── src/
    │   ├── server.ts            ← HTTP server, bearer auth, 20 REST endpoints
    │   └── hue-client.ts        ← HueClientService, 1Password, CLIP v2, resolvers
    ├── test/
    │   └── hue-client.test.ts   ← validation, resolvers, data transform (24 tests)
    ├── tsconfig.json
    └── package.json
```

## Auth Chain

```
MCP client
  ──[OAuth via CF MCP Portal]──▶ Portal
    ──[Bearer MCP_AUTH_TOKEN]──▶ Worker (worker/src/index.ts:24–29)
      ──[Bearer HUE_EXECUTOR_BEARER_TOKEN]──▶ Local executor (via CF Tunnel)
        ──[hue-application-key header]──▶ Hue Bridge (CLIP v2 API)
```

- **MCP_AUTH_TOKEN**: The Portal authenticates itself to the Worker. Set via
  `wrangler secret put MCP_AUTH_TOKEN`.
- **HUE_EXECUTOR_BEARER_TOKEN**: The Worker authenticates itself to the
  local executor through the tunnel. Set via `wrangler secret put
  HUE_EXECUTOR_BEARER_TOKEN` and `EXECUTOR_BEARER_TOKEN` env var on the
  executor.
- **hue-application-key**: The local executor authenticates itself to the
  Hue bridge. Retrieved from 1Password or `HUE_APP_KEY` env var.

The Worker does not know the identity of the MCP caller — the Portal handles
user auth and injects the bearer token. The Worker's audit log records
what happened (tool, args, result, duration) but not who requested it; the
Portal's Access logs correlate tool calls to users.

## Audit Trail

Every tool call is recorded to the `AUDIT_LOG` KV namespace
(`worker/src/audit.ts`).

Entry shape (`worker/src/types.ts:9–17`):

```typescript
{
  event_id: string;     // crypto.randomUUID()
  timestamp: string;    // ISO 8601
  tool: string;         // e.g. "hue_set_light_state"
  args: unknown;        // full input arguments
  result: "executed" | "failed";
  detail?: string;      // error message on failure
  duration_ms: number;  // wall-clock handler time
}
```

Key format: `audit:{timestamp}:{event_id}` — lexicographic time ordering for
range queries via KV list.

The `audited()` and `auditedText()` wrappers in `worker/src/tools.ts:24–63`
handle all audit writes. No tool can execute without an audit entry being
written, including on failure paths.

## Tool Surface

19 tools total: 12 read, 2 resolver, 5 write.

| Tool | Type | Hue CLIP v2 Resource |
|---|---|---|
| `hue_list_lights` | read | `/clip/v2/resource/light` |
| `hue_get_light` | read | `/clip/v2/resource/light/{id}` |
| `hue_list_rooms` | read | `/clip/v2/resource/room` |
| `hue_list_zones` | read | `/clip/v2/resource/zone` |
| `hue_list_scenes` | read | `/clip/v2/resource/scene` |
| `hue_list_motion_sensors` | read | `/clip/v2/resource/motion` |
| `hue_list_buttons` | read | `/clip/v2/resource/button` |
| `hue_list_temperature_sensors` | read | `/clip/v2/resource/temperature` |
| `hue_list_light_level_sensors` | read | `/clip/v2/resource/light_level` |
| `hue_list_entertainment_areas` | read | `/clip/v2/resource/entertainment_configuration` |
| `hue_list_behavior_scripts` | read | `/clip/v2/resource/behavior_script` |
| `hue_list_behavior_instances` | read | `/clip/v2/resource/behavior_instance` |
| `hue_resolve_light` | resolver | (reads `/clip/v2/resource/light`, matches by v2 id / v1 id / name) |
| `hue_resolve_scene` | resolver | (reads `/clip/v2/resource/scene`, matches by id / name) |
| `hue_rename_light` | write | `PUT /clip/v2/resource/light/{id}` (metadata) |
| `hue_set_light_state` | write | `PUT /clip/v2/resource/light/{id}` (on, dimming, color, color_temperature) |
| `hue_set_light_effect` | write | `PUT /clip/v2/resource/light/{id}` (effects) |
| `hue_recall_scene` | write | `PUT /clip/v2/resource/scene/{id}` (recall) |
| `hue_set_group_state` | write | `PUT /clip/v2/resource/grouped_light/{id}` (on, dimming) |

## Tests

34 tests across both packages (vitest).

**Worker** (`worker/test/`, 10 tests):
- `auth.test.ts` — constant-time comparison edge cases
- `audit.test.ts` — entry creation, field correctness, unique IDs, KV key format

**Local executor** (`local-executor/test/`, 24 tests):
- `hue-client.test.ts` — input validation (brightness, colorTemp, xy ranges,
  empty state, empty name/effect), light resolver (v2 id, v1 id, name,
  ambiguous, missing, whitespace), scene resolver, data transformation
  (full light data mapping, defaults for missing fields)

Run: `cd worker && npm test` / `cd local-executor && npm test`

## Deployment Checklist

1. Create the KV namespace: `npx wrangler kv namespace create AUDIT_LOG`
2. Update `worker/wrangler.toml` with the returned namespace ID
3. Set Worker secrets:
   ```
   npx wrangler secret put MCP_AUTH_TOKEN
   npx wrangler secret put HUE_EXECUTOR_BEARER_TOKEN
   ```
4. Deploy Worker: `cd worker && npx wrangler deploy`
5. On the LAN machine:
   - Set env vars: `EXECUTOR_BEARER_TOKEN`, plus either `OP_SERVICE_ACCOUNT_TOKEN`
     (for 1Password) or `HUE_BRIDGE_IP` + `HUE_APP_KEY`
   - Start executor: `cd local-executor && npm start`
   - Expose via Cloudflare Tunnel to `hue-executor.itsjeff.org`
6. Register the Worker URL in the MCP Portal as an upstream server with the
   `MCP_AUTH_TOKEN` as its bearer credential
