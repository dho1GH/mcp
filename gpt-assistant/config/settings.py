from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv


def _load_env() -> None:
    env_path = Path(__file__).resolve().parent.parent / ".env"
    load_dotenv(dotenv_path=env_path)


@dataclass(frozen=True)
class Settings:
    mcp_host: str
    mcp_port: int
    mcp_transport: str
    mcp_reload: bool
    openai_model: str
    zep_memory_limit: int


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    _load_env()
    return Settings(
        mcp_host=os.getenv("MCP_HOST", "127.0.0.1"),
        mcp_port=int(os.getenv("MCP_PORT", "8765")),
        mcp_transport=os.getenv("MCP_TRANSPORT", "stdio"),
        mcp_reload=os.getenv("MCP_RELOAD", "false").lower() in ("1", "true", "yes"),
        openai_model=os.getenv("OPENAI_MODEL", "gpt-4o"),
        zep_memory_limit=int(os.getenv("ZEP_MEMORY_LIMIT", "8")),
    )
