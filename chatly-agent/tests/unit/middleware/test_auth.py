from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.middleware.auth import get_current_user


@pytest.mark.asyncio
async def test_get_current_user_returns_user_dict_when_token_valid() -> None:
    auth_service = AsyncMock()
    auth_service.get_current_user_from_token = AsyncMock(
        return_value={"id": "user-1", "email": "u@example.com"}
    )
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="valid")

    result = await get_current_user(credentials=credentials, auth_service=auth_service)

    assert result["id"] == "user-1"


@pytest.mark.asyncio
async def test_get_current_user_raises_401_when_token_invalid() -> None:
    auth_service = AsyncMock()
    auth_service.get_current_user_from_token = AsyncMock(
        side_effect=ValueError("Invalid token")
    )
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="invalid")

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(credentials=credentials, auth_service=auth_service)

    assert exc_info.value.status_code == 401
