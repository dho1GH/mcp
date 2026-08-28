# hue-mcp-server

A remote MCP server exposing your Philips Hue bridge as tools, following the
exact pattern of `nodered-mcp-server`: typed tools with `readOnlyHint`/
`destructiveHint` annotations, a bearer-token gate, and every call written to
an append-only audit log before it returns.

## What's different from nodered-mcp-server

Node-RED's admin API sits behind your Cloudflare Tunnel, so a *deployed*
Worker can reach it from Cloudflare's cloud. The Hue Bridge uses a
self-signed local certificate and has no tunnel in front of it here, so:

- **Local dev (`npm run dev` / `wrangler dev`) works today** — it runs as a
  process on your machine, on your LAN, and can reach the bridge directly at
  `https://<bridge-ip>`, same as `hue_v2_rename_lights.py` does.
- **A deployed Worker cannot reach the bridge** until the bridge is reachable
  over HTTPS with a real cert from outside your LAN — e.g. put it behind the
  same tunnel/reverse-proxy pattern as Node-RED, or run this Worker as a
  local-only dev server permanently instead of deploying it.

So this is currently a "run it on your network" tool, not yet a "deploy it
to Cloudflare's edge" tool. That's a real gap to close later, not a bug.

## Grant model

Two of the five tools are pure reads (`hue_list_*`) and execute
unconditionally — no grant needed, matching the read tier from the
Node-RED server.

The two write tools, `hue_rename_light` and `hue_set_light_state`, require a
`grant` argument shaped like `hue-metadata-grant.json`:

```json
{
  "grantId": "grant_example_hue_metadata",
  "scope": "APPLY_HUE_METADATA_ONLY",
  "systems": ["hue"],
  "allowedOperations": ["metadata_write"],
  "allowedTargets": ["Beta Bedroom"],
  "forbiddenSystems": ["home_assistant", "node_red", "homekit", "google_home", "filesystem"],
  "forbiddenOperations": ["restart", "reload", "delete", "deploy"],
  "expires": "after_single_execution",
  "postAuditRequired": true
}
```

`src/grant.ts` checks the grant against the actual operation and the light's
*current* name before calling the Hue API — not after. A grant scoped to
`"Beta Bedroom"` cannot rename or change state on any other light, and a
single-execution grant is consumed on first successful use.

This mirrors agentic-control-plane's rule that natural-language permission
is never accepted by the executor — only a typed grant matching system,
operation, and target is honored.

## Tools

| Tool | Effect | Grant required |
|---|---|---|
| `hue_list_lights` | Read all lights | No |
| `hue_list_rooms` | Read all rooms | No |
| `hue_list_zones` | Read all zones | No |
| `hue_list_scenes` | Read all scenes | No |
| `hue_rename_light` | Rename one light | Yes — `metadata_write` |
| `hue_set_light_state` | On/off + brightness | Yes — `state_write` |

## Audit log

Every call — read or write, allowed or blocked — writes one entry to the
`AUDIT_LOG` KV namespace: timestamp, tool name, args, grant id (if any), and
outcome (`executed` / `blocked` / `failed`). A blocked write is logged with
the specific reason (e.g. "Target not in allowedTargets") before the error
is returned to the caller, so a denied action is still traceable.

## Correctness (production-grade pass 1)

Verified type-checks cleanly against the actual Cloudflare Workers types
(`tsc --strict`, zero errors — see repo history for the exact command used
since `@cloudflare/workers-types` couldn't be fetched in the build sandbox
and had to be stubbed for that one check).

What changed from the first version:

- **Timeout.** Every Hue Bridge call is wrapped with an 8s `AbortController`
  timeout. A hung/sleeping bridge fails fast instead of hanging the request.
- **Retry with backoff.** Up to 2 retries (300ms, 600ms) on timeouts, 5xx
  responses, and network-level failures (DNS/connection errors surface as
  `TypeError` from `fetch`). 4xx and grant/validation errors are never
  retried — they're not transient.
- **Typed errors.** `HueTimeoutError`, `HueApiError` (carries the real HTTP
  status), `HueValidationError`, and `GrantViolation` are now distinct
  classes, each mapped to its own JSON-RPC error code
  (`-32001`..`-32003`, `-32602` for validation) instead of one generic
  `-32000` for everything. A caller — you, in conversation — can tell "the
  bridge is offline" apart from "that value was invalid" apart from "the
  grant said no."
- **Runtime validation.** `brightness` (0–100), `mirek` (153–500), `xy`
  (0–1 each), and required strings are checked *before* any bridge call is
  made, not just described in the JSON Schema. A bad value now fails
  instantly with a clear message instead of either silently passing through
  or failing opaquely inside the Hue API response.
- **Short-TTL cache** (4s) on `lights()` and `scenes()`, the two lists every
  write has to resolve a name against first. Cuts the bridge round-trips
  for a rapid back-and-forth conversation (list, then act, then act again)
  without risking a stale read past a few seconds. Invalidated immediately
  on any write that changes a light (rename, state, effect).
- **Universal audit-on-failure.** Every tool call now runs inside one outer
  try/catch: grant blocks keep their detailed reason (unchanged from
  before), and anything else that throws — timeout, bridge rejection,
  validation error — gets one `"failed"` audit entry with the real error
  message, so nothing that errors out goes unlogged.
- **Malformed request bodies** (`tools/call` with broken JSON) now return a
  clean `-32700` instead of throwing an unhandled exception in the Worker.

Not yet done: security hardening (constant-time token comparison, CORS,
request size limits, rate limiting) and operational maturity (structured
logging, a health check that actually pings the bridge, automated tests,
audit log retention). Next passes.

## Setup


```bash
npm install
npx wrangler kv namespace create AUDIT_LOG
# paste the returned id into wrangler.toml under [[kv_namespaces]]

cp .dev.vars.example .dev.vars
# fill in HUE_BRIDGE_IP, HUE_APP_KEY (from hue_v2_rename_lights.py --create-key),
# and a generated MCP_AUTH_TOKEN

npm run dev
```

Verify locally:

```bash
curl http://localhost:8787/health
# -> ok

curl -X POST http://localhost:8787/mcp \
  -H "Authorization: Bearer <your MCP_AUTH_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Connect it in Claude as a local/custom MCP connector pointing at
`http://localhost:8787/mcp` while `wrangler dev` is running.
