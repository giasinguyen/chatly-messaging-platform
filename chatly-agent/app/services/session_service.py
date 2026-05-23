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

    async def create_session(
        self,
        user_id: str,
        title: str,
        context_conversation_id: str | None = None,
    ) -> dict[str, Any]:
        """Create a new session for the user."""
        now = datetime.now(UTC)
        doc: dict[str, Any] = {
            "user_id": user_id,
            "title": title,
            "created_at": now,
            "updated_at": now,
        }
        if context_conversation_id is not None:
            doc["context_conversation_id"] = context_conversation_id
        return await self._session_repo.create(doc)

    async def list_sessions(self, user_id: str) -> list[dict[str, Any]]:
        """List all sessions owned by the user."""
        return await self._session_repo.find_by_user(user_id)

    async def get_session(self, user_id: str, session_id: str) -> dict[str, Any]:
        """Get one owned session or raise not found."""
        session = await self._session_repo.find_by_user_and_id(user_id, session_id)
        if session is None:
            raise SessionNotFoundError("Session not found")
        return session

    async def rename_session(
        self, user_id: str, session_id: str, title: str
    ) -> dict[str, Any]:
        """Rename one session after ownership validation."""
        await self.get_session(user_id, session_id)
        return await self._session_repo.update_title(session_id, title)

    async def delete_session(self, user_id: str, session_id: str) -> None:
        """Delete one session after ownership validation."""
        await self.get_session(user_id, session_id)
        await self._message_repo.delete_by_session(session_id)
        await self._session_repo.delete(session_id)

    async def get_history(self, user_id: str, session_id: str) -> list[dict[str, Any]]:
        """Return messages of an owned session."""
        await self.get_session(user_id, session_id)
        return await self._message_repo.find_by_session(session_id)

    async def find_or_create_for_conversation(
        self,
        user_id: str,
        conversation_id: str,
        title: str = "Group AI Session",
    ) -> dict[str, Any]:
        """Return the most recent session linked to a conversation, or create one."""
        existing = await self._session_repo.find_by_user_and_conversation(
            user_id, conversation_id
        )
        if existing is not None:
            return existing
        return await self.create_session(
            user_id,
            title=title,
            context_conversation_id=conversation_id,
        )
