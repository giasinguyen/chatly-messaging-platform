from datetime import datetime, timezone
from typing import Any

from motor.motor_asyncio import AsyncIOMotorCollection

from app.db.mongo import to_object_id, to_str_id
from app.repositories.base import BaseRepository


class MCPRepository(BaseRepository[dict[str, Any]]):
    """MongoDB persistence for user-owned MCP server configurations."""

    def __init__(self, collection: AsyncIOMotorCollection[dict[str, Any]]) -> None:
        super().__init__(collection)

    async def find_by_user(self, user_id: str) -> list[dict[str, Any]]:
        """Return all MCP servers owned by *user_id*, sorted newest first."""
        cursor = self._col.find({"user_id": user_id}).sort("created_at", -1)
        return [to_str_id(doc) async for doc in cursor]

    async def find_by_user_and_id(
        self, user_id: str, server_id: str
    ) -> dict[str, Any] | None:
        """Fetch a server only when it belongs to *user_id*."""
        doc = await self._col.find_one(
            {"_id": to_object_id(server_id), "user_id": user_id}
        )
        return to_str_id(doc) if doc else None

    async def find_active_by_ids(
        self, user_id: str, server_ids: list[str]
    ) -> list[dict[str, Any]]:
        """Return active servers whose ids are in *server_ids* for *user_id*."""
        object_ids = [to_object_id(sid) for sid in server_ids]
        cursor = self._col.find(
            {
                "_id": {"$in": object_ids},
                "user_id": user_id,
                "is_active": True,
            }
        )
        return [to_str_id(doc) async for doc in cursor]

    async def update_active(
        self, user_id: str, server_id: str, is_active: bool
    ) -> dict[str, Any] | None:
        """Toggle the *is_active* flag. Returns the updated doc or None if not found."""
        result = await self._col.find_one_and_update(
            {"_id": to_object_id(server_id), "user_id": user_id},
            {
                "$set": {
                    "is_active": is_active,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
            return_document=True,
        )
        return to_str_id(result) if result else None
