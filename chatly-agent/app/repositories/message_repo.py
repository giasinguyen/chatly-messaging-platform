from typing import Any, cast

from motor.motor_asyncio import AsyncIOMotorCollection

from app.db.mongo import to_str_id
from app.repositories.base import BaseRepository


class MessageRepository(BaseRepository[dict[str, Any]]):
    """Repository for chat messages."""

    def __init__(self, collection: AsyncIOMotorCollection[dict[str, Any]]) -> None:
        super().__init__(collection)

    async def find_by_session(self, session_id: str) -> list[dict[str, Any]]:
        """Return all messages in chronological order."""
        cursor = self._col.find({"session_id": session_id}).sort("created_at", 1)
        rows = [to_str_id(doc) async for doc in cursor]
        return cast(list[dict[str, Any]], rows)

    async def create_message(
        self,
        session_id: str,
        role: str,
        content: str,
        tool_calls: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Create a message row for a session."""
        payload: dict[str, Any] = {
            "session_id": session_id,
            "role": role,
            "content": content,
            "tool_calls": tool_calls,
        }
        return await self.create(payload)

    async def delete_by_session(self, session_id: str) -> int:
        """Delete all messages in a session and return deleted count."""
        result = await self._col.delete_many({"session_id": session_id})
        return int(result.deleted_count)
