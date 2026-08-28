"""GPT Assistant Runtime Unified Entry Point.

Provides commands to start the MCP server, run diagnostics, and inspect configuration state.
"""

from __future__ import annotations

import argparse
import os
import sqlite3
import sys
from pathlib import Path

from dotenv import load_dotenv

# Load env variables from local .env
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")


def run_http_server() -> None:
    """Start the MCP HTTP/SSE server."""
    import uvicorn
    from mcp_server import mcp

    host = os.getenv("MCP_HOST", "127.0.0.1")
    port = int(os.getenv("MCP_PORT", "8765"))
    reload = os.getenv("MCP_RELOAD", "false").lower() in ("1", "true", "yes")

    print(f"🚀 Starting MCP server on http://{host}:{port}/mcp ...")
    uvicorn.run(
        mcp.streamable_http_app(),
        host=host,
        port=port,
        reload=reload,
    )


def run_stdio_server() -> None:
    """Start the MCP server in direct STDIO mode."""
    from mcp_server import mcp

    print("🔌 Starting MCP server in STDIO mode...")
    mcp.run(transport="stdio")


def run_smoketest() -> None:
    """Run a diagnostic turn with the assistant."""
    print("🧪 Running diagnostic smoketest...")
    from app_agents.persistent_agent import PersistentStateAgent

    try:
        agent = PersistentStateAgent()
        out = agent.handle(
            {
                "user_id": "default",
                "input": "Say hello and confirm that you can read this.",
            }
        )
        print("\n✨ --- Smoketest Response ---")
        print(out.get("text") if isinstance(out, dict) else out)
        print("-----------------------------\n")
    except Exception as exc:
        print(f"❌ Smoketest failed: {exc}", file=sys.stderr)
        sys.exit(1)


def print_status() -> None:
    """Read and display current integration & storage configurations."""
    from config.db import DB_PATH, init_db
    from memory.zep import memory_status

    # Ensure DB is initialized to query correctly
    init_db()

    print("\n📊 --- GPT Assistant Status ---")
    status = memory_status()
    print(f"Active Memory Backend : {status.get('backend')}")
    print(f"Zep Configured        : {status.get('zepConfigured')}")
    print(f"Default User ID       : {status.get('defaultUserId')}")
    print(f"Default Thread ID     : {status.get('defaultThreadId')}")
    print(f"Local Fallback        : {status.get('localFallbackEnabled')}")

    print(f"\nDatabase Storage      : {DB_PATH.absolute()}")
    if DB_PATH.exists():
        try:
            with sqlite3.connect(DB_PATH) as conn:
                c = conn.cursor()
                convs = c.execute("SELECT count(*) FROM user_conversations").fetchone()[0]
                stores = c.execute("SELECT count(*) FROM vector_stores").fetchone()[0]
                print(f"  ├─ User conversations tracked : {convs}")
                print(f"  └─ File vector stores tracked : {stores}")
        except Exception as e:
            print(f"  └─ Error reading database: {e}")
    else:
        print("  └─ (Database file initialized, ready on startup)")
    print("--------------------------------\n")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="GPT Assistant Unified Daemon Entry Point.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Command: start
    subparsers.add_parser("start", help="Start the MCP server in HTTP/SSE mode (default)")
    # Command: stdio
    subparsers.add_parser("stdio", help="Start the MCP server in STDIO mode")
    # Command: test
    subparsers.add_parser("test", help="Run a quick diagnostic smoketest")
    # Command: status
    subparsers.add_parser("status", help="Show current integration and database status")

    args = parser.parse_args()

    # Default to start (HTTP/SSE server)
    command = args.command or "start"

    if command == "start":
        run_http_server()
    elif command == "stdio":
        run_stdio_server()
    elif command == "test":
        run_smoketest()
    elif command == "status":
        print_status()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
