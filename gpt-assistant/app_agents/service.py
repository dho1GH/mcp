from __future__ import annotations

from functools import lru_cache

from app_agents.persistent_agent import PersistentStateAgent


@lru_cache(maxsize=1)
def get_agent() -> PersistentStateAgent:
    return PersistentStateAgent()


def handle_chat(payload: dict) -> dict:
    agent = get_agent()
    return agent.handle(payload)
