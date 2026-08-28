"""Environment-backed settings for the persistent assistant runtime."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Iterable

from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")


def _env(name: str) -> str | None:
    value = os.getenv(name)
    if value is None:
        return None
    value = value.strip()
    return value or None


def _choice_env(name: str, allowed: Iterable[str]) -> str | None:
    value = _env(name)
    if value is None:
        return None
    normalized = value.lower()
    allowed_values = set(allowed)
    if normalized not in allowed_values:
        raise ValueError(f"{name} must be one of: {', '.join(sorted(allowed_values))}")
    return normalized


def _int_env(name: str, default: int, *, minimum: int | None = None) -> int:
    value = _env(name)
    if value is None:
        return default
    try:
        parsed = int(value)
    except ValueError as exc:
        raise ValueError(f"{name} must be an integer") from exc
    if minimum is not None and parsed < minimum:
        raise ValueError(f"{name} must be at least {minimum}")
    return parsed


def _optional_int_env(name: str, *, minimum: int | None = None) -> int | None:
    value = _env(name)
    if value is None:
        return None
    try:
        parsed = int(value)
    except ValueError as exc:
        raise ValueError(f"{name} must be an integer") from exc
    if minimum is not None and parsed < minimum:
        raise ValueError(f"{name} must be at least {minimum}")
    return parsed


def _float_env(name: str, default: float, *, minimum: float | None = None) -> float:
    value = _env(name)
    if value is None:
        return default
    try:
        parsed = float(value)
    except ValueError as exc:
        raise ValueError(f"{name} must be a number") from exc
    if minimum is not None and parsed < minimum:
        raise ValueError(f"{name} must be at least {minimum}")
    return parsed


def _bool_env(name: str, default: bool) -> bool:
    value = _env(name)
    if value is None:
        return default
    return _parse_bool(name, value)


def _optional_bool_env(name: str) -> bool | None:
    value = _env(name)
    if value is None:
        return None
    return _parse_bool(name, value)


def _parse_bool(name: str, value: str) -> bool:
    normalized = value.lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    raise ValueError(f"{name} must be a boolean value")


OPENAI_MODEL = _env("OPENAI_MODEL") or "gpt-4o"
OPENAI_TIMEOUT_SECONDS = _float_env("OPENAI_TIMEOUT_SECONDS", 60.0, minimum=1.0)
OPENAI_MAX_RETRIES = _int_env("OPENAI_MAX_RETRIES", 2, minimum=0)

OPENAI_REASONING_EFFORT = _choice_env(
    "OPENAI_REASONING_EFFORT",
    {"none", "minimal", "low", "medium", "high", "xhigh"},
)
OPENAI_REASONING_SUMMARY = _choice_env(
    "OPENAI_REASONING_SUMMARY",
    {"auto", "concise", "detailed"},
)
OPENAI_VERBOSITY = _choice_env("OPENAI_VERBOSITY", {"low", "medium", "high"})
OPENAI_MAX_OUTPUT_TOKENS = _optional_int_env("OPENAI_MAX_OUTPUT_TOKENS", minimum=1)
OPENAI_STORE = _optional_bool_env("OPENAI_STORE")
OPENAI_PARALLEL_TOOL_CALLS = _optional_bool_env("OPENAI_PARALLEL_TOOL_CALLS")
OPENAI_TRUNCATION = _choice_env("OPENAI_TRUNCATION", {"auto", "disabled"})
OPENAI_SERVICE_TIER = _choice_env(
    "OPENAI_SERVICE_TIER",
    {"auto", "default", "flex", "scale", "priority"},
)

OPENAI_PROMPT_CACHE_KEY = _env("OPENAI_PROMPT_CACHE_KEY")
OPENAI_PROMPT_CACHE_RETENTION = _choice_env(
    "OPENAI_PROMPT_CACHE_RETENTION",
    {"in_memory", "in-memory", "24h"},
)
OPENAI_FILE_SEARCH_MAX_RESULTS = _optional_int_env(
    "OPENAI_FILE_SEARCH_MAX_RESULTS",
    minimum=1,
)
OPENAI_METADATA_APP = _env("OPENAI_METADATA_APP") or "assistant"

APP_AGENTS_USE_AGENTS_SDK = _bool_env("APP_AGENTS_USE_AGENTS_SDK", True)
ZEP_MEMORY_LIMIT = _int_env("ZEP_MEMORY_LIMIT", 8, minimum=0)
ZEP_API_KEY = _env("ZEP_API_KEY")
ZEP_API_URL = (_env("ZEP_API_URL") or "https://api.getzep.com").rstrip("/")
ZEP_USER_ID = _env("ZEP_USER_ID") or _env("USER_ID") or "default"
ZEP_THREAD_ID = _env("ZEP_THREAD_ID") or _env("THREAD_ID") or "gpt-assistant-main"
ZEP_ASSISTANT_NAME = _env("ZEP_ASSISTANT_NAME") or "Assistant"
ZEP_TIMEOUT_SECONDS = _float_env("ZEP_TIMEOUT_SECONDS", 10.0, minimum=1.0)
ZEP_FALLBACK_TO_LOCAL = _bool_env("ZEP_FALLBACK_TO_LOCAL", True)
