from typing import Any, cast

from motor.motor_asyncio import AsyncIOMotorCollection

from app.db.mongo import to_object_id, to_str_id
from app.repositories.base import BaseRepository


class SessionRepository(BaseRepository[dict[str, Any]]):
    """Repository for session persistence and ownership checks."""

    def __init__(self, collection: AsyncIOMotorCollection[dict[str, Any]]) -> None:
        super().__init__(collection)

    async def find_by_user(self, user_id: str) -> list[dict[str, Any]]:
        """Return all sessions owned by a user."""
        cursor = self._col.find({"user_id": user_id}).sort("updated_at", -1)
        rows = [to_str_id(doc) async for doc in cursor]
        return cast(list[dict[str, Any]], rows)

    async def find_by_user_and_id(
        self,
        user_id: str,
        session_id: str,
    ) -> dict[str, Any] | None:
        """Return one session only when it belongs to the user."""
        doc = await self._col.find_one(
            {
                "_id": to_object_id(session_id),
                "user_id": user_id,
            }
        )
        if doc is None:
            return None
        return cast(dict[str, Any], to_str_id(doc))
