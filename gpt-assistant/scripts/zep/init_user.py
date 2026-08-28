import json
import os
import sys
from typing import Optional

import requests


def _headers() -> dict[str, str]:
    headers = {"Content-Type": "application/json"}
    api_key = os.getenv("ZEP_API_KEY")
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    return headers


def _try_get(url: str) -> None:
    try:
        res = requests.get(url, headers=_headers(), timeout=10)
        print(f"GET {url} -> {res.status_code}")
    except Exception as exc:
        print(f"GET {url} -> error: {exc}")


def _try_post(url: str, payload: dict) -> Optional[requests.Response]:
    try:
        res = requests.post(url, headers=_headers(), json=payload, timeout=10)
        return res
    except Exception as exc:
        print(f"POST {url} -> error: {exc}")
        return None


def main() -> int:
    base = os.getenv("ZEP_API_BASE")
    if not base:
        print("ZEP_API_BASE is not set")
        return 1

    user_id = os.getenv("ZEP_USER_ID", "default")

    _try_get(f"{base}/healthz")
    _try_get(f"{base}/health")

    payload = {"user_id": user_id, "metadata": {"source": "gpt-assistant"}}

    res = _try_post(f"{base}/v1/users", payload)
    if res is not None and res.status_code in (200, 201):
        print(f"Created user via /v1/users: {user_id}")
        return 0

    res = _try_post(f"{base}/v1/user/{user_id}", payload)
    if res is not None and res.status_code in (200, 201):
        print(f"Created user via /v1/user/{{user_id}}: {user_id}")
        return 0

    if res is not None:
        try:
            print("Error:", json.dumps(res.json(), indent=2))
        except Exception:
            print("Error:", res.text)
    else:
        print("Error: request failed")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
