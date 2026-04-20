"""Interrupt state repository for HITL (Human-in-the-Loop) sessions."""
from datetime import UTC, datetime
from typing import Any

from motor.motor_asyncio import AsyncIOMotorCollection
from pydantic import BaseModel

TTL_SECONDS = 24 * 3600  # 24 hours


class InterruptDoc(BaseModel):
    """Schema for a pending interrupt record."""

    session_id: str
    user_id: str
    interrupt_data: dict[str, Any]
    tool_config: dict[str, Any]
    status: str = "pending"
    created_at: datetime

    model_config = {"arbitrary_types_allowed": True}


class InterruptRepository:
    """Persist and resolve HITL interrupt state for a session.

    One pending interrupt per session at a time (unique index on session_id).
    Documents expire automatically via a MongoDB TTL index on created_at.
    """

    def __init__(self, collection: AsyncIOMotorCollection) -> None:
        self._col = collection

    async def setup_indexes(self) -> None:
        """Create required indexes (idempotent — safe to call on every startup)."""
        await self._col.create_index("session_id", unique=True)
        await self._col.create_index(
            "created_at", expireAfterSeconds=TTL_SECONDS
        )

    async def create(
        self,
        session_id: str,
        user_id: str,
        interrupt_data: dict[str, Any],
        tool_config: dict[str, Any],
    ) -> InterruptDoc:
        """Upsert an interrupt record for the given session."""
        doc: dict[str, Any] = {
            "session_id": session_id,
            "user_id": user_id,
            "interrupt_data": interrupt_data,
            "tool_config": tool_config,
            "status": "pending",
            "created_at": datetime.now(UTC),
        }
        await self._col.replace_one(
            {"session_id": session_id},
            doc,
            upsert=True,
        )
        return InterruptDoc(**doc)

    async def get_pending(self, session_id: str) -> InterruptDoc | None:
        """Return the pending interrupt doc for the session, or None."""
        row = await self._col.find_one(
            {"session_id": session_id, "status": "pending"}
        )
        if row is None:
            return None
        row.pop("_id", None)
        return InterruptDoc(**row)

    async def resolve(self, session_id: str) -> None:
        """Delete the interrupt record once the user has responded."""
        await self._col.delete_one({"session_id": session_id})
