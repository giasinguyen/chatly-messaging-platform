from typing import Any

from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.dependencies import get_auth_service
from app.services.auth_service import AuthService

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),  # noqa: B008
    auth_service: AuthService = Depends(get_auth_service),  # noqa: B008
) -> dict[str, Any]:
    """Validate application JWT and return current user data."""
    try:
        return await auth_service.get_current_user_from_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
