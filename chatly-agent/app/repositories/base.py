from typing import Any, TypeVar, cast

from motor.motor_asyncio import AsyncIOMotorCollection

from app.db.mongo import to_object_id, to_str_id

T = TypeVar("T")


class BaseRepository[T]:
    """Shared CRUD primitives for MongoDB repositories."""

    def __init__(self, collection: AsyncIOMotorCollection[dict[str, Any]]) -> None:
        self._col = collection

    async def find_by_id(self, item_id: str) -> T | None:
        """Fetch one document by string id."""
        doc = await self._col.find_one({"_id": to_object_id(item_id)})
        if doc is None:
            return None
        return cast(T, to_str_id(doc))

    async def create(self, data: dict[str, Any]) -> T:
        """Insert one document and return it."""
        payload = dict(data)
        result = await self._col.insert_one(payload)
        payload["_id"] = result.inserted_id
        return cast(T, to_str_id(payload))

    async def delete(self, item_id: str) -> None:
        """Delete one document by string id."""
        await self._col.delete_one({"_id": to_object_id(item_id)})
