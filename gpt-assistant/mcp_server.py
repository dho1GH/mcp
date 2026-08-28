import io
import os
import requests
from pathlib import Path

from dotenv import load_dotenv
from mcp.server.fastmcp.server import FastMCP

from config.db import init_db

load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")
init_db()

from app_agents.controller import get_agent, handle_chat
from memory.zep import get_last_messages, memory_status

MCP_HOST = os.getenv("MCP_HOST", "127.0.0.1")
MCP_PORT = int(os.getenv("MCP_PORT", "8765"))
MCP_TRANSPORT = os.getenv("MCP_TRANSPORT", "stdio")

mcp = FastMCP(
    name="assistant",
    instructions="Tools for chatting with a persistent assistant, memory, and ingestion.",
    host=MCP_HOST,
    port=MCP_PORT,
)


@mcp.tool()
def chat(input: str, user_id: str = "default", thread_id: str | None = None) -> dict:
    """Send a message to the assistant."""
    payload = {"user_id": user_id, "input": input}
    if thread_id:
        payload["thread_id"] = thread_id
    return handle_chat(payload)


@mcp.tool()
def memory(user_id: str = "default", limit: int = 10) -> dict:
    """Fetch recent memory entries."""
    return {"user_id": user_id, "messages": get_last_messages(user_id=user_id, limit=limit)}


@mcp.tool()
def memory_runtime() -> dict:
    """Report which memory backend is configured."""
    return memory_status()


@mcp.tool()
def conversation_new(user_id: str = "default") -> dict:
    """Start a new OpenAI conversation thread."""
    agent = get_agent()
    conv_id = agent.new_conversation(user_id)
    return {"conversation_id": conv_id}


@mcp.tool()
def ingest_path(path: str, filename: str | None = None) -> dict:
    """Upload a local file into the OpenAI vector store."""
    if not os.path.isfile(path):
        raise FileNotFoundError(path)
    name = filename or os.path.basename(path)
    agent = get_agent()
    with open(path, "rb") as handle:
        result = agent.ingest_file(handle, name)
    return {"vector_store_id": agent.get_vector_store_id(), **result}


@mcp.tool()
def ingest_text(filename: str, content: str) -> dict:
    """Upload text content into the OpenAI vector store."""
    agent = get_agent()
    data = io.BytesIO(content.encode("utf-8"))
    result = agent.ingest_file(data, filename)
    return {"vector_store_id": agent.get_vector_store_id(), **result}


def _home_graph_headers() -> dict:
    token = os.getenv("HOME_GRAPH_API_TOKEN") or os.getenv("GRAPH_API_TOKEN")
    if not token:
        raise RuntimeError("HOME_GRAPH_API_TOKEN or GRAPH_API_TOKEN is not configured")
    return {"authorization": f"Bearer {token}"}


@mcp.tool()
def devices(query: str = "", room: str | None = None, kind: str | None = None, limit: int = 50) -> dict:
    """Search the Home Graph device registry. Read-only. Includes devices, sensors, hubs, hosts, rooms, entities, capabilities, and source-backed refs where available."""
    base_url = os.getenv("HOME_GRAPH_API_URL", "http://home-graph-api:5050").rstrip("/")
    params = {"q": query or "", "limit": max(1, min(int(limit), 100))}
    if room:
        params["room"] = room
    if kind:
        params["kind"] = kind
    response = requests.get(
        f"{base_url}/registry/devices",
        headers=_home_graph_headers(),
        params=params,
        timeout=15,
    )
    response.raise_for_status()
    return response.json()


if __name__ == "__main__":
    mcp.run(transport=MCP_TRANSPORT)
