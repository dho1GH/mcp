# Hue MCP Variant Breakdown & Build Plan

## Part 1: Variant Comparison

### Variant 1 -- hue-control (Original CLI)

| Attribute | Detail |
|---|---|
| **Type** | Node.js CLI (`node src/cli.mjs <command>`) |
| **Language** | JavaScript ESM |
| **MCP server** | No |
| **Bridge connection** | Direct LAN HTTPS, `rejectUnauthorized: false` (Node built-in `https`) |
| **Secret management** | 1Password SDK (`@1password/sdk`, env ID `vsl3suvn4s2dnekt6hr5fpykl4`), falls back to `.env` |
| **Authority model** | None (read-only) |
| **Audit** | None |

**Tools (5 CLI commands, all read-only):**

| Command | Description |
|---|---|
| `status` | Bridge IP, 1Password status, light count |
| `lights` | All lights with id, name, on, brightness |
| `rooms` | All rooms |
| `zones` | All zones |
| `scenes` | All scenes |

**Notable:** First implementation. Established the 1Password integration pattern and Hue CLIP v2 API paths that carry through to later variants.

---

### Variant 2 -- hue-mcp-server (v1 CF Worker)

| Attribute | Detail |
|---|---|
| **Type** | Cloudflare Worker, manual JSON-RPC 2.0 at `/mcp` |
| **Language** | TypeScript |
| **MCP server** | Yes (manual MCP protocol implementation) |
| **Bridge connection** | Direct HTTPS `fetch()` to bridge IP. **Only works with `wrangler dev` on LAN** -- cannot deploy to CF edge due to self-signed cert |
| **Secret management** | Wrangler secrets (`HUE_BRIDGE_IP`, `HUE_APP_KEY`, `MCP_AUTH_TOKEN`) |
| **Auth** | Bearer token checked against `MCP_AUTH_TOKEN` |
| **Authority model** | Typed grant from `agentic-control-plane`: `grantId`, `scope`, `systems[]`, `allowedOperations[]`, `allowedTargets[]`, `forbiddenSystems[]`, `forbiddenOperations[]`, `expires`, single-execution grants |
| **Audit** | KV namespace (`AUDIT_LOG`), one entry per tool call: event_id, timestamp, tool, grant_id, args, result (executed/blocked/failed), detail |

**Tools (6 total):**

| Tool | Type | Grant required | Capabilities |
|---|---|---|---|
| `hue_list_lights` | read | no | v2 id, v1 id, name, state |
| `hue_list_rooms` | read | no | All rooms |
| `hue_list_zones` | read | no | All zones |
| `hue_list_scenes` | read | no | All scenes |
| `hue_rename_light` | write | `metadata_write` | Rename by v2 id, v1 id, or name |
| `hue_set_light_state` | write | `state_write` | On/off + brightness only |

**Notable:** First MCP implementation. Introduced the grant model, KV audit logging, and light resolution by name/v1id/v2id. Limited to local development only.

---

### Variant 3 -- hue-mcp-server-v2 (v2 CF Worker)

| Attribute | Detail |
|---|---|
| **Type** | Cloudflare Worker, manual JSON-RPC 2.0 at `/mcp` |
| **Language** | TypeScript |
| **MCP server** | Yes (manual MCP protocol implementation) |
| **Bridge connection** | Same as v1 -- direct HTTPS `fetch()`, local dev only |
| **Secret management** | Same as v1 -- Wrangler secrets |
| **Auth** | Same as v1 -- Bearer token |
| **Authority model** | Same grant model as v1 |
| **Audit** | Same KV pattern as v1, plus universal catch-all "failed" entries for non-grant errors |

