# nodered-mcp-server

A remote MCP server that exposes Node-RED flow management as tools, deployed
on Cloudflare Workers. This is the piece that lets Claude (or any MCP client)
read, edit, and deploy your Node-RED flows through a controlled, auditable
interface instead of raw HTTP calls against Node-RED's admin API.

Built on Cloudflare's current **stateless** MCP handler (`createMcpHandler`),
not the deprecated `McpAgent`/Durable Object path — no persistent
infrastructure required, just a Worker.

## How it fits together

```
Claude  ──MCP (HTTPS, Bearer token)──▶  This Worker  ──HTTPS (Cloudflare Tunnel)──▶  Node-RED (mini PC, Docker)
```

- Your Node-RED instance stays exactly as it is — no port forwarding, reached
  only through your existing `cloudflared` tunnel.
- This Worker is the only thing that holds Node-RED's `adminAuth` credentials.
  Claude never sees them; it only holds a bearer token for *this* Worker.
- Every Node-RED admin API endpoint is wrapped as an explicit tool with a
  description, input schema, and read-only/destructive annotations — Claude
  can't do anything to Node-RED that isn't one of these 9 tools.

## Tools exposed

| Tool | Effect |
|---|---|
| `nodered_get_flows` | Read the full flow set + revision id |
| `nodered_list_flow_tabs` | Read a lightweight tab overview (id, label, node count) |
| `nodered_get_flow` | Read one tab by id |
| `nodered_deploy_flows` | **Destructive.** Replace the entire flow set and deploy |
| `nodered_create_flow` | Add a new tab |
| `nodered_update_flow` | **Destructive.** Replace one tab by id |
| `nodered_delete_flow` | **Destructive.** Delete a tab |
| `nodered_list_installed_nodes` | Read installed node types (for validating flow JSON before writing it) |
| `nodered_get_runtime_settings` | Read non-secret runtime settings |

## One-time setup

### 1. Enable Node-RED's admin API auth

In your Node-RED `settings.js` (inside the `nodered` container's `/data`
volume), uncomment and configure `adminAuth`:

```js
adminAuth: {
    type: "credentials",
    users: [{
        username: "admin",
        password: "$2b$08$...", // output of: node-red-admin hash-pw
        permissions: "*"
    }]
},
```

Generate the hash:

```bash
docker compose exec nodered node-red-admin hash-pw
```

Restart the container after saving.

### 2. Expose Node-RED through your existing Cloudflare Tunnel

In the Cloudflare Zero Trust dashboard → **Networks → Tunnels** → your
tunnel → **Public Hostname**, add a route:

- Subdomain: `nodered` (or your choice)
- Domain: your domain
- Service: `HTTP`, `localhost:1880`

This gives you a public hostname like `https://nodered.yourdomain.com` that
reaches Node-RED without opening any port on your router. Put that hostname
in `wrangler.toml` under `NODE_RED_BASE_URL`.

**Optional, stronger:** put that hostname behind **Cloudflare Access** with a
service-token policy scoped to this Worker, and set `CF_ACCESS_CLIENT_ID` /
`CF_ACCESS_CLIENT_SECRET` as Worker secrets. That way even if the Worker's
`MCP_AUTH_TOKEN` ever leaked, the tunnel hostname itself still requires the
Access service token.

### 3. Install and configure this project

```bash
npm install
```

Edit `wrangler.toml`: set `NODE_RED_BASE_URL` to the hostname from step 2.

Set secrets (prompted interactively, never stored in this repo):

```bash
npx wrangler secret put NODE_RED_USERNAME
npx wrangler secret put NODE_RED_PASSWORD
npx wrangler secret put MCP_AUTH_TOKEN       # generate with: openssl rand -hex 32
# Optional, only if using Cloudflare Access service tokens:
npx wrangler secret put CF_ACCESS_CLIENT_ID
npx wrangler secret put CF_ACCESS_CLIENT_SECRET
```

For local development, copy `.dev.vars.example` to `.dev.vars` and fill in
the same values — `wrangler dev` reads secrets from there instead.

### 4. Verify it locally

```bash
npm run dev
```

In another terminal:

```bash
curl http://localhost:8788/health
# -> ok

curl -X POST http://localhost:8788/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your MCP_AUTH_TOKEN>" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

You should see all 9 `nodered_*` tools listed.

### 5. Deploy

```bash
npm run deploy
```

This publishes to `nodered-mcp-server.<your-account>.workers.dev/mcp` by
default. Add a custom route/domain in `wrangler.toml` if you'd rather use
your own subdomain.

### 6. Connect it in Claude

Add it as an MCP connector using the deployed URL
(`https://nodered-mcp-server.<account>.workers.dev/mcp`) and the
`MCP_AUTH_TOKEN` as a Bearer token in the connector's auth config.

## Design notes

- **Stateless by design.** Each MCP request gets a fresh server instance —
  no session state lives in the Worker. Node-RED's own `rev` field is what
  protects `nodered_deploy_flows` against clobbering concurrent edits, not
  anything held in this Worker.
- **Optimistic concurrency, not locking.** Always call `nodered_get_flows`
  immediately before `nodered_deploy_flows` to get a fresh `rev`. A stale
  `rev` gets rejected by Node-RED (409) rather than silently overwriting
  someone else's change.
- **Least-surprise deploys.** `nodered_create_flow` and `nodered_update_flow`
  are scoped to a single tab and are preferred over
  `nodered_deploy_flows` (which replaces everything) whenever a change is
  contained to one tab.
- **Defense in depth on auth.** Three independent layers: the tunnel itself
  (private by default), optionally Cloudflare Access in front of the
  hostname, and this Worker's own bearer-token check before any MCP request
  is processed. Node-RED's `adminAuth` credentials never leave this Worker.

## Project structure

```
nodered-mcp-server/
├── package.json
├── tsconfig.json
├── wrangler.toml
├── .dev.vars.example
└── src/
    ├── index.ts           # Worker entry point + auth gate
    ├── tools.ts           # MCP tool registrations
    ├── nodered-client.ts  # Node-RED admin API client (auth, requests)
    └── types.ts           # Shared types
```
