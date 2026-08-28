from __future__ import annotations

import io
import os

from mcp.server.fastmcp.server import FastMCP

from app_agents.controller import get_agent, handle_chat
from config.db import init_db
from config.settings import get_settings
from memory.zep import get_last_messages


def create_mcp_app() -> FastMCP:
    settings = get_settings()
    init_db()

    mcp = FastMCP(
        name="gpt-assistant",
        instructions="Tools for chatting with a persistent assistant, memory, and ingestion.",
        host=settings.mcp_host,
        port=settings.mcp_port,
    )

    @mcp.tool()
    def chat(input: str, user_id: str = "default") -> dict:
        """Send a message to the assistant."""
        return handle_chat({"user_id": user_id, "input": input})

    @mcp.tool()
    def memory(user_id: str = "default", limit: int = 10) -> dict:
        """Fetch recent memory entries from Zep."""
        return {"user_id": user_id, "messages": get_last_messages(user_id=user_id, limit=limit)}

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

    return mcp
