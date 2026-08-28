import os
from autogen import UserProxyAgent, GroupChat, GroupChatManager

from app_agents.personas import BUILDERS
from app_agents.personas import huey as huey_identity

MODEL = os.getenv("MODEL", "gpt-4o-mini")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Room conversations need more headroom than a single Q&A exchange.
# 6 personas + manager means a real back-and-forth needs more than 8
# total turns to let actual friction develop before the round cap hits.
MAX_ROUNDS = int(os.getenv("MAX_ROUNDS", "24"))

config_list = [{"model": MODEL, "api_key": OPENAI_API_KEY}]
llm_config = {"config_list": config_list, "temperature": 0.7}

# --- Build the crew -----------------------------------------------------
# Each agent is constructed from its OWN file in app_agents/personas/.
# This module doesn't define anyone's identity -- it just assembles
# agents that already exist as standalone modules.

crew = {name: build(llm_config) for name, build in BUILDERS.items()}

# human_input_mode="ALWAYS": the user is a participant in the room, not
# someone who kicks off an autonomous run and reads a final report back.
# AutoGen will solicit real input from them at each of their turns in
# the GroupChat, same as any other member -- live, in the loop, not
# checkpoint/resume.
user_proxy = UserProxyAgent(
    name="UserProxy",
    human_input_mode="ALWAYS",
    code_execution_config=False,
)

# --- Least-privilege tool wiring -----------------------------------------
# Huey's own file owns everything about Huey's Hue access -- this line
# is the only place autogen_workspace.py even touches it. No other
# persona file imports hue_client, has this function, or could.
huey_identity.register_tools(crew["Huey"], user_proxy)


def run_groupchat(user_input: str, memory_context: str) -> str:
    groupchat = GroupChat(
        agents=list(crew.values()) + [user_proxy],
        max_round=MAX_ROUNDS,
    )
    manager = GroupChatManager(groupchat=groupchat, llm_config=llm_config)

    augmented = f"Memory Context:\n{memory_context}\n\nUser Request:\n{user_input}"
    user_proxy.initiate_chat(manager, message=augmented)
    return groupchat.messages[-1].get("content", "")
