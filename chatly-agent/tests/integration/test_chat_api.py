from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import Any

from fastapi.testclient import TestClient

from app.dependencies import get_chat_service, get_session_service
from app.main import app
from app.middleware.auth import get_current_user
from app.models.chat import ChatRequest, ChatResponse


class InMemoryStore:
    def __init__(self) -> None:
        self.sessions: dict[str, dict[str, Any]] = {
            "s1": {
                "id": "s1",
                "user_id": "user-a",
                "title": "Chat",
                "created_at": datetime.now(UTC),
                "updated_at": datetime.now(UTC),
            }
        }
        self.messages: dict[str, list[dict[str, Any]]] = {"s1": []}


class InMemorySessionService:
    def __init__(self, store: InMemoryStore) -> None:
        self._store = store

    async def get_session(self, user_id: str, session_id: str) -> dict[str, Any]:
        session = self._store.sessions.get(session_id)
        if session is None or session["user_id"] != user_id:
            from app.exceptions import SessionNotFoundError

            raise SessionNotFoundError("Session not found")
        return session

    async def get_history(self, user_id: str, session_id: str) -> list[dict[str, Any]]:
        await self.get_session(user_id, session_id)
        return self._store.messages.get(session_id, [])


class InMemoryChatService:
    def __init__(self, store: InMemoryStore) -> None:
        self._store = store

    async def chat(
        self,
        user_id: str,
        session_id: str,
        request: ChatRequest,
    ) -> ChatResponse:
        _ = user_id
        self._store.messages.setdefault(session_id, []).append(
            {
                "id": "m-user",
                "session_id": session_id,
                "role": "user",
                "content": request.message,
                "tool_calls": None,
                "created_at": datetime.now(UTC),
            }
        )
        self._store.messages.setdefault(session_id, []).append(
            {
                "id": "m-assistant",
                "session_id": session_id,
                "role": "assistant",
                "content": "Hello from assistant",
                "tool_calls": None,
                "created_at": datetime.now(UTC),
            }
        )
        return ChatResponse(
            content="Hello from assistant",
            session_id=session_id,
            message_id="m-assistant",
        )

    async def stream_chat(
        self,
        user_id: str,
        session_id: str,
        request: ChatRequest,
    ) -> AsyncIterator[str]:
        _ = user_id
        _ = request
        self._store.messages.setdefault(session_id, []).append(
            {
                "id": "m-user",
                "session_id": session_id,
                "role": "user",
                "content": "stream request",
                "tool_calls": None,
                "created_at": datetime.now(UTC),
            }
        )
        self._store.messages.setdefault(session_id, []).append(
            {
                "id": "m-assistant",
                "session_id": session_id,
                "role": "assistant",
                "content": "Hello",
                "tool_calls": None,
                "created_at": datetime.now(UTC),
            }
        )
        yield 'data: {"token": "Hel"}\n\n'
        yield 'data: {"token": "lo"}\n\n'
        yield "data: [DONE]\n\n"


store = InMemoryStore()


async def _override_current_user() -> dict[str, str]:
    return {"id": "user-a"}


async def _override_chat_service() -> InMemoryChatService:
    return InMemoryChatService(store)


async def _override_session_service() -> InMemorySessionService:
    return InMemorySessionService(store)


def _get_client() -> TestClient:
    app.dependency_overrides[get_current_user] = _override_current_user
    app.dependency_overrides[get_chat_service] = _override_chat_service
    app.dependency_overrides[get_session_service] = _override_session_service
    return TestClient(app)


def _clear_overrides() -> None:
    app.dependency_overrides.clear()


def test_chat_endpoint_returns_content() -> None:
    store.messages["s1"] = []
    client = _get_client()

    response = client.post("/sessions/s1/chat", json={"message": "hello"})

    _clear_overrides()
    assert response.status_code == 200
    assert response.json()["content"] == "Hello from assistant"


def test_stream_endpoint_returns_sse_events() -> None:
    store.messages["s1"] = []
    client = _get_client()

    response = client.post("/sessions/s1/chat/stream", json={"message": "hello"})

    _clear_overrides()
    assert response.status_code == 200
    assert 'data: {"token": "Hel"}' in response.text
    assert "data: [DONE]" in response.text


def test_history_contains_two_messages_after_one_chat_turn() -> None:
    store.messages["s1"] = []
    client = _get_client()

    _ = client.post("/sessions/s1/chat", json={"message": "hello"})
    history_response = client.get("/sessions/s1/messages")

    _clear_overrides()
    assert history_response.status_code == 200
    assert len(history_response.json()["messages"]) == 2
