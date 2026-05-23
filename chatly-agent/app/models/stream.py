"""SSE event types and wire-format helpers for agent streaming.

Wire format — one event per SSE frame:

    data: {"type": "<event_type>", "data": {...}}\\n\\n

Event types:
    token      — LLM is generating text          data: {content: str}
    tool_start — agent is about to call a tool   data: {tool: str, input: dict}
    tool_end   — tool returned a result          data: {tool: str, output: str}
    error      — an error occurred               data: {message: str, code?: str,
                                                      category?: str,
                                                      retryable?: bool}
    done       — stream is complete              data: {agent_type, message_id}
"""
import json
from typing import Any


def _fmt(event_type: str, data: dict[str, Any]) -> str:
    """Wrap an event payload into the SSE wire format."""
    return f"data: {json.dumps({'type': event_type, 'data': data})}\n\n"


def token_event(content: str) -> str:
    """SSE frame for a single streamed token."""
    return _fmt("token", {"content": content})


def tool_start_event(tool: str, input: dict[str, Any]) -> str:
    """SSE frame emitted when the agent begins a tool call."""
    return _fmt("tool_start", {"tool": tool, "input": input})


def tool_end_event(tool: str, output: str) -> str:
    """SSE frame emitted when a tool call completes."""
    return _fmt("tool_end", {"tool": tool, "output": output})


def error_event(
    message: str,
    code: str | None = None,
    category: str | None = None,
    retryable: bool | None = None,
) -> str:
    """SSE frame for an unrecoverable streaming error.

    The `message` field is always present for backward compatibility.
    """
    data: dict[str, Any] = {"message": message}
    if code is not None:
        data["code"] = code
    if category is not None:
        data["category"] = category
    if retryable is not None:
        data["retryable"] = retryable
    return _fmt("error", data)


def done_event(
    agent_type: str,
    message_id: str,
    attachments: list[dict[str, Any]] | None = None,
) -> str:
    """SSE frame that terminates the stream."""
    data: dict[str, Any] = {"agent_type": agent_type, "message_id": message_id}
    if attachments:
        data["attachments"] = attachments
    return _fmt("done", data)
