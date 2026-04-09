from datetime import datetime
from typing import Any

from pydantic import BaseModel


class MessageResponse(BaseModel):
    """Single chat message returned to clients."""

    id: str
    session_id: str
    role: str
    content: str
    tool_calls: dict[str, Any] | None = None
    created_at: datetime


class MessageHistory(BaseModel):
    """Message history for a session."""

    messages: list[MessageResponse]
