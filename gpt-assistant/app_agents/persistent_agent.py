"""Persistent assistant runtime.

This module wires together:
- OpenAI conversation continuity
- recent message memory
- vector-store-backed file search

It is intentionally thin. The serious upper-ceiling system should split these
lanes further, but this version is now runnable as a local seed.
"""

from __future__ import annotations

import logging
import os
import time
from typing import Any, Dict, List, Optional

from openai import (
    APIConnectionError,
    APIError,
    APITimeoutError,
    AsyncOpenAI,
    AuthenticationError,
    BadRequestError,
    OpenAI,
    OpenAIError,
    RateLimitError,
)
from openai.types.shared import Reasoning

from config import settings
from config.db import (
    get_conversation_id,
    get_vector_store_id,
    set_conversation_id,
    set_vector_store_id,
)
from memory.zep import add_messages, default_thread_id, get_last_messages, get_user_context

try:
    from agents import Agent, FileSearchTool, ModelSettings, Runner, function_tool

    try:
        from agents import OpenAIResponsesModel
    except Exception:  # pragma: no cover - fallback for alternate SDK layout
        from agents.models import OpenAIResponsesModel
except Exception as exc:  # pragma: no cover - surfaced only if Agents path is used
    Agent = None
    Runner = None
    function_tool = None
    FileSearchTool = None
    OpenAIResponsesModel = None
    ModelSettings = None
    _AGENTS_IMPORT_ERROR: Optional[BaseException] = exc
else:
    _AGENTS_IMPORT_ERROR = None

logger = logging.getLogger(__name__)

MODEL = settings.OPENAI_MODEL
MEMORY_LIMIT = settings.ZEP_MEMORY_LIMIT
USE_AGENTS_SDK = settings.APP_AGENTS_USE_AGENTS_SDK

BASE_INSTRUCTIONS = """You are a persistent personal assistant.
Be concise. Maintain continuity across sessions.
Use recent memory when it is relevant, but do not treat chat history as verified truth.
Use file search for long-term knowledge when needed.
"""


def _format_memory(messages: List[Dict[str, str]], zep_context: str | None = None) -> str:
    blocks: List[str] = []
    if zep_context:
        blocks.append(f"Zep user graph context:\n{zep_context}")
    if not messages:
        if blocks:
            return "\n\n".join(blocks)
        return "No stored memory yet."
    lines = []
    for message in messages:
        role = message.get("role", "unknown")
        content = message.get("content", "")
        lines.append(f"{role}: {content}")
    blocks.append("Recent thread messages:\n" + "\n".join(lines))
    return "\n\n".join(blocks)


def _is_reasoning_model(model: str) -> bool:
    normalized = model.lower()
    return normalized.startswith("gpt-5") or normalized.startswith("o")


def _is_gpt_5_model(model: str) -> bool:
    return model.lower().startswith("gpt-5")


def _default_reasoning_effort() -> str | None:
    if not _is_reasoning_model(MODEL):
        return None
    if MODEL.lower() in {"gpt-5.1", "gpt-5.2"}:
        return "none"
    return "low"


def _effective_reasoning() -> Reasoning | None:
    effort = settings.OPENAI_REASONING_EFFORT or _default_reasoning_effort()
    summary = settings.OPENAI_REASONING_SUMMARY
    if not effort and not summary:
        return None
    if not _is_reasoning_model(MODEL):
        raise ValueError("OPENAI_REASONING_EFFORT requires a reasoning-capable model")
    return Reasoning(effort=effort, summary=summary)


def _effective_verbosity() -> str | None:
    verbosity = settings.OPENAI_VERBOSITY
    if not verbosity and _is_gpt_5_model(MODEL):
        return "low"
    if verbosity and not _is_gpt_5_model(MODEL):
        raise ValueError("OPENAI_VERBOSITY requires a GPT-5 model")
    return verbosity


