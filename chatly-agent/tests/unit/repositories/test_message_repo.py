from datetime import UTC, datetime

import pytest
from mongomock_motor import AsyncMongoMockClient

from app.repositories.message_repo import MessageRepository


@pytest.fixture
def message_repo() -> MessageRepository:
    client = AsyncMongoMockClient()
    db = client["agent_server_test"]
    return MessageRepository(collection=db["messages"])


@pytest.mark.asyncio
async def test_find_by_session_returns_messages_sorted(
    message_repo: MessageRepository,
) -> None:
    await message_repo.create(
        {
            "session_id": "s1",
            "role": "assistant",
            "content": "later",
            "tool_calls": None,
            "created_at": datetime(2026, 1, 1, 1, 0, tzinfo=UTC),
        }
    )
    await message_repo.create(
        {
            "session_id": "s1",
            "role": "user",
            "content": "earlier",
            "tool_calls": None,
            "created_at": datetime(2026, 1, 1, 0, 0, tzinfo=UTC),
        }
    )

    rows = await message_repo.find_by_session("s1")

    assert [row["content"] for row in rows] == ["earlier", "later"]


@pytest.mark.asyncio
async def test_create_message_returns_inserted_document(
    message_repo: MessageRepository,
) -> None:
    result = await message_repo.create_message("s1", "user", "hello")

    assert result["session_id"] == "s1"
    assert result["role"] == "user"
    assert "id" in result


@pytest.mark.asyncio
async def test_delete_by_session_removes_only_target_session(
    message_repo: MessageRepository,
) -> None:
    await message_repo.create_message("s1", "user", "a")
    await message_repo.create_message("s1", "assistant", "b")
    await message_repo.create_message("s2", "user", "c")

    deleted_count = await message_repo.delete_by_session("s1")
    remaining_s1 = await message_repo.find_by_session("s1")
    remaining_s2 = await message_repo.find_by_session("s2")

    assert deleted_count == 2
    assert remaining_s1 == []
    assert len(remaining_s2) == 1
