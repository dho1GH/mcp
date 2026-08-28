"""Simple controller functions around the persistent assistant runtime."""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Dict

try:
    from .persistent_agent import BASE_INSTRUCTIONS, MODEL, PersistentStateAgent
except ImportError:  # Allows `python controller.py` from inside app_agents/.
    from persistent_agent import BASE_INSTRUCTIONS, MODEL, PersistentStateAgent


@lru_cache(maxsize=1)
def get_agent() -> PersistentStateAgent:
    return PersistentStateAgent()


def get_or_create_conversation(user_id: str) -> str:
    return get_agent()._get_or_create_conversation(user_id)


def handle_chat(payload: Dict[str, str]) -> Dict[str, str]:
    return get_agent().handle(payload)


def ingest_file(file_obj, filename: str) -> Dict[str, str]:
    return get_agent().ingest_file(file_obj, filename)


__all__ = [
    "BASE_INSTRUCTIONS",
    "MODEL",
    "PersistentStateAgent",
    "get_agent",
    "get_or_create_conversation",
    "handle_chat",
    "ingest_file",
]
