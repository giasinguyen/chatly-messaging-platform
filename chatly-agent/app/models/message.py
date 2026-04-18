from datetime import datetime

from pydantic import BaseModel


class MessageAttachment(BaseModel):
    """Metadata for a file attached to a message."""

    file_id: str
    filename: str
    content_type: str
    size: int


class MessageResponse(BaseModel):
    """Single chat message returned to clients."""

    id: str
    session_id: str
    role: str
    content: str
    attachments: list[MessageAttachment] = []
    created_at: datetime


class MessageHistory(BaseModel):
    """Message history for a session."""

    messages: list[MessageResponse]