def _metadata() -> dict[str, str]:
    return {
        "app": settings.OPENAI_METADATA_APP,
        "runtime": "persistent_agent",
    }


def _agent_prompt_cache_retention() -> str | None:
    retention = settings.OPENAI_PROMPT_CACHE_RETENTION
    if retention == "in-memory":
        return "in_memory"
    return retention


def _responses_prompt_cache_retention() -> str | None:
    retention = settings.OPENAI_PROMPT_CACHE_RETENTION
    if retention == "in_memory":
        return "in-memory"
    return retention


def _model_extra_args() -> dict[str, Any] | None:
    extra_args: dict[str, Any] = {}
    if settings.OPENAI_PROMPT_CACHE_KEY:
        extra_args["prompt_cache_key"] = settings.OPENAI_PROMPT_CACHE_KEY
    if settings.OPENAI_SERVICE_TIER:
        extra_args["service_tier"] = settings.OPENAI_SERVICE_TIER
    return extra_args or None


def _build_agent_model_settings() -> Any:
    if ModelSettings is None:
        return None
    return ModelSettings(
        max_tokens=settings.OPENAI_MAX_OUTPUT_TOKENS,
        reasoning=_effective_reasoning(),
        verbosity=_effective_verbosity(),
        metadata=_metadata(),
        store=settings.OPENAI_STORE,
        prompt_cache_retention=_agent_prompt_cache_retention(),
        parallel_tool_calls=settings.OPENAI_PARALLEL_TOOL_CALLS,
        truncation=settings.OPENAI_TRUNCATION,
        extra_args=_model_extra_args(),
    )


def _friendly_openai_error(operation: str, exc: OpenAIError) -> RuntimeError:
    if isinstance(exc, APITimeoutError):
        detail = f"timed out after {settings.OPENAI_TIMEOUT_SECONDS:g}s"
    elif isinstance(exc, APIConnectionError):
        detail = "could not reach the OpenAI API"
    elif isinstance(exc, RateLimitError):
        detail = "was rate limited by the OpenAI API"
    elif isinstance(exc, AuthenticationError):
        detail = "failed OpenAI authentication; check OPENAI_API_KEY"
    elif isinstance(exc, BadRequestError):
        detail = f"was rejected by the OpenAI API: {getattr(exc, 'message', str(exc))}"
    elif isinstance(exc, APIError):
        detail = f"failed with an OpenAI API error: {getattr(exc, 'message', str(exc))}"
    else:
        detail = str(exc) or exc.__class__.__name__
    return RuntimeError(f"OpenAI {operation} {detail}.")


