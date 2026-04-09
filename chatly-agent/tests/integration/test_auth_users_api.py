from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from fastapi.testclient import TestClient

from app.dependencies import get_auth_service
from app.main import app


class InMemoryAuthService:
    def __init__(self) -> None:
        self._users: dict[str, dict[str, Any]] = {}
        self._tokens: dict[str, str] = {}

    async def register_user(
        self,
        email: str,
        password: str,
        full_name: str,
    ) -> dict[str, Any]:
        if any(user["email"] == email for user in self._users.values()):
            raise ValueError("Email already registered")

        user_id = str(uuid4())
        user = {
            "id": user_id,
            "email": email,
            "full_name": full_name,
            "hashed_password": password,
            "is_active": True,
            "created_at": datetime.now(UTC),
        }
        self._users[user_id] = user
        return user

    async def login(self, email: str, password: str) -> str:
        for user in self._users.values():
            if user["email"] == email and user["hashed_password"] == password:
                token = f"token-{user['id']}"
                self._tokens[token] = user["id"]
                return token
        raise ValueError("Invalid credentials")

    async def get_user_by_id(self, user_id: str) -> dict[str, Any] | None:
        return self._users.get(user_id)

    async def list_users(self) -> list[dict[str, Any]]:
        return list(self._users.values())

    async def get_current_user_from_token(self, token: str) -> dict[str, Any]:
        user_id = self._tokens.get(token)
        if user_id is None:
            raise ValueError("Invalid token")
        user = self._users.get(user_id)
        if user is None:
            raise ValueError("User not found")
        return user


service = InMemoryAuthService()


async def _override_auth_service() -> InMemoryAuthService:
    return service


def _get_client() -> TestClient:
    app.dependency_overrides[get_auth_service] = _override_auth_service
    return TestClient(app)


def _clear_overrides() -> None:
    app.dependency_overrides.clear()


def test_register_login_and_me_flow() -> None:
    service._users.clear()
    service._tokens.clear()
    client = _get_client()

    register_response = client.post(
        "/auth/register",
        json={
            "email": "a@example.com",
            "password": "password123",
            "full_name": "Alice",
        },
    )
    login_response = client.post(
        "/auth/login",
        json={"email": "a@example.com", "password": "password123"},
    )

    token = login_response.json()["access_token"]
    me_response = client.get("/me", headers={"Authorization": f"Bearer {token}"})

    _clear_overrides()
    assert register_response.status_code == 201
    assert login_response.status_code == 200
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "a@example.com"


def test_users_endpoints_require_valid_token() -> None:
    service._users.clear()
    service._tokens.clear()
    client = _get_client()

    _ = client.post(
        "/auth/register",
        json={"email": "b@example.com", "password": "password123", "full_name": "Bob"},
    )
    bad_response = client.get("/users", headers={"Authorization": "Bearer bad-token"})

    _clear_overrides()
    assert bad_response.status_code == 401
