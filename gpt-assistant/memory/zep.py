"""Conversation memory adapter.

Primary path: Zep Cloud thread memory and user graph context.
Fallback path: local JSONL recent-memory storage when Zep is not configured or
temporarily unavailable.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from threading import RLock
from typing import Any, Dict, Iterable, List, Optional

import requests

from config import settings

_MEMORY_PATH = Path(settings._env("APP_AGENTS_MEMORY_PATH") or ".app_agents_memory.jsonl")
_LOCK = RLock()
_SESSION = requests.Session()
_KNOWN_THREADS: set[tuple[str, str]] = set()


def default_thread_id(user_id: Optional[str] = None) -> str:
    configured = settings.ZEP_THREAD_ID
    if configured != "gpt-assistant-main":
        return configured
    normalized = (user_id or settings.ZEP_USER_ID or "default").strip() or "default"
    return configured if normalized == settings.ZEP_USER_ID else f"gpt-assistant-{normalized}"


def zep_configured() -> bool:
    return bool(settings.ZEP_API_KEY)


def memory_status() -> Dict[str, Any]:
    return {
        "backend": "zep" if zep_configured() else "local_jsonl",
        "zepConfigured": zep_configured(),
        "defaultUserId": settings.ZEP_USER_ID,
        "defaultThreadId": settings.ZEP_THREAD_ID,
        "localFallbackEnabled": settings.ZEP_FALLBACK_TO_LOCAL,
    }


def add_messages(
    user_id: str,
    messages: Iterable[Dict[str, str]],
    *,
    thread_id: Optional[str] = None,
    return_context: bool = False,
) -> Dict[str, Any]:
    clean_messages = _clean_messages(user_id=user_id, messages=messages)
    if not clean_messages:
        return _result(backend="none", ok=True, messages_added=0)

    resolved_user_id = user_id or settings.ZEP_USER_ID
    resolved_thread_id = thread_id or default_thread_id(resolved_user_id)

    if zep_configured():
        try:
            _ensure_thread(user_id=resolved_user_id, thread_id=resolved_thread_id)
            response = _zep_request(
                "POST",
                f"/api/v2/threads/{resolved_thread_id}/messages",
                json_body={
                    "messages": clean_messages,
                    "return_context": return_context,
                },
            )
            return _result(
                backend="zep",
                ok=True,
                thread_id=resolved_thread_id,
                messages_added=len(clean_messages),
                context=response.get("context"),
                message_uuids=response.get("message_uuids") or [],
                graph_ingestion_allowed=True,
            )
        except Exception as exc:
            if not settings.ZEP_FALLBACK_TO_LOCAL:
                raise
            _add_local_messages(user_id=resolved_user_id, messages=clean_messages)
            return _result(
                backend="local_jsonl",
                ok=False,
                degraded=True,
                thread_id=resolved_thread_id,
                messages_added=len(clean_messages),
                error=str(exc),
            )

    _add_local_messages(user_id=resolved_user_id, messages=clean_messages)
    return _result(
        backend="local_jsonl",
        ok=True,
        degraded=True,
        thread_id=resolved_thread_id,
        messages_added=len(clean_messages),
        error="ZEP_API_KEY is not configured",
    )


def get_user_context(thread_id: Optional[str] = None, user_id: Optional[str] = None) -> Dict[str, Any]:
    if not zep_configured():
        return _result(
            backend="local_jsonl",
            ok=False,
            degraded=True,
            thread_id=thread_id or default_thread_id(user_id),
            context=None,
            error="ZEP_API_KEY is not configured",
        )
    resolved_user_id = user_id or settings.ZEP_USER_ID
    resolved_thread_id = thread_id or default_thread_id(resolved_user_id)
    try:
        _ensure_thread(user_id=resolved_user_id, thread_id=resolved_thread_id)
        response = _zep_request("GET", f"/api/v2/threads/{resolved_thread_id}/context")
        return _result(
            backend="zep",
            ok=True,
            thread_id=resolved_thread_id,
            context=response.get("context"),
        )
    except Exception as exc:
        return _result(
            backend="zep",
            ok=False,
            degraded=True,
            thread_id=resolved_thread_id,
            context=None,
            error=str(exc),
        )


def ensure_thread(user_id: Optional[str] = None, thread_id: Optional[str] = None) -> Dict[str, Any]:
    resolved_user_id = user_id or settings.ZEP_USER_ID
    resolved_thread_id = thread_id or default_thread_id(resolved_user_id)
    if not zep_configured():
        return _result(
            backend="local_jsonl",
            ok=False,
            degraded=True,
            user_id=resolved_user_id,
            thread_id=resolved_thread_id,
            error="ZEP_API_KEY is not configured",
        )
    try:
        _ensure_thread(user_id=resolved_user_id, thread_id=resolved_thread_id)
        return _result(
            backend="zep",
            ok=True,
            user_id=resolved_user_id,
            thread_id=resolved_thread_id,
        )
    except Exception as exc:
        return _result(
            backend="zep",
            ok=False,
            degraded=True,
            user_id=resolved_user_id,
            thread_id=resolved_thread_id,
            error=str(exc),
        )


def get_last_messages(user_id: str, limit: int = 8, *, thread_id: Optional[str] = None) -> List[Dict[str, str]]:
    if limit <= 0:
        return []

    resolved_user_id = user_id or settings.ZEP_USER_ID
    resolved_thread_id = thread_id or default_thread_id(resolved_user_id)
    if zep_configured():
        try:
            _ensure_thread(user_id=resolved_user_id, thread_id=resolved_thread_id)
            response = _zep_request(
                "GET",
                f"/api/v2/threads/{resolved_thread_id}/messages",
                params={"lastn": limit},
            )
            rows = response.get("messages") or []
            return [
                {
                    "role": str(row.get("role") or ""),
                    "content": str(row.get("content") or ""),
                }
                for row in rows
                if row.get("role") and row.get("content")
            ][-limit:]
        except Exception:
            if not settings.ZEP_FALLBACK_TO_LOCAL:
                raise

    return _get_local_messages(user_id=resolved_user_id, limit=limit)


def _clean_messages(user_id: str, messages: Iterable[Dict[str, str]]) -> List[Dict[str, Any]]:
    cleaned: List[Dict[str, Any]] = []
    now = datetime.now(timezone.utc).isoformat()
    for message in messages:
        role = str(message.get("role", "")).strip()
        content = str(message.get("content", "")).strip()
        if not role or not content:
            continue
        name = str(message.get("name") or _default_name(user_id=user_id, role=role)).strip()
        cleaned.append({
            "role": role,
            "name": name,
            "content": content[:4096],
            "created_at": str(message.get("created_at") or now),
            "metadata": dict(message.get("metadata") or {}),
        })
    return cleaned


def _default_name(user_id: str, role: str) -> str:
    if role == "assistant":
        return settings.ZEP_ASSISTANT_NAME
    if role == "user":
        return user_id or settings.ZEP_USER_ID
    return role


def _ensure_user(user_id: str) -> None:
    try:
        _zep_request(
            "POST",
            "/api/v2/users",
            json_body={"user_id": user_id, "first_name": user_id},
            allow_conflict=True,
        )
    except RuntimeError as exc:
        message = str(exc).lower()
        if "already exists" not in message and "409" not in message:
            raise


def _ensure_thread(user_id: str, thread_id: str) -> None:
    cache_key = (user_id, thread_id)
    if cache_key in _KNOWN_THREADS:
        return
    _ensure_user(user_id)
    try:
        _zep_request(
            "POST",
            "/api/v2/threads",
            json_body={"thread_id": thread_id, "user_id": user_id},
            allow_conflict=True,
        )
    except RuntimeError as exc:
        if "409" not in str(exc) and "already" not in str(exc).lower():
            raise
    _KNOWN_THREADS.add(cache_key)


def _zep_request(
    method: str,
    path: str,
    *,
    json_body: Optional[Dict[str, Any]] = None,
    params: Optional[Dict[str, Any]] = None,
    allow_conflict: bool = False,
) -> Dict[str, Any]:
    if not settings.ZEP_API_KEY:
        raise RuntimeError("ZEP_API_KEY is not configured")
    url = f"{settings.ZEP_API_URL}{path}"
    response = _SESSION.request(
        method,
        url,
        headers={
            "Authorization": f"Api-Key {settings.ZEP_API_KEY}",
            "Content-Type": "application/json",
        },
        json=json_body,
        params=params,
        timeout=settings.ZEP_TIMEOUT_SECONDS,
    )
    if allow_conflict and response.status_code == 409:
        return {}
    if not (200 <= response.status_code < 300):
        detail = response.text[:500]
        raise RuntimeError(f"Zep {method} {path} failed with HTTP {response.status_code}: {detail}")
    if not response.content:
        return {}
    return response.json()


def _add_local_messages(user_id: str, messages: Iterable[Dict[str, Any]]) -> None:
    _MEMORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc).isoformat()
    with _LOCK, _MEMORY_PATH.open("a", encoding="utf-8") as fh:
        for message in messages:
            role = str(message.get("role", ""))
            content = str(message.get("content", ""))
            if not role or not content:
                continue
            record = {
                "user_id": user_id,
                "role": role,
                "content": content,
                "created_at": now,
            }
            fh.write(json.dumps(record, ensure_ascii=False) + "\n")


def _get_local_messages(user_id: str, limit: int = 8) -> List[Dict[str, str]]:
    if limit <= 0 or not _MEMORY_PATH.exists():
        return []
    rows: List[Dict[str, str]] = []
    with _LOCK, _MEMORY_PATH.open("r", encoding="utf-8") as fh:
        for line in fh:
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue
            if record.get("user_id") != user_id:
                continue
            rows.append({
                "role": str(record.get("role", "")),
                "content": str(record.get("content", "")),
            })
    return rows[-limit:]


def _result(**values: Any) -> Dict[str, Any]:
    base = {
        "backend": values.pop("backend", "unknown"),
        "ok": values.pop("ok", False),
        "degraded": values.pop("degraded", False),
    }
    base.update(values)
    return base
