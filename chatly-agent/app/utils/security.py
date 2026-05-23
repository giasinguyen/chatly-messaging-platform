from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader

from app.config import settings

_API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=True)


async def verify_api_key(
    api_key: str = Depends(_API_KEY_HEADER),
) -> None:
    """Verify that the request comes from chatly-backend."""
    if api_key != settings.internal_api_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid API key",
        )
