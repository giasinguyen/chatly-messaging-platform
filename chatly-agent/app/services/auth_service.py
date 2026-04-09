from typing import Any

from jose import JWTError

from app.repositories.user_repo import UserRepository
from app.utils.security import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)


class AuthService:
    """Authentication and JWT utilities."""

    def __init__(self, user_repo: UserRepository) -> None:
        self._user_repo = user_repo

    async def register_user(
        self,
        email: str,
        password: str,
        full_name: str,
    ) -> dict[str, Any]:
        """Register user through MongoDB and return created profile."""
        existing_user = await self._user_repo.find_by_email(email)
        if existing_user is not None:
            raise ValueError("Email already registered")

        hashed_password = hash_password(password)
        return await self._user_repo.create_user(email, hashed_password, full_name)

    async def login(self, email: str, password: str) -> str:
        """Authenticate and return JWT access token."""
        user = await self._user_repo.get_user_with_password_by_email(email)
        if user is None:
            raise ValueError("Invalid credentials")

        hashed_password = str(user.get("hashed_password", ""))
        if not verify_password(password, hashed_password):
            raise ValueError("Invalid credentials")

        return create_access_token(str(user["id"]))

    async def get_user_by_id(self, user_id: str) -> dict[str, Any] | None:
        """Fetch user by id."""
        return await self._user_repo.get_user_by_id(user_id)

    async def list_users(self) -> list[dict[str, Any]]:
        """List all users."""
        return await self._user_repo.list_users()

    async def get_current_user_from_token(self, token: str) -> dict[str, Any]:
        """Validate token and return corresponding user."""
        try:
            user_id = decode_token(token)
        except JWTError as exc:
            raise ValueError("Invalid token") from exc

        user = await self._user_repo.get_user_by_id(user_id)
        if user is None:
            raise ValueError("User not found")
        return user