class PersistentStateAgent:
    def __init__(self) -> None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY must be set in the environment or .env")

        self._client = OpenAI(
            api_key=api_key,
            timeout=settings.OPENAI_TIMEOUT_SECONDS,
            max_retries=settings.OPENAI_MAX_RETRIES,
        )
        self._async_client = AsyncOpenAI(
            api_key=api_key,
            timeout=settings.OPENAI_TIMEOUT_SECONDS,
            max_retries=settings.OPENAI_MAX_RETRIES,
        )
        self._vector_store_id = self._get_or_create_vector_store()

        self._model = None
        self._model_settings = None
        if USE_AGENTS_SDK:
            if _AGENTS_IMPORT_ERROR:
                raise ImportError(
                    "OpenAI Agents SDK is required when APP_AGENTS_USE_AGENTS_SDK=1 "
                    "(pip install openai-agents). Set APP_AGENTS_USE_AGENTS_SDK=0 "
                    "to use the plain Responses API fallback."
                ) from _AGENTS_IMPORT_ERROR
            self._model = OpenAIResponsesModel(MODEL, self._async_client)
            self._model_settings = _build_agent_model_settings()

    def _get_or_create_vector_store(self, name: str = "default") -> str:
        existing_id = get_vector_store_id(name)
        if existing_id:
            return existing_id
        try:
            store = self._client.vector_stores.create(name="assistant-memory")
        except OpenAIError as exc:
            raise _friendly_openai_error("vector store creation", exc) from exc
        set_vector_store_id(name, store.id)
        return store.id

    def _get_or_create_conversation(self, user_id: str) -> str:
        conv_id = get_conversation_id(user_id)
        if conv_id:
            return conv_id
        try:
            conv = self._client.conversations.create(metadata={"user_id": user_id})
        except OpenAIError as exc:
            raise _friendly_openai_error("conversation creation", exc) from exc
        set_conversation_id(user_id, conv.id)
        return conv.id

    def new_conversation(self, user_id: str) -> str:
        try:
            conv = self._client.conversations.create(metadata={"user_id": user_id})
        except OpenAIError as exc:
            raise _friendly_openai_error("conversation creation", exc) from exc
        set_conversation_id(user_id, conv.id)
        return conv.id

    def handle(self, payload: dict) -> dict:
        user_id = payload.get("user_id") or settings.ZEP_USER_ID or "default"
        thread_id = payload.get("thread_id") or default_thread_id(user_id)
        text = payload.get("input") or ""
        if not text.strip():
            return {
                "conversation_id": self._get_or_create_conversation(user_id),
                "thread_id": thread_id,
                "text": "",
            }

        conv_id = self._get_or_create_conversation(user_id)
        user_memory = add_messages(
            user_id,
            [{"role": "user", "name": user_id, "content": text}],
            thread_id=thread_id,
            return_context=True,
        )
        zep_context = user_memory.get("context")
        if not zep_context:
            context_status = get_user_context(thread_id=thread_id, user_id=user_id)
            zep_context = context_status.get("context")
        else:
            context_status = {
                "backend": user_memory.get("backend"),
                "ok": True,
                "degraded": False,
                "thread_id": thread_id,
            }

        started = time.perf_counter()
        try:
            if USE_AGENTS_SDK:
                output = self._handle_with_agents_sdk(
                    user_id=user_id,
                    text=text,
                    conv_id=conv_id,
                    thread_id=thread_id,
                    zep_context=zep_context,
                )
            else:
                output = self._handle_with_responses_api(
                    user_id=user_id,
                    text=text,
                    conv_id=conv_id,
                    thread_id=thread_id,
                    zep_context=zep_context,
                )
        except OpenAIError as exc:
            raise _friendly_openai_error("assistant response", exc) from exc
        finally:
            elapsed_ms = int((time.perf_counter() - started) * 1000)
            logger.info(
                "assistant_run model=%s user_id=%s conversation_id=%s latency_ms=%s",
                MODEL,
                user_id,
                conv_id,
                elapsed_ms,
            )

        assistant_memory = add_messages(
            user_id,
            [{"role": "assistant", "name": settings.ZEP_ASSISTANT_NAME, "content": output}],
            thread_id=thread_id,
        )

        return {
            "conversation_id": conv_id,
            "thread_id": thread_id,
            "text": output,
            "memory": {
                "backend": user_memory.get("backend"),
                "context_used": bool(zep_context),
                "user_message_added": bool(user_memory.get("messages_added")),
                "assistant_message_added": bool(assistant_memory.get("messages_added")),
                "zep_graph_ingestion_allowed": bool(
                    user_memory.get("graph_ingestion_allowed")
                    or assistant_memory.get("graph_ingestion_allowed")
                ),
                "degraded": bool(
                    user_memory.get("degraded")
                    or context_status.get("degraded")
                    or assistant_memory.get("degraded")
                ),
                "errors": [
                    error
                    for error in [
                        user_memory.get("error"),
                        context_status.get("error"),
                        assistant_memory.get("error"),
                    ]
                    if error
                ],
            },
        }

    def _handle_with_agents_sdk(
        self,
        user_id: str,
        text: str,
        conv_id: str,
        thread_id: str,
        zep_context: str | None,
    ) -> str:
        @function_tool
        def get_recent_memory() -> str:
            """Fetch recent conversation snippets."""
            messages = get_last_messages(user_id=user_id, limit=MEMORY_LIMIT, thread_id=thread_id)
            return _format_memory(messages, zep_context=zep_context)

        tools = [get_recent_memory]
        if FileSearchTool and self._vector_store_id:
            tools.append(
                FileSearchTool(
                    vector_store_ids=[self._vector_store_id],
                    max_num_results=settings.OPENAI_FILE_SEARCH_MAX_RESULTS,
                )
            )

        agent = Agent(
            name="PersistentAssistant",
            instructions=BASE_INSTRUCTIONS,
            model=self._model,
            model_settings=self._model_settings,
            tools=tools,
        )

        result = Runner.run_sync(
            agent,
            text,
            context={"conversation_id": conv_id},
            conversation_id=conv_id,
        )

        output = getattr(result, "final_output", None) or getattr(result, "output_text", "")
        return output if isinstance(output, str) else str(output)

    def _handle_with_responses_api(
        self,
        user_id: str,
        text: str,
        conv_id: str,
        thread_id: str,
        zep_context: str | None,
    ) -> str:
        memory = _format_memory(
            get_last_messages(user_id=user_id, limit=MEMORY_LIMIT, thread_id=thread_id),
            zep_context=zep_context,
        )
        instructions = f"{BASE_INSTRUCTIONS}\n\nRecent memory:\n{memory}"
        tools = []
        if self._vector_store_id:
            file_search_tool: dict[str, Any] = {
                "type": "file_search",
                "vector_store_ids": [self._vector_store_id],
            }
            if settings.OPENAI_FILE_SEARCH_MAX_RESULTS:
                file_search_tool["max_num_results"] = settings.OPENAI_FILE_SEARCH_MAX_RESULTS
            tools.append(file_search_tool)

        kwargs: dict[str, Any] = {
            "model": MODEL,
            "conversation": conv_id,
            "instructions": instructions,
            "input": text,
            "tools": tools or None,
            "metadata": _metadata(),
        }
        if settings.OPENAI_MAX_OUTPUT_TOKENS:
            kwargs["max_output_tokens"] = settings.OPENAI_MAX_OUTPUT_TOKENS
        if settings.OPENAI_STORE is not None:
            kwargs["store"] = settings.OPENAI_STORE
        if settings.OPENAI_PARALLEL_TOOL_CALLS is not None:
            kwargs["parallel_tool_calls"] = settings.OPENAI_PARALLEL_TOOL_CALLS
        if settings.OPENAI_TRUNCATION:
            kwargs["truncation"] = settings.OPENAI_TRUNCATION
        if settings.OPENAI_PROMPT_CACHE_KEY:
            kwargs["prompt_cache_key"] = settings.OPENAI_PROMPT_CACHE_KEY
        if settings.OPENAI_PROMPT_CACHE_RETENTION:
            kwargs["prompt_cache_retention"] = _responses_prompt_cache_retention()
        if settings.OPENAI_SERVICE_TIER:
            kwargs["service_tier"] = settings.OPENAI_SERVICE_TIER
        reasoning = _effective_reasoning()
        if reasoning:
            kwargs["reasoning"] = reasoning
        verbosity = _effective_verbosity()
        if verbosity:
            kwargs["text"] = {"verbosity": verbosity}

        resp = self._client.responses.create(**kwargs)
        return getattr(resp, "output_text", "") or ""

    def get_vector_store_id(self) -> str:
        return self._vector_store_id

    def ingest_file(self, file_obj, filename: str) -> dict:
        try:
            uploaded = self._client.files.create(file=(filename, file_obj), purpose="user_data")
            attached = self._client.vector_stores.files.create(
                self._vector_store_id,
                file_id=uploaded.id,
            )
        except OpenAIError as exc:
            raise _friendly_openai_error("file ingestion", exc) from exc
        return {"file_id": uploaded.id, "vector_store_file_id": attached.id}
