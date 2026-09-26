# mcp

A monorepo of Model Context Protocol servers, agent runtimes, and the
Cloudflare Workers that front them.

> **Private repo.** `graphiti_mcp_server/` contains third-party Apache-2.0 code
> that is not yet properly attributed — see [`LICENSE`](LICENSE) and
> [`graphiti_mcp_server/NOTICE.md`](graphiti_mcp_server/NOTICE.md) before making
> this repository public.

## Projects

### MCP servers on Cloudflare Workers

| Project | What it does | Status |
|---|---|---|
| `nodered-mcp-server` | Exposes Node-RED flow management as MCP tools. Stateless `createMcpHandler`, bearer-token gate, append-only audit log. | Reference implementation — both Hue Workers state they follow its pattern. Best documented; no tests |
| `hue-mcp-server` | First cut at exposing a Philips Hue bridge as MCP tools. | Superseded by v2 |
| `hue-mcp-server-v2` | Current Hue Worker. Fuller tool surface and Hue client than v1. | Current |
| `federated-mcp-platform` | Control plane for authenticated, human-in-the-loop MCP federation. Side-effecting tools create durable approval requests instead of executing inline. | **Never deployed** |
| `3dflat-affairs` | Spatial/digital-twin Worker plus the flat's spatial graph seed data and Cypher schema. | Prototype, has duplicates |
| `work-mamaz-main` | `jeffe-os` Worker: capability grants, executors, MCP surface, plus a local Hue executor. Has a real vitest suite for the capability grant logic. | **Does not build** — see below |

### Agent runtimes (Python)

| Project | What it does | Status |
|---|---|---|
| `Huey-hue-variant` | **The most developed agent runtime.** Six personas as separate modules, a `runtime/` layer with adapters, and a governed execution path: every non-Huey caller reaches Hue only through `HueAdapter.execute()` against an approved envelope. | Current |
| `creative-autogen` | Mid-generation AutoGen workspace: personas in a single module, Hue client wired directly onto Huey's agent. | Superseded |
| `zep-autogen-workspace` | Original seed. Generic Planner/Executor/Critic agents, no personas. | Historical |
| `gpt-assistant` | Live assistant runtime for the mini-PC stack. Serves the MCP assistant surface on `:8765`. | Live |
| `graphiti_mcp_server` | Graphiti knowledge-graph MCP server. Vendored third-party code. | Third-party |

### Other

| Project | What it does |
|---|---|
| `hue-control` | Plain-ESM Hue CLI plus the lighting inventory and home-map docs |
| `Zep_Temporal` | Zep Cloud + Graphiti + Temporal ingestion starter (TypeScript) |

### How the AutoGen projects relate

They are a lineage, not copies. Each one carries work the others do not:

```
zep-autogen-workspace     generic agents, MAX_ROUNDS=8, temp 0.4
        │
        ▼
creative-autogen          + personas.py, + hue_client, MAX_ROUNDS=24, temp 0.7
        │
        ▼
Huey-hue-variant          + personas/ split into 7 modules
                          + runtime/ + adapters, governed envelope model
                          + its own hue_mcp_server.py
```

Start from `Huey-hue-variant` for new work.

## Development

Each project is self-contained — there is no root-level package manager or
build. Work inside the project directory.

```bash
# Node / Workers
cd nodered-mcp-server && npm install && npx tsc --noEmit

# federated-mcp-platform uses pnpm and has tests
cd federated-mcp-platform && pnpm install && pnpm run check

# Python (graphiti has the only real test suite)
cd graphiti_mcp_server && uv sync --all-extras && uv run pytest
```

Every project reads configuration from a local `.env`, which is gitignored.
No `.env` has ever been committed to this repository.

## CI/CD

Workflows are path-filtered, so changing one project does not run every job.

| Workflow | Trigger | Does |
|---|---|---|
| `ci-python.yml` | Python paths | pytest + ruff on `graphiti_mcp_server`; byte-compile the rest |
| `ci-node.yml` | Node paths | vitest + tsc on `federated-mcp-platform`; tsc on the Workers; `node --check` on `hue-control` |
| `deploy-workers.yml` | push to `main` | `wrangler deploy --dry-run` — builds and validates, publishes nothing |
| `deploy-workers.yml` | manual dispatch | Real `wrangler deploy` for one chosen project, gated on the `production` environment |

Real deploys are deliberately **not** automatic on merge. See the comment block
at the top of `deploy-workers.yml` for why.

Deploys require `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as
repository or organization secrets.

`work-mamaz-main` is excluded from CI and deploys entirely: it has no
`package.json`, and its `wrangler.jsonc` points `main` at `worker/index.ts`,
which does not exist. Its `test/capabilities.test.ts` is a genuine vitest suite
that cannot currently run for the same reason. See
[`docs/MIGRATION.md`](docs/MIGRATION.md) for the full list of known issues.
