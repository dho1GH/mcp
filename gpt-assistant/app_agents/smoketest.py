"""Smoke test for the persistent assistant runtime.

Usage:
  APP_AGENTS_USE_AGENTS_SDK=0 python -m app_agents.smoketest
"""

from __future__ import annotations

try:
    from .persistent_agent import PersistentStateAgent
except ImportError:  # Allows `python smoketest.py` from inside app_agents/.
    from persistent_agent import PersistentStateAgent


if __name__ == "__main__":
    agent = PersistentStateAgent()
    out = agent.handle(
        {
            "user_id": "default",
            "input": "Say hello and tell me whether memory is wired.",
        }
    )
    print(out)
