from pydantic import BaseModel


class RequestContext(BaseModel):
    """User context injected from X-User-* headers by chatly-backend."""

    user_id: str
    user_role: str = "user"
