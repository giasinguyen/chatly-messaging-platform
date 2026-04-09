from datetime import UTC, datetime

import pytest
from mongomock_motor import AsyncMongoMockClient

from app.repositories.session_repo import SessionRepository


@pytest.fixture
def session_repo() -> SessionRepository:
    client = AsyncMongoMockClient()
    db = client["agent_server_test"]
    return SessionRepository(collection=db["sessions"])


@pytest.mark.asyncio
async def test_find_by_user_returns_only_owned_sessions(
    session_repo: SessionRepository,
) -> None:
    await session_repo.create(
        {
            "user_id": "user-a",
            "title": "A",
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC),
        }
    )
    await session_repo.create(
        {
            "user_id": "user-b",
            "title": "B",
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC),
        }
    )

    sessions = await session_repo.find_by_user("user-a")

    assert len(sessions) == 1
    assert sessions[0]["user_id"] == "user-a"


@pytest.mark.asyncio
async def test_find_by_user_and_id_respects_ownership(
    session_repo: SessionRepository,
) -> None:
    created = await session_repo.create(
        {
            "user_id": "user-a",
            "title": "A",
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC),
        }
    )

    owned = await session_repo.find_by_user_and_id("user-a", created["id"])
    not_owned = await session_repo.find_by_user_and_id("user-b", created["id"])

    assert owned is not None
    assert not_owned is None


@pytest.mark.asyncio
async def test_delete_removes_document(session_repo: SessionRepository) -> None:
    created = await session_repo.create(
        {
            "user_id": "user-a",
            "title": "A",
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC),
        }
    )

    await session_repo.delete(created["id"])
    found = await session_repo.find_by_id(created["id"])

    assert found is None
