from datetime import UTC, datetime

import pytest
from mongomock_motor import AsyncMongoMockClient

from app.repositories.mcp_repo import MCPRepository


@pytest.fixture
def mcp_repo() -> MCPRepository:
    client = AsyncMongoMockClient()
    db = client["agent_server_test"]
    return MCPRepository(collection=db["mcp_servers"])


def _server_doc(user_id: str = "user-a", name: str = "srv") -> dict:
    return {
        "user_id": user_id,
        "name": name,
        "url": "http://mcp.example.com",
        "headers": {},
        "is_active": True,
        "created_at": datetime.now(UTC),
    }


@pytest.mark.asyncio
async def test_find_by_user_returns_only_owned_servers(mcp_repo: MCPRepository) -> None:
    await mcp_repo.create(_server_doc("user-a", "srv-a"))
    await mcp_repo.create(_server_doc("user-b", "srv-b"))

    servers = await mcp_repo.find_by_user("user-a")

    assert len(servers) == 1
    assert servers[0]["user_id"] == "user-a"


@pytest.mark.asyncio
async def test_find_by_user_and_id_respects_ownership(mcp_repo: MCPRepository) -> None:
    created = await mcp_repo.create(_server_doc("user-a"))

    owned = await mcp_repo.find_by_user_and_id("user-a", created["id"])
    not_owned = await mcp_repo.find_by_user_and_id("user-b", created["id"])

    assert owned is not None
    assert not_owned is None


@pytest.mark.asyncio
async def test_find_active_by_ids_returns_only_active_owned(
    mcp_repo: MCPRepository,
) -> None:
    active = await mcp_repo.create(_server_doc("user-a", "active"))
    inactive_doc = _server_doc("user-a", "inactive")
    inactive_doc["is_active"] = False
    inactive = await mcp_repo.create(inactive_doc)
    other_user = await mcp_repo.create(_server_doc("user-b", "other"))

    results = await mcp_repo.find_active_by_ids(
        "user-a", [active["id"], inactive["id"], other_user["id"]]
    )

    ids = [r["id"] for r in results]
    assert active["id"] in ids
    assert inactive["id"] not in ids
    assert other_user["id"] not in ids


@pytest.mark.asyncio
async def test_update_active_toggles_flag(mcp_repo: MCPRepository) -> None:
    created = await mcp_repo.create(_server_doc("user-a"))

    updated = await mcp_repo.update_active("user-a", created["id"], False)

    assert updated is not None
    assert updated["is_active"] is False


@pytest.mark.asyncio
async def test_update_active_returns_none_for_wrong_owner(
    mcp_repo: MCPRepository,
) -> None:
    created = await mcp_repo.create(_server_doc("user-a"))

    result = await mcp_repo.update_active("user-b", created["id"], False)

    assert result is None
