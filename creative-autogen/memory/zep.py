import os
from dotenv import load_dotenv
from zep_cloud.client import Zep
from zep_cloud.types import Message

load_dotenv(dotenv_path=".env")

ZEP_API_KEY = os.getenv("ZEP_API_KEY")
if not ZEP_API_KEY:
    raise RuntimeError("ZEP_API_KEY is missing. Put it in .env or export it in your shell.")

zep = Zep(api_key=ZEP_API_KEY)

def add_message(user_id: str, role: str, content: str):
    zep.memory.add(
        session_id=user_id,
        messages=[Message(role=role, content=content)]
    )

def get_context(user_id: str):
    mem = zep.memory.get(session_id=user_id)
    return mem.context if mem and getattr(mem, "context", None) else ""

def get_last_messages(user_id: str, limit: int = 10):
    mem = zep.memory.get(session_id=user_id)
    msgs = getattr(mem, "messages", None) or []
    return msgs[-limit:]
