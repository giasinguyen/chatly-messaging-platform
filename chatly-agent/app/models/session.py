from datetime import datetime

from pydantic import BaseModel


class SessionCreate(BaseModel):
    """Payload to create a chat session."""

    title: str = "New Chat"


class SessionResponse(BaseModel):
    """Session data returned to clients."""

    id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime


class SessionList(BaseModel):
    """List response for user sessions."""

    sessions: list[SessionResponse]
    total: int
