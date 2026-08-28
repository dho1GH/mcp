import os
from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager

from app_agents.personas import PERSONAS
from app_agents.tools import hue_client

MODEL = os.getenv("MODEL", "gpt-4o-mini")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Room conversations need more headroom than a single Q&A exchange.
# 6 personas + manager means a real back-and-forth needs more than 8
# total turns to let actual friction develop before the round cap hits.
MAX_ROUNDS = int(os.getenv("MAX_ROUNDS", "24"))

config_list = [{"model": MODEL, "api_key": OPENAI_API_KEY}]
llm_config = {"config_list": config_list, "temperature": 0.7}

# --- Build the crew -----------------------------------------------------
# Every persona is a real, full AssistantAgent with its own system_message
# from app_agents/personas.py. None of them are limited to their lens --
# the lens is a bias in the prompt, not a restriction in the code.

crew = {
    name: AssistantAgent(name=name, llm_config=llm_config, system_message=system_message)
    for name, system_message in PERSONAS.items()
}

huey = crew["Huey"]

user_proxy = UserProxyAgent(
    name="UserProxy",
    human_input_mode="NEVER",
    code_execution_config=False,
)

# --- Least-privilege tool wiring -----------------------------------------
# These functions are registered for LLM use ONLY on Huey's agent object.
# No other persona's llm_config schema includes them, so no other agent
# can ever emit a call to change a light -- the door doesn't exist for
# them, rather than existing and being disallowed.
#
# Execution is registered on user_proxy (the standard AutoGen pattern --
# something has to actually run the function once called), but since only
# Huey can ever produce the function call in the first place, only Huey's
# decisions ever reach the bridge.

@huey.register_for_llm(description="List all Hue lights and their current state.")
@user_proxy.register_for_execution()
def list_hue_lights() -> dict:
    return hue_client.list_lights()


@huey.register_for_llm(description="List all configured Hue scenes.")
@user_proxy.register_for_execution()
def list_hue_scenes() -> dict:
    return hue_client.list_scenes()


@huey.register_for_llm(
    description=(
        "Change a single Hue light's on/off state, brightness (0-100), "
        "color temperature (mirek scale), or color (xy coordinates). "
        "Only pass the fields actually changing."
    )
)
@user_proxy.register_for_execution()
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


@huey.register_for_llm(description="Activate a pre-configured Hue scene by id.")
@user_proxy.register_for_execution()
def apply_hue_scene(scene_id: str) -> dict:
    return hue_client.apply_scene(scene_id)


def run_groupchat(user_input: str, memory_context: str) -> str:
    groupchat = GroupChat(
        agents=list(crew.values()) + [user_proxy],
        max_round=MAX_ROUNDS,
    )
    manager = GroupChatManager(groupchat=groupchat, llm_config=llm_config)

    augmented = f"Memory Context:\n{memory_context}\n\nUser Request:\n{user_input}"
    user_proxy.initiate_chat(manager, message=augmented)
    return groupchat.messages[-1].get("content", "")
