from unittest.mock import AsyncMock

import pytest

from app.services.auth_service import AuthService
from app.utils.security import hash_password


@pytest.mark.asyncio
async def test_register_user_creates_user_when_email_is_new() -> None:
    user_repo = AsyncMock()
    user_repo.find_by_email.return_value = None
    user_repo.create_user.return_value = {
        "id": "u1",
        "email": "u@example.com",
        "full_name": "U",
        "is_active": True,
    }
    service = AuthService(user_repo=user_repo)

    result = await service.register_user("u@example.com", "password123", "U")

    assert result["id"] == "u1"
    user_repo.create_user.assert_awaited_once()


@pytest.mark.asyncio
async def test_register_user_raises_when_email_exists() -> None:
    user_repo = AsyncMock()
    user_repo.find_by_email.return_value = {"id": "u1", "email": "u@example.com"}
    service = AuthService(user_repo=user_repo)

    with pytest.raises(ValueError, match="Email already registered"):
        await service.register_user("u@example.com", "password123", "U")


@pytest.mark.asyncio
async def test_login_returns_access_token_for_valid_credentials() -> None:
    user_repo = AsyncMock()
    user_repo.get_user_with_password_by_email.return_value = {
        "id": "u1",
        "email": "u@example.com",
        "hashed_password": hash_password("password123"),
    }
    service = AuthService(user_repo=user_repo)

    token = await service.login("u@example.com", "password123")

    assert isinstance(token, str)
    assert token


@pytest.mark.asyncio
async def test_login_raises_for_invalid_password() -> None:
    user_repo = AsyncMock()
    user_repo.get_user_with_password_by_email.return_value = {
        "id": "u1",
        "email": "u@example.com",
        "hashed_password": hash_password("password123"),
    }
    service = AuthService(user_repo=user_repo)

    with pytest.raises(ValueError, match="Invalid credentials"):
        await service.login("u@example.com", "wrong")


@pytest.mark.asyncio
async def test_get_current_user_from_token_raises_for_invalid_token() -> None:
    user_repo = AsyncMock()
    service = AuthService(user_repo=user_repo)

    with pytest.raises(ValueError):
        await service.get_current_user_from_token("bad-token")
