from unittest.mock import AsyncMock

import pytest

from app.exceptions import SessionNotFoundError
from app.services.session_service import SessionService


@pytest.fixture
def repos() -> tuple[AsyncMock, AsyncMock]:
    return AsyncMock(), AsyncMock()


@pytest.mark.asyncio
async def test_get_session_raises_when_not_owner(
    repos: tuple[AsyncMock, AsyncMock],
) -> None:
    session_repo, message_repo = repos
    session_repo.find_by_user_and_id.return_value = None
    service = SessionService(session_repo=session_repo, message_repo=message_repo)

    with pytest.raises(SessionNotFoundError):
        await service.get_session("user-a", "session-b")


@pytest.mark.asyncio
async def test_list_sessions_returns_only_user_rows(
    repos: tuple[AsyncMock, AsyncMock],
) -> None:
    session_repo, message_repo = repos
    session_repo.find_by_user.return_value = [{"id": "s1", "user_id": "user-a"}]
    service = SessionService(session_repo=session_repo, message_repo=message_repo)

    result = await service.list_sessions("user-a")

    assert result == [{"id": "s1", "user_id": "user-a"}]


@pytest.mark.asyncio
async def test_get_history_checks_ownership_then_returns_messages(
    repos: tuple[AsyncMock, AsyncMock],
) -> None:
    session_repo, message_repo = repos
    session_repo.find_by_user_and_id.return_value = {"id": "s1", "user_id": "user-a"}
    message_repo.find_by_session.return_value = [{"id": "m1", "session_id": "s1"}]
    service = SessionService(session_repo=session_repo, message_repo=message_repo)

    result = await service.get_history("user-a", "s1")

    assert result == [{"id": "m1", "session_id": "s1"}]
    message_repo.find_by_session.assert_awaited_once_with("s1")


@pytest.mark.asyncio
async def test_delete_session_deletes_messages_then_session(
    repos: tuple[AsyncMock, AsyncMock],
) -> None:
    session_repo, message_repo = repos
    session_repo.find_by_user_and_id.return_value = {"id": "s1", "user_id": "user-a"}
    service = SessionService(session_repo=session_repo, message_repo=message_repo)

    await service.delete_session("user-a", "s1")

    message_repo.delete_by_session.assert_awaited_once_with("s1")
    session_repo.delete.assert_awaited_once_with("s1")
