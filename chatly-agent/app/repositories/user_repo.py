from datetime import UTC, datetime
from typing import Any

from motor.motor_asyncio import AsyncIOMotorCollection

from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[dict[str, Any]]):
    """Repository for MongoDB user operations."""

    def __init__(self, collection: AsyncIOMotorCollection[dict[str, Any]]) -> None:
        super().__init__(collection)

    async def find_by_email(self, email: str) -> dict[str, Any] | None:
        """Find one user by email."""
        doc = await self._col.find_one({"email": email.lower()})
        if doc is None:
            return None
        return self._to_public_user(doc)

    async def create_user(
        self,
        email: str,
        hashed_password: str,
        full_name: str,
    ) -> dict[str, Any]:
        """Insert one user and return public shape."""
        payload = {
            "email": email.lower(),
            "hashed_password": hashed_password,
            "full_name": full_name,
            "is_active": True,
            "created_at": datetime.now(UTC),
        }
        created = await self.create(payload)
        return self._to_public_user(created)

    async def get_user_by_id(self, user_id: str) -> dict[str, Any] | None:
        """Fetch one user by id."""
        user = await self.find_by_id(user_id)
        if user is None:
            return None
        return self._to_public_user(user)

    async def get_user_with_password_by_email(
        self, email: str
    ) -> dict[str, Any] | None:
        """Fetch one user including hashed password for login checks."""
        doc = await self._col.find_one({"email": email.lower()})
        if doc is None:
            return None
        if "_id" in doc:
            doc["id"] = str(doc.pop("_id"))
        return doc

    async def list_users(self) -> list[dict[str, Any]]:
        """List users in public response shape."""
        cursor = self._col.find({}).sort("created_at", -1)
        users: list[dict[str, Any]] = []
        async for doc in cursor:
            users.append(self._to_public_user(doc))
        return users

    def _to_public_user(self, user: dict[str, Any]) -> dict[str, Any]:
        """Normalize user document to API public shape."""
        normalized = dict(user)
        if "_id" in normalized:
            normalized["id"] = str(normalized.pop("_id"))
        normalized.pop("hashed_password", None)
        return {
            "id": str(normalized["id"]),
            "email": str(normalized.get("email", "")),
            "full_name": str(normalized.get("full_name", "")),
            "is_active": bool(normalized.get("is_active", True)),
            "created_at": normalized.get("created_at"),
        }
