
import os
from pathlib import Path
from dotenv import load_dotenv
from mcp.server.fastmcp.server import FastMCP

load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

from app_agents.controller import handle_chat
from memory.zep import get_last_messages

MCP_HOST = os.getenv("MCP_HOST", "127.0.0.1")
MCP_PORT = int(os.getenv("MCP_PORT", "8765"))
MCP_TRANSPORT = os.getenv("MCP_TRANSPORT", "stdio")

mcp = FastMCP(
    name="zep-autogen-workspace",
    instructions="MCP tools for multi-agent chat with Zep-backed memory.",
    host=MCP_HOST,
    port=MCP_PORT,
)

@mcp.tool()
def chat(input: str, user_id: str = "default") -> dict:
    return handle_chat({"user_id": user_id, "input": input})

@mcp.tool()
def memory(user_id: str = "default", limit: int = 10) -> dict:
    return {"user_id": user_id, "messages": get_last_messages(user_id=user_id, limit=limit)}

if __name__ == "__main__":
    mcp.run(transport=MCP_TRANSPORT)
