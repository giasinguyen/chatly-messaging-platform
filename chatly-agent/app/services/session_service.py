from datetime import UTC, datetime
from typing import Any

from app.exceptions import SessionNotFoundError
from app.repositories.message_repo import MessageRepository
from app.repositories.session_repo import SessionRepository


class SessionService:
    """Business logic for session and history operations."""

    def __init__(
        self,
        session_repo: SessionRepository,
        message_repo: MessageRepository,
    ) -> None:
        self._session_repo = session_repo
        self._message_repo = message_repo

    async def create_session(self, user_id: str, title: str) -> dict[str, Any]:
        """Create a new session for the user."""
        now = datetime.now(UTC)
        return await self._session_repo.create(
            {
                "user_id": user_id,
                "title": title,
                "created_at": now,
                "updated_at": now,
            }
        )

    async def list_sessions(self, user_id: str) -> list[dict[str, Any]]:
        """List all sessions owned by the user."""
        return await self._session_repo.find_by_user(user_id)

    async def get_session(self, user_id: str, session_id: str) -> dict[str, Any]:
        """Get one owned session or raise not found."""
        session = await self._session_repo.find_by_user_and_id(user_id, session_id)
        if session is None:
            raise SessionNotFoundError("Session not found")
        return session

    async def delete_session(self, user_id: str, session_id: str) -> None:
        """Delete one session after ownership validation."""
        await self.get_session(user_id, session_id)
        await self._message_repo.delete_by_session(session_id)
        await self._session_repo.delete(session_id)

    async def get_history(self, user_id: str, session_id: str) -> list[dict[str, Any]]:
        """Return messages of an owned session."""
        await self.get_session(user_id, session_id)
        return await self._message_repo.find_by_session(session_id)
