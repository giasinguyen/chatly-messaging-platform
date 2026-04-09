from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from fastapi.testclient import TestClient

from app.dependencies import get_session_service
from app.main import app
from app.middleware.auth import get_current_user


class InMemorySessionService:
    def __init__(self) -> None:
        self._sessions: dict[str, dict[str, Any]] = {}
        self._messages: dict[str, list[dict[str, Any]]] = {}

    async def create_session(self, user_id: str, title: str) -> dict[str, Any]:
        session_id = str(uuid4())
        now = datetime.now(UTC)
        session = {
            "id": session_id,
            "user_id": user_id,
            "title": title,
            "created_at": now,
            "updated_at": now,
        }
        self._sessions[session_id] = session
        self._messages[session_id] = []
        return session

    async def list_sessions(self, user_id: str) -> list[dict[str, Any]]:
        return [s for s in self._sessions.values() if s["user_id"] == user_id]

    async def get_session(self, user_id: str, session_id: str) -> dict[str, Any]:
        session = self._sessions.get(session_id)
        if session is None or session["user_id"] != user_id:
            from app.exceptions import SessionNotFoundError

            raise SessionNotFoundError("Session not found")
        return session

    async def delete_session(self, user_id: str, session_id: str) -> None:
        await self.get_session(user_id, session_id)
        self._sessions.pop(session_id, None)
        self._messages.pop(session_id, None)

    async def get_history(self, user_id: str, session_id: str) -> list[dict[str, Any]]:
        await self.get_session(user_id, session_id)
        return self._messages.get(session_id, [])


service = InMemorySessionService()


async def _override_current_user() -> dict[str, str]:
    return {"id": "user-a"}


async def _override_session_service() -> InMemorySessionService:
    return service


def _get_client() -> TestClient:
    app.dependency_overrides[get_current_user] = _override_current_user
    app.dependency_overrides[get_session_service] = _override_session_service
    return TestClient(app)


def _clear_overrides() -> None:
    app.dependency_overrides.clear()


def test_list_sessions_returns_only_current_user() -> None:
    service._sessions = {
        "s1": {
            "id": "s1",
            "user_id": "user-a",
            "title": "Mine",
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC),
        },
        "s2": {
            "id": "s2",
            "user_id": "user-b",
            "title": "Other",
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC),
        },
    }
    client = _get_client()

    response = client.get("/sessions")

    _clear_overrides()
    assert response.status_code == 200
    assert response.json()["total"] == 1


def test_user_cannot_access_other_user_session() -> None:
    service._sessions = {
        "s-other": {
            "id": "s-other",
            "user_id": "user-b",
            "title": "Other",
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC),
        }
    }
    client = _get_client()

    response = client.get("/sessions/s-other")

    _clear_overrides()
    assert response.status_code == 404


def test_delete_session_removes_history_store() -> None:
    service._sessions = {
        "s-del": {
            "id": "s-del",
            "user_id": "user-a",
            "title": "Delete me",
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC),
        }
    }
    service._messages = {
        "s-del": [
            {
                "id": "m1",
                "session_id": "s-del",
                "role": "user",
                "content": "hi",
                "tool_calls": None,
                "created_at": datetime.now(UTC),
            }
        ]
    }
    client = _get_client()

    delete_response = client.delete("/sessions/s-del")
    get_response = client.get("/sessions/s-del/messages")

    _clear_overrides()
    assert delete_response.status_code == 204
    assert get_response.status_code == 404