**Tools (16 total -- expanded from v1's 6):**

| Tool | Type | Grant required | New in v2 | Capabilities |
|---|---|---|---|---|
| `hue_list_lights` | read | no | | v2 id, v1 id, name, state |
| `hue_list_rooms` | read | no | | All rooms |
| `hue_list_zones` | read | no | | All zones |
| `hue_list_scenes` | read | no | | All scenes |
| `hue_list_motion_sensors` | read | no | YES | Motion sensors + state |
| `hue_list_buttons` | read | no | YES | Button/switch devices + last event |
| `hue_list_temperature_sensors` | read | no | YES | Temperature sensors + readings |
| `hue_list_light_level_sensors` | read | no | YES | Ambient light sensors + readings |
| `hue_list_entertainment_areas` | read | no | YES | Entertainment/sync areas |
| `hue_list_behavior_scripts` | read | no | YES | Available automations |
| `hue_list_behavior_instances` | read | no | YES | Active automations + enabled state |
| `hue_rename_light` | write | `metadata_write` | | Rename by key |
| `hue_set_light_state` | write | `state_write` | EXPANDED | On/off, brightness, **CIE xy color**, **mirek color temp** |
| `hue_recall_scene` | write | `scene_recall` | YES | Activate scene by id or name |
| `hue_set_group_state` | write | `state_write` | YES | Room/zone grouped light on/off + brightness |
| `hue_set_light_effect` | write | `state_write` | YES | Dynamic effects (sparkle, candle, fire, etc.) |

**Additions over v1:**
- 7 new read tools (sensors, buttons, entertainment, behaviors)
- 3 new write tools (scene recall, group state, light effects)
- `hue_set_light_state` expanded with CIE xy color and mirek color temperature
- Input validators: `validateBrightness`, `validateMirek`, `validateXy`, `validateNonEmptyString`
- Typed error classes: `HueTimeoutError`, `HueApiError`, `HueValidationError` with distinct JSON-RPC error codes (-32001, -32002, -32003, -32602)
- 8s timeout with up to 2 retries (300ms exponential backoff) for timeouts, 5xx, and network failures
- 4s in-memory cache on `lights()` and `scenes()` -- invalidated on writes
- Malformed JSON handling returns clean -32700 error code

**Notable:** Most complete tool surface. This is the most evolved MCP tool definition set across all variants. Still limited to local dev only.

---

### Variant 4 -- hue-mcp-server-v3

**Byte-for-byte duplicate of v2.** Every source file, package.json, and wrangler.toml is identical. Can be deleted.

---

### Variant 5 -- Huey-hue-variant (AutoGen Multi-Agent)

| Attribute | Detail |
|---|---|
| **Type** | Python AutoGen multi-agent group chat + separate FastMCP SSE server |
| **Language** | Python |
| **MCP server** | Yes -- two: `mcp_server.py` (general chat/memory, stdio) and `hue_mcp_server.py` (Hue-specific, SSE on port 8766) |
| **Bridge connection** | Direct LAN HTTPS via `httpx` with `verify=False` |
| **Secret management** | `.env` via `os.getenv()` (`HUE_BRIDGE_IP`, `HUE_APP_KEY`) |
| **Auth** | None on MCP servers (local-only assumption) |
| **Authority model** | Most sophisticated -- see below |
| **Audit** | None (runtime models track state but no persistent audit log) |

**Two access patterns coexist:**

**A. Huey's direct path (AutoGen agent, 4 tools):**

| Tool | Type | Grant required | Capabilities |
|---|---|---|---|
| `list_hue_lights` | read | no | All lights |
| `list_hue_scenes` | read | no | All scenes |
| `set_hue_light` | write | no (Huey has direct access) | On/off, brightness, color temp, CIE xy |
| `apply_hue_scene` | write | no (Huey has direct access) | Activate scene by id |

Huey is the domain expert persona and has ungated access. Other personas cannot call these tools (enforced structurally via `register_for_llm` / `register_for_execution`).

**B. Governed runtime path (hue_mcp_server, 3 tools):**

| Tool | Type | Grant required | Capabilities |
|---|---|---|---|
| `get_hue_state` | read | no | Full lights + scenes state |
| `simulate_hue_change` | dry-run | no | Blast radius analysis before execution |
| `execute_hue_job` | write | envelope check | Execute with boundary enforcement |

**Authority model (Pydantic, `runtime/models.py`):**
- `Grant`: system, mode (inspect/simulate/bounded_write), objective, targets, allowed/forbidden operations, allowed entity classes, adaptation_policy, stop_conditions, approval tracking (approved_by, approved_at, expires_at), frozen SHA256 hash
- `CandidateChangeSet`: what a persona proposes (objective, proposed_operations, risk_level, confidence, simulation_summary)
- `ExecutionJob`: compiled from approved grant + selected candidate, with approved_action_envelope
- `ExecutionResult`: status (completed/blocked/failed/needs_reapproval), boundary_breaches
- `AdaptiveExecutionState`: full state machine tracking request through the runtime

**Domain adapter pattern (`runtime/adapters/hue.py`):**
- `HueAdapter` implements `DomainAdapter` ABC
- `execute()` checks each planned step's operation against `job.approved_action_envelope["allowed_operations"]`
- Operations not in the envelope produce `needs_reapproval` status

**Notable:** Most sophisticated authority model. The dual-path design (Huey direct vs. governed runtime) is an important architectural insight: the domain expert has direct access because they ARE the domain; everyone else goes through the adapter pipeline.

---

### Variant 6 -- work-mamaz-main / local-executors/hue (Two-Tier Architecture)

| Attribute | Detail |
|---|---|
| **Type** | Two tiers: local HTTP server (Node.js `http.createServer`) + CF Worker caller |
| **Language** | TypeScript |
| **MCP server** | No -- the local executor is a REST API; the CF Worker is a capability executor |
| **Bridge connection** | **Solved the remote problem.** Local executor on LAN uses `rejectUnauthorized: false` to bridge. CF Worker reaches executor over HTTP (not bridge). |
| **Secret management** | Local executor: 1Password SDK (same env ID `vsl3suvn4s2dnekt6hr5fpykl4` as hue-control). CF Worker: Wrangler secrets (`HUE_EXECUTOR_BASE_URL`, `HUE_EXECUTOR_BEARER_TOKEN`) |
| **Auth** | `EXECUTOR_BEARER_TOKEN` protects local executor. CF Worker authenticates to it. |
| **Authority model** | Capability-based: `CapabilityDefinition` with operation kind, approval mode, verification mode. `ApprovalGrant` with target and argument filtering, expiry. |
| **Audit** | None explicitly, but read-after-write verification provides execution integrity |

**Local executor REST endpoints (4):**

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Health check |
| `/v1/lights` | GET | List all lights |
| `/v1/lights/:id` | GET | Get single light |
| `/v1/lights/:id/name` | PUT | Rename light |
| `/v1/lights/:id/state` | PUT | Set state (on/off, brightness, color temp) |

**CF Worker capabilities (4):**

| Capability | Operation | Approval | Verification |
|---|---|---|---|
| `capability.list` | read | none | response_only |
| `hue.read_inventory` | read | none | response_only |
| `hue.rename_light` | mutation | required | read_after_write |
| `hue.set_light_state` | mutation | required | read_after_write |

**Unique feature -- read-after-write verification:**
For mutations, the CF Worker reads the light state before the operation, executes the mutation via the local executor, then reads the state again afterward. It compares expected vs. actual to produce a `verified: boolean` flag. No other variant does this.

**Notable:** This is the only variant that solves the production deployment problem (self-signed cert on the bridge). The two-tier split (CF edge for policy + local executor for bridge access) is the architecture every deployed Hue MCP must follow.

---

### Variant 7/8 -- autogen-studio / creative-autogen (AutoGen Predecessors)

Identical copies of each other. Predecessors of Huey-hue-variant with a simpler structure:
- All personas in one `personas.py` (not split into separate files)
- Tool wiring inline in `autogen_workspace.py` (not in `huey.py`)
- No runtime/adapter layer, no hue_mcp_server, no grant model
- Same 4 Huey direct tools as Huey-hue-variant
- Direct LAN `httpx` bridge access

---

## Part 2: Comparison Matrix

| Feature | hue-control | v1 | v2 | Huey | work-mamaz |
|---|---|---|---|---|---|
| **Read tools** | 5 (CLI) | 4 | 11 | 2 + (4 Huey) | 2 |
| **Write tools** | 0 | 2 | 5 | 1 + (2 Huey) | 2 |
| **Total tools** | 5 | 6 | 16 | 3 + (4 Huey) | 4 |
| **Deployable to edge** | N/A | NO | NO | NO | YES |
| **Grant/authority model** | none | typed grant | typed grant | Pydantic pipeline | capability-based |
| **Audit log** | none | KV | KV | none | none (verified) |
| **Input validation** | none | minimal | thorough | minimal | thorough |
| **Error typing** | none | none | 4 typed codes | none | generic |
| **Retry/timeout** | none | none | 8s / 2 retries | none | 15s timeout |
| **Caching** | none | none | 4s in-memory | none | none |
| **1Password** | yes | no | no | no | yes |
| **Light resolver** | no | yes (v2/v1 id/name) | yes (v2/v1 id/name) | no (raw id) | no (raw id) |
| **Scene resolver** | no | no | yes (id/name) | no (raw id) | no |
| **Read-after-write** | N/A | no | no | no | YES |
| **MCP annotations** | N/A | yes | yes | no | N/A |
| **Scene recall** | no | no | yes | yes (Huey) | no |
| **Group/zone control** | no | no | yes | no | no |
| **Light effects** | no | no | yes | no | no |
| **CIE xy color** | no | no | yes | yes (Huey) | no |
| **Color temperature** | no | no | yes (mirek) | yes (Huey) | yes |
| **Sensor data** | no | no | yes (4 types) | no | no |
| **Behavior/automation** | no | no | yes | no | no |

---

## Part 3: Base Recommendation

**Base: work-mamaz-main's two-tier architecture + hue-mcp-server-v2's tool surface.**

Rationale:

1. **work-mamaz-main's local executor** is the only thing that solves the production problem. The Hue Bridge's self-signed cert means nothing on the Cloudflare edge can talk to it directly. The local executor runs on the LAN, talks to the bridge, and exposes a clean REST API over the tunnel. Every other variant hits a wall at deployment.

2. **hue-mcp-server-v2's tool definitions** are the most complete: 16 tools covering lights, rooms, zones, scenes, sensors, buttons, entertainment areas, behaviors, plus write operations for state, color, effects, scenes, and groups. All with proper MCP annotations, input validation, typed errors, caching, and retry logic.

3. **work-mamaz-main's read-after-write verification** is worth keeping for mutations. It's a practical integrity check that no other variant has.

4. **1Password integration** from both hue-control and work-mamaz-main is the right secret management approach for the local executor (not `.env` files).

5. The **nodered-mcp-server** provides the proven CF Worker pattern: `createMcpHandler` from the Agents SDK, `@modelcontextprotocol/server` for `McpServer`, bearer token auth, health endpoint. This is the template for the CF Worker tier.

What we do NOT carry forward:
- The manual JSON-RPC implementation from v1/v2 (replaced by `createMcpHandler`)
- The grant-as-tool-argument pattern from v1/v2 (the caller shouldn't need to supply a grant object -- authority should be handled at the Worker/Portal level, invisibly)
- The Pydantic proposal pipeline from Huey-hue-variant (too rigid for the "amplified capability" philosophy -- that belongs in a future governance layer, not in the MCP server itself)

---

## Part 4: Build Plan

### What we are building

A production-deployable Philips Hue MCP server accessible at `mcp.itsjeff.org` through Cloudflare MCP Portal. External clients (Claude, Codex, Gemini, etc.) connect to the Portal endpoint and get Hue tools without knowing the backend architecture.

### Architecture

```
External MCP Client (Claude, Codex, etc.)
    |
    v
Cloudflare MCP Portal (mcp.itsjeff.org)
    |
    v
CF Worker: hue-mcp-worker (Agents SDK, createMcpHandler)
    |  (fetch over CF Tunnel)
    v
Local Executor (mini PC, port 8788)
    |  (HTTPS, rejectUnauthorized: false)
    v
Philips Hue Bridge (LAN)
```

### Deliverables

There are three components. Two are code, one is configuration.

#### Component 1: Local Executor (expanded)

**Location:** `hue-mcp/local-executor/` (new directory in repo root)

**Source:** Fork of `work-mamaz-main/local-executors/hue/`

**What changes from the work-mamaz-main version:**

The existing local executor has 4 REST endpoints covering lights only. It needs to expand to cover all 16 tools from v2. New endpoints:

| Endpoint | Method | Source |
|---|---|---|
| `/v1/lights` | GET | exists |
| `/v1/lights/:id` | GET | exists |
| `/v1/lights/:id/name` | PUT | exists |
| `/v1/lights/:id/state` | PUT | exists |
| `/v1/rooms` | GET | new |
| `/v1/zones` | GET | new |
| `/v1/scenes` | GET | new |
| `/v1/scenes/:id/recall` | POST | new |
| `/v1/groups/:id/state` | PUT | new |
| `/v1/lights/:id/effect` | PUT | new |
| `/v1/sensors/motion` | GET | new |
| `/v1/sensors/buttons` | GET | new |
| `/v1/sensors/temperature` | GET | new |
| `/v1/sensors/light-level` | GET | new |
| `/v1/entertainment` | GET | new |
| `/v1/behaviors/scripts` | GET | new |
| `/v1/behaviors/instances` | GET | new |
| `/health` | GET | exists |

**What stays the same:**
- 1Password SDK integration (same env ID)
- `rejectUnauthorized: false` for bridge HTTPS
- Bearer token auth on the executor itself
- Node.js `http.createServer` pattern
- `HueClientService` class structure (expanded with new methods from v2's `HueClient`)

**What gets added from v2:**
- All HueClient methods from `hue-mcp-server-v2/src/hue-client.ts`: `rooms()`, `zones()`, `scenes()`, `motionSensors()`, `buttons()`, `temperatureSensors()`, `lightLevelSensors()`, `entertainmentAreas()`, `behaviorScripts()`, `behaviorInstances()`, `setLightEffect()`, `recallScene()`, `setGroupState()`, `resolveSceneId()`
- Input validation from v2 (brightness 0-100, mirek 153-500, CIE xy 0-1)
- CIE xy color and mirek color temperature support on `setLightState`
- 10s request timeout (already exists in work-mamaz version)

#### Component 2: CF Worker MCP Server

**Location:** `hue-mcp/worker/` (alongside local-executor)

**Pattern:** Same as `nodered-mcp-server` -- `createMcpHandler` from Agents SDK, `McpServer` from `@modelcontextprotocol/server`, bearer token auth, health endpoint.

**What it does:**
- Exposes all 16 tools from v2 as proper MCP tools with annotations
- Routes each tool call to the local executor via `fetch()` through CF Tunnel
- Performs read-after-write verification on mutations (from work-mamaz-main's `executors.ts`)
- Bearer token auth (checked before MCP handler)

**Tool definitions:** Taken from `hue-mcp-server-v2/src/tools.ts`, adapted to remove the grant-as-argument pattern. Write tools accept the same parameters minus the `grant` field. Authority is handled at the Portal/Access level, not by the caller.

**Config (wrangler.toml):**
- `HUE_EXECUTOR_BASE_URL` -- local executor URL through tunnel (e.g. `https://hue-executor.itsjeff.org`)
- `HUE_EXECUTOR_BEARER_TOKEN` -- secret, authenticates Worker to executor
- `MCP_AUTH_TOKEN` -- secret, authenticates MCP clients to Worker
- No Durable Objects needed (stateless `createMcpHandler`)

**Dependencies:** Same as nodered-mcp-server: `@modelcontextprotocol/server`, `agents`, `zod`

#### Component 3: Cloudflare MCP Portal Configuration

**Location:** Cloudflare dashboard (Zero Trust > Access controls > AI controls)

**What gets configured:**
- Create MCP Portal at `mcp.itsjeff.org`
- Add the hue-mcp-worker as a connected MCP server
- DNS: CNAME `mcp.itsjeff.org` to `gateway.agents.cloudflare.com`
- Access policy for authentication (OAuth or service tokens, depending on what's already configured)

This is dashboard configuration, not code. I will document the exact steps but the Portal setup itself requires your Cloudflare account.

#### Directory structure

```
hue-mcp/
  local-executor/
    src/
      server.ts          -- expanded from work-mamaz-main
      hue-client.ts      -- expanded with v2's methods
    package.json
    tsconfig.json
  worker/
    src/
      index.ts           -- createMcpHandler pattern from nodered-mcp-server
      tools.ts           -- 16 tool definitions from v2, sans grant args
      hue-proxy.ts       -- fetch-to-executor routing + read-after-write
      types.ts           -- Env, type definitions
    package.json
    wrangler.toml
    tsconfig.json
```

### What I will NOT be doing

- No grant-as-tool-argument pattern (authority is at Portal/Access level)
- No Durable Objects or approval workflows (that's federated-mcp-platform territory, not this POC)
- No AutoGen or multi-agent orchestration (that's Huey territory)
- No changes to any existing variant (they stay as they are)
- No KV audit log in the POC (can be added later; read-after-write verification provides execution integrity)
- No Pydantic pipeline or simulation layer (future governance layer)

### Deployment sequence

1. I build the local executor and CF Worker code in `hue-mcp/`
2. You deploy the local executor on your mini PC (it's a standalone Node.js server)
3. You ensure a CF Tunnel route exposes the local executor (e.g. `hue-executor.itsjeff.org`)
4. You deploy the CF Worker via `wrangler deploy` and set secrets
5. You create the MCP Portal in the CF dashboard and connect the Worker
6. You CNAME `mcp.itsjeff.org` to `gateway.agents.cloudflare.com`
7. External clients can connect to `mcp.itsjeff.org` and call Hue tools

Steps 1 is what I do. Steps 2-7 require your Cloudflare account and mini PC access. I will provide exact instructions for each.
