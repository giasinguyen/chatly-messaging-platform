from typing import Any, cast

from motor.motor_asyncio import AsyncIOMotorCollection

from app.db.mongo import to_object_id, to_str_id
from app.repositories.base import BaseRepository


class FileRepository(BaseRepository[dict[str, Any]]):
    """Repository for uploaded file metadata."""

    def __init__(self, collection: AsyncIOMotorCollection[dict[str, Any]]) -> None:
        super().__init__(collection)

    async def find_by_session(self, session_id: str) -> list[dict[str, Any]]:
        """Return file metadata rows in created order."""
        cursor = self._col.find({"session_id": session_id}).sort("created_at", 1)
        rows = [to_str_id(doc) async for doc in cursor]
        return cast(list[dict[str, Any]], rows)

    async def count_by_session(self, session_id: str) -> int:
        """Count uploaded files in one session."""
        return int(await self._col.count_documents({"session_id": session_id}))

    async def find_by_user_and_id(
        self,
        user_id: str,
        file_id: str,
    ) -> dict[str, Any] | None:
        """Return file row only when owned by user."""
        doc = await self._col.find_one(
            {
                "_id": to_object_id(file_id),
                "user_id": user_id,
            }
        )
        if doc is None:
            return None
        return cast(dict[str, Any], to_str_id(doc))
