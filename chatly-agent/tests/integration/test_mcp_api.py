"""Integration tests for the MCP server management API.

All external HTTP calls and database access are stubbed out through
FastAPI dependency_overrides so no real server is needed.
"""
from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock

import httpx
import pytest
import respx
from fastapi.testclient import TestClient

from app.dependencies import get_mcp_service
from app.exceptions import MCPConnectionError, MCPServerNotFoundError
from app.main import app
from app.middleware.auth import get_current_user
from app.services.mcp_service import MCPService

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

MCP_URL = "http://mcp.example.com/mcp"

TOOLS_LIST_RESPONSE = {
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
        "tools": [
            {
                "name": "search",
                "description": "Web search",
                "inputSchema": {"type": "object", "properties": {"query": {"type": "string"}}},
            }
        ]
    },
}

_SERVER_RECORD = {
    "id": "server-id-1",
    "user_id": "user-a",
    "name": "my-server",
    "url": MCP_URL,
    "headers": {},
    "is_active": True,
    "created_at": datetime.now(UTC),
}


def _make_mcp_service_mock(**overrides: Any) -> AsyncMock:
    mock = AsyncMock(spec=MCPService)
    mock.register_server = AsyncMock(return_value={**_SERVER_RECORD, **overrides})
    mock.list_servers = AsyncMock(return_value=[_SERVER_RECORD])
    mock.get_server = AsyncMock(return_value=_SERVER_RECORD)
    mock.delete_server = AsyncMock(return_value=None)
    mock.toggle_server = AsyncMock(return_value={**_SERVER_RECORD, "is_active": False})
    mock.get_live_tools = AsyncMock(
        return_value=[
            {
                "name": "search",
                "description": "Web search",
                "inputSchema": {"type": "object"},
            }
        ]
    )
    return mock


async def _fake_current_user() -> dict[str, str]:
    return {"id": "user-a"}


def _client(mcp_mock: AsyncMock) -> TestClient:
    app.dependency_overrides[get_current_user] = _fake_current_user
    app.dependency_overrides[get_mcp_service] = lambda: mcp_mock
    return TestClient(app, raise_server_exceptions=False)


def _clear() -> None:
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_register_server_returns_201() -> None:
    mock = _make_mcp_service_mock()
    client = _client(mock)

    response = client.post(
        "/mcp/servers",
        json={"name": "my-server", "url": MCP_URL},
    )
    _clear()

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "my-server"
    assert data["url"] == MCP_URL


def test_register_server_unreachable_returns_400() -> None:
    mock = _make_mcp_service_mock()
    mock.register_server = AsyncMock(
        side_effect=MCPConnectionError("Cannot reach http://bad-url/mcp")
    )
    client = _client(mock)

    response = client.post(
        "/mcp/servers",
        json={"name": "bad", "url": "http://bad-url/mcp"},
    )
    _clear()

    assert response.status_code == 400
    assert "Cannot reach" in response.json()["detail"]


def test_list_servers_returns_all_owned() -> None:
    mock = _make_mcp_service_mock()
    client = _client(mock)

    response = client.get("/mcp/servers")
    _clear()

    assert response.status_code == 200
    items = response.json()
    assert len(items) == 1
    assert items[0]["id"] == "server-id-1"


def test_get_server_returns_record() -> None:
    mock = _make_mcp_service_mock()
    client = _client(mock)

    response = client.get("/mcp/servers/server-id-1")
    _clear()

    assert response.status_code == 200
    assert response.json()["id"] == "server-id-1"


def test_get_server_not_owned_returns_404() -> None:
    mock = _make_mcp_service_mock()
    mock.get_server = AsyncMock(
        side_effect=MCPServerNotFoundError("MCP server 'other' not found")
    )
    client = _client(mock)

    response = client.get("/mcp/servers/other")
    _clear()

    assert response.status_code == 404


def test_delete_server_returns_204() -> None:
    mock = _make_mcp_service_mock()
    client = _client(mock)

    response = client.delete("/mcp/servers/server-id-1")
    _clear()

    assert response.status_code == 204
    mock.delete_server.assert_awaited_once_with("user-a", "server-id-1")


def test_delete_server_not_found_returns_404() -> None:
    mock = _make_mcp_service_mock()
    mock.delete_server = AsyncMock(
        side_effect=MCPServerNotFoundError("not found")
    )
    client = _client(mock)

    response = client.delete("/mcp/servers/missing")
    _clear()

    assert response.status_code == 404


def test_toggle_server_returns_updated_record() -> None:
    mock = _make_mcp_service_mock()
    client = _client(mock)

    response = client.patch(
        "/mcp/servers/server-id-1/toggle",
        json={"is_active": False},
    )
    _clear()

    assert response.status_code == 200
    assert response.json()["is_active"] is False


def test_list_server_tools_returns_tool_info() -> None:
    mock = _make_mcp_service_mock()
    client = _client(mock)

    response = client.get("/mcp/servers/server-id-1/tools")
    _clear()

    assert response.status_code == 200
    tools = response.json()
    assert len(tools) == 1
    assert tools[0]["name"] == "search"


def test_user_a_cannot_delete_user_b_server() -> None:
    """Ownership is enforced at the service layer; ensure 404 surfaces correctly."""
    mock = _make_mcp_service_mock()
    mock.delete_server = AsyncMock(
        side_effect=MCPServerNotFoundError("'server-b' not found for user-a")
    )
    client = _client(mock)

    response = client.delete("/mcp/servers/server-b")
    _clear()

    assert response.status_code == 404
