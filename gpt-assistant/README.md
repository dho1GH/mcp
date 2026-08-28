# Assistant

Live assistant runtime for the mini-PC stack.

## Current Role

This is the active assistant execution service in the stack.

It is responsible for:

- serving the MCP assistant surface on port `8765`
- handling assistant turns through OpenAI
- maintaining conversational continuity through Zep
- maintaining OpenAI conversation continuity
- exposing file ingestion and file-search-backed retrieval
- exposing the Home Graph `devices` tool

It is not currently the control-plane, approval-plane, or runtime-state authority.

## Runtime Shape

Path:

```text
/srv/ai-stack/apps/gpt-assistant
```

Observed deployment shape:

- container: `assistant`
- MCP HTTP port: `8765`
- MCP endpoint: `http://127.0.0.1:8765/mcp`
- persisted runtime data: Docker volume `gpt_assistant_gpt_assistant_data`

## Unified Daemon CLI (`main.py`)

The service provides a unified command-line entry point to simplify startup, testing, and status inspection.

```bash
# Start the MCP server in HTTP/SSE mode (Default Docker entry point)
python3 main.py start

# Start the MCP server in direct STDIO mode
python3 main.py stdio

# Run a diagnostic turn with the assistant (smoketest)
python3 main.py test

# Check the memory configuration and SQLite database tracking status
python3 main.py status
```

## Current Turn Path

The current active turn flow is:

1. MCP `chat(...)`
2. `app_agents/controller.py`
3. `app_agents/persistent_agent.py`
4. user message written to Zep
5. Zep context and recent memory retrieved
6. OpenAI response generated
7. assistant reply written back to Zep

The live instance currently uses the direct Responses API path.

## OpenAI Runtime

Required:

- `OPENAI_API_KEY`

Common controls:

- `OPENAI_MODEL`
- `OPENAI_TIMEOUT_SECONDS`
- `OPENAI_MAX_RETRIES`
- `OPENAI_REASONING_EFFORT`
- `OPENAI_VERBOSITY`
- `OPENAI_MAX_OUTPUT_TOKENS`
- `OPENAI_STORE`
- `OPENAI_PROMPT_CACHE_KEY`
- `OPENAI_PROMPT_CACHE_RETENTION`
- `OPENAI_FILE_SEARCH_MAX_RESULTS`

Current observed default model in local config:

- `gpt-4o`

## Agents SDK Status

The codebase supports both:

- OpenAI Agents SDK
- direct Responses API execution

But the currently observed live instance is configured with:

```text
APP_AGENTS_USE_AGENTS_SDK=0
```

So support exists in code, but the live service is currently running on the direct Responses path rather than the Agents SDK path.

## Zep Memory Boundary

Zep is the active conversational memory system for this service.

Current implementation:

- Zep is accessed through raw HTTP calls in `memory/zep.py`
- this service does not currently use the Zep SDK
- if Zep degrades and fallback is enabled, local JSONL memory is used as a degradation path

Important distinction:

- Zep here is live memory infrastructure
- it is not the authoritative control-plane or policy substrate

## Zep Controls

- `ZEP_API_KEY`
- `ZEP_API_URL`
- `ZEP_USER_ID`
- `ZEP_THREAD_ID`
- `ZEP_ASSISTANT_NAME`
- `ZEP_MEMORY_LIMIT`
- `ZEP_FALLBACK_TO_LOCAL`
- `APP_AGENTS_MEMORY_PATH`

## File Search and Local Persistence

This service also maintains:

- OpenAI conversation IDs in local SQLite
- OpenAI vector-store IDs in local SQLite
- file ingestion for vector-store search

That means this service has more than conversational memory:

- Zep continuity
- OpenAI conversation continuity
- OpenAI file-search retrieval
- local ID persistence

## Home Graph Tooling

This service exposes a `devices` tool that queries the Home Graph API.

That read-only lane is part of this assistant surface and is separate from runtime-core governance.

## Boundary Notes

- This is the live assistant path today.
- It is not currently proven to run through `runtime-core-v1`.
- It should not be conflated with `redo-ryan`, which is a separate Ryan/Zep testing repo.
- It should not be conflated with the richer but undeployed `acs_full_loop` turn-loop design.

## Local Runtime Controls

- `APP_AGENTS_USE_AGENTS_SDK`
- `ASSISTANT_DB_PATH`
- `APP_AGENTS_MEMORY_PATH`

Copy `.env.example` to `.env` on the mini-PC and fill the real keys there. The repo intentionally does not include tracked secrets.
