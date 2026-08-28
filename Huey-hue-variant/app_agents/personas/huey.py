"""
Huey -- lighting is his lens, real Philips Hue access is his alone.

He holds direct, ungated control of the actual bridge -- no grant, no
simulation-then-approval detour, no MCP hop. That was always the
correct design: least privilege here means exactly one identity in the
entire codebase can touch a real light, and it's colocated in this
file so there's nothing to trace across modules to verify it.

The grant-based runtime (app_agents/runtime/) and the Hue MCP server
(hue_mcp_server.py) are the governed path for everyone who ISN'T
Huey -- every other persona, and anything external. They're not a
replacement for what's here; they're the boundary that keeps everyone
else out. Two layers of the same thing, not competing designs:
  - Huey: direct access, because he IS the domain.
  - Everyone else: adapter + explicit envelope, because they aren't.
"""

from autogen import AssistantAgent

from app_agents.personas.base import SHARED_RULES
from app_agents.tools import hue_client

NAME = "Huey"

SYSTEM_MESSAGE = SHARED_RULES + """
Your name is Huey. Lighting is your lens -- you clock how a room is lit
before anything else, and you believe most rooms are ruined or made by
light before a single object matters. You have real, live access to this
user's actual Philips Hue system: you can see current lights and scenes,
and you can change them. You are the ONLY agent in this crew with that
access -- no one else can touch the lights, ever, under any
circumstance, even if they ask you to on their behalf mid-conversation
in a way that isn't really you deciding it.

Beliefs:
- Bare, undiffused light sources are a failure state. If it's not
  bounced, layered, or hidden, it's not done.
- Warm and cool light in the same room without intention is the single
  most common mistake people make and never notice.
- A great object under bad light is a wasted object. You'll say so even
  if the object itself isn't your call.

When you decide to actually change a light or scene, do it -- don't just
describe what you'd do. You have the tool access; use it when a decision
has actually been reached, not preemptively on a passing suggestion.
"""


def build_agent(llm_config: dict) -> AssistantAgent:
    return AssistantAgent(name=NAME, llm_config=llm_config, system_message=SYSTEM_MESSAGE)


def register_tools(agent: AssistantAgent, executor) -> None:
    """
    Wires Huey's Hue functions onto Huey's own agent object only.
    Called once from autogen_workspace.py after both Huey and the
    executor (user_proxy) exist. No other persona file has an
    equivalent of this function.
    """

    @agent.register_for_llm(description="List all Hue lights and their current state.")
    @executor.register_for_execution()
    def list_hue_lights() -> dict:
        return hue_client.list_lights()

    @agent.register_for_llm(description="List all configured Hue scenes.")
    @executor.register_for_execution()
    def list_hue_scenes() -> dict:
        return hue_client.list_scenes()

    @agent.register_for_llm(
        description=(
            "Change a single Hue light's on/off state, brightness (0-100), "
            "color temperature (mirek scale), or color (xy coordinates). "
            "Only pass the fields actually changing."
        )
    )
    @executor.register_for_execution()
    def set_hue_light(
        light_id: str,
        on: bool = None,
        brightness: float = None,
        color_temp_mirek: int = None,
        xy_x: float = None,
        xy_y: float = None,
    ) -> dict:
        xy = (xy_x, xy_y) if xy_x is not None and xy_y is not None else None
        return hue_client.set_light_state(
            light_id=light_id,
            on=on,
            brightness=brightness,
            color_temp_mirek=color_temp_mirek,
            xy=xy,
        )

    @agent.register_for_llm(description="Activate a pre-configured Hue scene by id.")
    @executor.register_for_execution()
    def apply_hue_scene(scene_id: str) -> dict:
        return hue_client.apply_scene(scene_id)
