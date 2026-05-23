from datetime import datetime

from pydantic import BaseModel


class FileResponse(BaseModel):
    """Single uploaded file metadata."""

    id: str
    session_id: str
    user_id: str
    filename: str
    mime_type: str
    size_bytes: int
    minio_bucket: str
    object_key: str
    etag: str | None = None
    created_at: datetime


class FileListResponse(BaseModel):
    """List response for session files."""

    files: list[FileResponse]
    total: int
