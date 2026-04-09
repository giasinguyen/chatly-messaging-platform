from datetime import datetime

from pydantic import BaseModel


class UserResponse(BaseModel):
    """Public user model exposed by API."""

    id: str
    email: str
    full_name: str
    is_active: bool
    created_at: datetime | None = None


class UserListResponse(BaseModel):
    """Response wrapper for list users endpoint."""

    users: list[UserResponse]
    total: int
