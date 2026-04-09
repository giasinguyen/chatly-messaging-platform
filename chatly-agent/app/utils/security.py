from fastapi import HTTPException, status
from fastapi.security import APIKeyHeader

from app.config import settings

_API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=True)


async def verify_api_key(
    api_key: str = _API_KEY_HEADER,  # type: ignore[assignment]
) -> None:
    """Verify that the request comes from chatly-backend."""
    if api_key != settings.internal_api_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key",
        )
