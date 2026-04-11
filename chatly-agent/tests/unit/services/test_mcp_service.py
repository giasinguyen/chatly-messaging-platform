"""Unit tests for MCPClient and MCPService — all HTTP calls mocked via respx."""
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest
import respx

from app.exceptions import MCPConnectionError, MCPServerNotFoundError
from app.services.mcp_service import MCPClient, MCPService


# ---------------------------------------------------------------------------
# MCPClient tests
# ---------------------------------------------------------------------------

MCP_URL = "http://mcp.example.com/mcp"

TOOLS_LIST_RESPONSE = {
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
        "tools": [
            {
                "name": "search",
                "description": "Search the web",
                "inputSchema": {"type": "object", "properties": {"query": {"type": "string"}}},
            }
        ]
    },
}

CALL_TOOL_RESPONSE = {
    "jsonrpc": "2.0",
    "id": 2,
    "result": {"content": [{"type": "text", "text": "result text"}]},
}


@pytest.fixture
def mcp_client() -> MCPClient:
    return MCPClient(url=MCP_URL, headers={})


@respx.mock
@pytest.mark.asyncio
async def test_list_tools_returns_tool_info(mcp_client: MCPClient) -> None:
    respx.post(MCP_URL).mock(return_value=httpx.Response(200, json=TOOLS_LIST_RESPONSE))

    tools = await mcp_client.list_tools()

    assert len(tools) == 1
    assert tools[0]["name"] == "search"


@respx.mock
@pytest.mark.asyncio
async def test_list_tools_raises_on_http_error(mcp_client: MCPClient) -> None:
    respx.post(MCP_URL).mock(return_value=httpx.Response(500))

    with pytest.raises(MCPConnectionError):
        await mcp_client.list_tools()


@respx.mock
@pytest.mark.asyncio
async def test_list_tools_raises_on_network_error(mcp_client: MCPClient) -> None:
    respx.post(MCP_URL).mock(side_effect=httpx.ConnectError("connection refused"))

    with pytest.raises(MCPConnectionError):
        await mcp_client.list_tools()


@respx.mock
@pytest.mark.asyncio
async def test_call_tool_returns_text_content(mcp_client: MCPClient) -> None:
    respx.post(MCP_URL).mock(return_value=httpx.Response(200, json=CALL_TOOL_RESPONSE))

    result = await mcp_client.call_tool("search", {"query": "python"})

    assert result == "result text"


@respx.mock
@pytest.mark.asyncio
async def test_call_tool_raises_on_jsonrpc_error(mcp_client: MCPClient) -> None:
    error_response = {"jsonrpc": "2.0", "id": 2, "error": {"code": -32600, "message": "bad request"}}
    respx.post(MCP_URL).mock(return_value=httpx.Response(200, json=error_response))

    with pytest.raises(MCPConnectionError):
        await mcp_client.call_tool("search", {"query": "python"})


# ---------------------------------------------------------------------------
# MCPService tests
# ---------------------------------------------------------------------------


def _make_repo(servers: list[dict]) -> AsyncMock:
    repo = AsyncMock()
    repo.create = AsyncMock(side_effect=lambda doc: {**doc, "id": "server-id-1"})
    repo.find_by_user = AsyncMock(return_value=servers)
    repo.find_by_user_and_id = AsyncMock(
        return_value=servers[0] if servers else None
    )
    repo.delete_by_id = AsyncMock()
    repo.update_active = AsyncMock(
        return_value={**servers[0], "is_active": False} if servers else None
    )
    return repo


def _server_record(server_id: str = "server-id-1") -> dict:
    return {
        "id": server_id,
        "user_id": "user-a",
        "name": "test-server",
        "url": "http://mcp.example.com/mcp",
        "headers": {},
        "is_active": True,
        "created_at": datetime.now(UTC),
    }


@respx.mock
@pytest.mark.asyncio
async def test_register_server_verifies_connection_before_saving() -> None:
    """register_server must call list_tools first; if it fails, no DB write."""
    repo = _make_repo([])
    repo.create = AsyncMock()
    respx.post("http://mcp.example.com/mcp").mock(return_value=httpx.Response(500))

    service = MCPService(mcp_repo=repo)

    with pytest.raises(MCPConnectionError):
        await service.register_server(
            user_id="user-a",
            name="bad-server",
            url="http://mcp.example.com/mcp",
            headers={},
        )

    repo.create.assert_not_called()


@respx.mock
@pytest.mark.asyncio
async def test_register_server_persists_after_successful_connection() -> None:
    repo = _make_repo([])
    respx.post("http://mcp.example.com/mcp").mock(
        return_value=httpx.Response(200, json=TOOLS_LIST_RESPONSE)
    )

    service = MCPService(mcp_repo=repo)
    result = await service.register_server(
        user_id="user-a",
        name="srv",
        url="http://mcp.example.com/mcp",
        headers={},
    )

    repo.create.assert_called_once()
    assert result["name"] == "srv"


@pytest.mark.asyncio
async def test_get_server_raises_when_not_found() -> None:
    repo = _make_repo([])
    repo.find_by_user_and_id = AsyncMock(return_value=None)
    service = MCPService(mcp_repo=repo)

    with pytest.raises(MCPServerNotFoundError):
        await service.get_server(user_id="user-a", server_id="missing")


@pytest.mark.asyncio
async def test_delete_server_raises_when_not_found() -> None:
    repo = _make_repo([])
    repo.find_by_user_and_id = AsyncMock(return_value=None)
    service = MCPService(mcp_repo=repo)

    with pytest.raises(MCPServerNotFoundError):
        await service.delete_server(user_id="user-a", server_id="missing")


@pytest.mark.asyncio
async def test_delete_server_calls_repo_delete_on_success() -> None:
    record = _server_record()
    repo = _make_repo([record])
    service = MCPService(mcp_repo=repo)

    await service.delete_server(user_id="user-a", server_id="server-id-1")

    repo.delete_by_id.assert_called_once_with("server-id-1")


@respx.mock
@pytest.mark.asyncio
async def test_get_tools_for_session_skips_unreachable_server() -> None:
    """get_tools_for_servers must skip failing servers, not raise."""
    s1_url = "http://mcp-s1.example.com/mcp"
    s2_url = "http://mcp-s2.example.com/mcp"
    s1 = {**_server_record("s1"), "url": s1_url}
    s2 = {**_server_record("s2"), "url": s2_url}
    records = [s1, s2]
    repo = _make_repo(records)
    repo.find_active_by_ids = AsyncMock(return_value=records)

    # s1 → OK, s2 → network error
    respx.post(s1_url).mock(return_value=httpx.Response(200, json=TOOLS_LIST_RESPONSE))
    respx.post(s2_url).mock(side_effect=httpx.ConnectError("down"))

    service = MCPService(mcp_repo=repo)
    tools = await service.get_tools_for_servers(
        user_id="user-a", server_ids=["s1", "s2"]
    )

    # only tools from s1
    assert len(tools) > 0
    assert all(t["server_id"] == "s1" for t in tools)
