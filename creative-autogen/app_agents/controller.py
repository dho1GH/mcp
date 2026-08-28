
from memory.zep import add_message, get_context
from app_agents.autogen_workspace import run_groupchat

def handle_chat(payload: dict) -> dict:
    user_id = payload.get("user_id", "default")
    user_input = payload.get("input", "")

    add_message(user_id, "user", user_input)
    context = get_context(user_id)
    response = run_groupchat(user_input, context)
    add_message(user_id, "assistant", response)

    return {"user_id": user_id, "response": response}
