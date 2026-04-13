from typing import Any

from motor.motor_asyncio import AsyncIOMotorCollection

from app.repositories.base import BaseRepository


class ChunkRepository(BaseRepository[dict[str, Any]]):
    """Repository for persisted chunk metadata in MongoDB."""

    def __init__(self, collection: AsyncIOMotorCollection[dict[str, Any]]) -> None:
        super().__init__(collection)

    async def insert_many(self, rows: list[dict[str, Any]]) -> int:
        """Insert multiple chunks and return inserted count."""
        if not rows:
            return 0
        result = await self._col.insert_many(rows)
        return len(result.inserted_ids)

    async def count_by_session(self, session_id: str) -> int:
        """Count chunks by session id."""
        return int(await self._col.count_documents({"session_id": session_id}))

    async def delete_by_file(self, file_id: str) -> int:
        """Delete all chunks for a file id and return deleted count."""
        result = await self._col.delete_many({"file_id": file_id})
        return int(result.deleted_count)
