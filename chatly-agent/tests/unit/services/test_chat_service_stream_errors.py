import json
from collections.abc import AsyncIterator
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.chat import ChatRequest
from app.services.chat_service import ChatService


async def _raise_in_stream(exc: Exception) -> AsyncIterator[dict]:
    """Raise once the streaming loop starts to simulate runtime failures."""
    raise exc
    yield {}  # pragma: no cover


@pytest.mark.asyncio
async def test_stream_chat_maps_rate_limit_error_to_structured_sse_event() -> None:
    session_service = AsyncMock()
    message_repo = AsyncMock()
    message_repo.find_by_session.return_value = []
    message_repo.create_message.side_effect = [{"id": "m-user"}]

    chatbot_agent = AsyncMock()
    chatbot_agent.agent_type = "chatbot"
    chatbot_agent.astream_events = MagicMock(
        return_value=_raise_in_stream(Exception("429 Too many requests from provider"))
    )

    service = ChatService(
        session_service=session_service,
        message_repo=message_repo,
        chatbot_agent=chatbot_agent,
        vector_service=AsyncMock(has_context=AsyncMock(return_value=False)),
    )

    chunks = [
        chunk
        async for chunk in service.stream_chat(
            user_id="user-1",
            session_id="session-1",
            request=ChatRequest(message="hello"),
        )
    ]

    assert len(chunks) == 1
    payload = json.loads(chunks[0].removeprefix("data: ").strip())
    assert payload["type"] == "error"
    assert payload["data"]["category"] == "rate_limit"
    assert payload["data"]["code"] == "MODEL_RATE_LIMIT"
    assert payload["data"]["retryable"] is True


@pytest.mark.asyncio
async def test_stream_chat_maps_timeout_error_to_structured_sse_event() -> None:
    session_service = AsyncMock()
    message_repo = AsyncMock()
    message_repo.find_by_session.return_value = []
    message_repo.create_message.side_effect = [{"id": "m-user"}]

    chatbot_agent = AsyncMock()
    chatbot_agent.agent_type = "chatbot"
    chatbot_agent.astream_events = MagicMock(
        return_value=_raise_in_stream(TimeoutError("request timed out"))
    )

    service = ChatService(
        session_service=session_service,
        message_repo=message_repo,
        chatbot_agent=chatbot_agent,
        vector_service=AsyncMock(has_context=AsyncMock(return_value=False)),
    )

    chunks = [
        chunk
        async for chunk in service.stream_chat(
            user_id="user-1",
            session_id="session-1",
            request=ChatRequest(message="hello"),
        )
    ]

    assert len(chunks) == 1
    payload = json.loads(chunks[0].removeprefix("data: ").strip())
    assert payload["type"] == "error"
    assert payload["data"]["category"] == "timeout"
    assert payload["data"]["code"] == "MODEL_TIMEOUT"
    assert payload["data"]["retryable"] is True
