import pytest
from mongomock_motor import AsyncMongoMockClient

from app.repositories.user_repo import UserRepository


@pytest.fixture
def user_repo() -> UserRepository:
    client = AsyncMongoMockClient()
    db = client["agent_server_test"]
    return UserRepository(collection=db["users"])


@pytest.mark.asyncio
async def test_create_and_find_by_email_returns_public_user(
    user_repo: UserRepository,
) -> None:
    created = await user_repo.create_user(
        email="u@example.com",
        hashed_password="hashed",
        full_name="User",
    )

    found = await user_repo.find_by_email("u@example.com")

    assert created["id"] == found["id"]
    assert found["email"] == "u@example.com"


@pytest.mark.asyncio
async def test_get_user_with_password_by_email_returns_hashed_password(
    user_repo: UserRepository,
) -> None:
    await user_repo.create_user(
        email="u@example.com",
        hashed_password="hashed",
        full_name="User",
    )

    found = await user_repo.get_user_with_password_by_email("u@example.com")

    assert found is not None
    assert found["hashed_password"] == "hashed"


@pytest.mark.asyncio
async def test_list_users_returns_public_users_only(user_repo: UserRepository) -> None:
    await user_repo.create_user(
        email="a@example.com",
        hashed_password="hashed-a",
        full_name="A",
    )
    await user_repo.create_user(
        email="b@example.com",
        hashed_password="hashed-b",
        full_name="B",
    )

    users = await user_repo.list_users()

    assert len(users) == 2
    assert all("hashed_password" not in user for user in users)
