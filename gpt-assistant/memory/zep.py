import os
from typing import Iterable, List, Dict

import requests

ZEP_API_BASE = os.getenv("ZEP_API_BASE")
ZEP_API_KEY = os.getenv("ZEP_API_KEY")
ZEP_USER_ID = "default"


def _headers() -> Dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if ZEP_API_KEY:
        headers["Authorization"] = f"Bearer {ZEP_API_KEY}"
    return headers


def get_last_messages(user_id: str = ZEP_USER_ID, limit: int = 10) -> List[Dict[str, str]]:
    if not ZEP_API_BASE:
        return []
    try:
        res = requests.get(
            f"{ZEP_API_BASE}/v1/chat/user/{user_id}/messages",
            params={"limit": limit},
            headers=_headers(),
            timeout=10,
        )
        res.raise_for_status()
        messages = res.json().get("messages", [])
        return [{"role": m["role"], "content": m["content"]} for m in messages]
    except Exception as exc:
        print(f"Memory fetch error: {exc}")
        return []


def add_messages(user_id: str, messages: Iterable[Dict[str, str]]) -> bool:
    if not ZEP_API_BASE:
        return False
    payload = {"messages": list(messages)}
    try:
        res = requests.post(
            f"{ZEP_API_BASE}/v1/chat/user/{user_id}/messages",
            json=payload,
            headers=_headers(),
            timeout=10,
        )
        res.raise_for_status()
        return True
    except Exception as exc:
        print(f"Memory write error: {exc}")
        return False
