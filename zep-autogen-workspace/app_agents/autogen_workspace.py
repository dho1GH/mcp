
import os
from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager

MODEL = os.getenv("MODEL", "gpt-4o-mini")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
MAX_ROUNDS = int(os.getenv("MAX_ROUNDS", "8"))

config_list = [{"model": MODEL, "api_key": OPENAI_API_KEY}]

llm_config = {"config_list": config_list, "temperature": 0.4}

planner = AssistantAgent(
    name="Planner",
    llm_config=llm_config,
    system_message="You break down the user's intent into structured reasoning steps."
)

executor = AssistantAgent(
    name="Executor",
    llm_config=llm_config,
    system_message="You execute plans and generate final structured output."
)

critic = AssistantAgent(
    name="Critic",
    llm_config=llm_config,
    system_message="You intervene only if reasoning is flawed."
)

memory_agent = AssistantAgent(
    name="MemoryAgent",
    llm_config=llm_config,
    system_message="You decide what memory is relevant and should be stored."
)

tool_agent = AssistantAgent(
    name="ToolAgent",
    llm_config=llm_config,
    system_message="You suggest tool usage only if appropriate."
)

user_proxy = UserProxyAgent(name="UserProxy", human_input_mode="NEVER")

def run_groupchat(user_input: str, memory_context: str) -> str:
    groupchat = GroupChat(
        agents=[planner, executor, critic, memory_agent, tool_agent, user_proxy],
        max_round=MAX_ROUNDS,
    )
    manager = GroupChatManager(groupchat=groupchat, llm_config=llm_config)

    augmented = f"Memory Context:\n{memory_context}\n\nUser Request:\n{user_input}"
    user_proxy.initiate_chat(manager, message=augmented)
    return groupchat.messages[-1].get("content", "")
