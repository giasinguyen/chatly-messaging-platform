from datetime import datetime

from pydantic import BaseModel


class MessageResponse(BaseModel):
    """Single chat message returned to clients."""

    id: str
    session_id: str
    role: str
    content: str
    created_at: datetime


class MessageHistory(BaseModel):
    """Message history for a session."""

    messages: list[MessageResponse]
