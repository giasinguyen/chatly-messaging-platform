"""Unit tests for ToolService — MCP + web search tool assembly."""
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.tools import BaseTool

from app.services.tool_service import ToolService


_TOOL_INFO = {
    "name": "search",
    "description": "Search the web",
    "inputSchema": {
        "type": "object",
        "properties": {"query": {"type": "string"}},
        "required": ["query"],
    },
    "server_id": "s1",
    "server_url": "http://mcp.example.com/mcp",
    "server_headers": {},
}


@pytest.mark.asyncio
async def test_assemble_tools_returns_mcp_tools_when_ids_given() -> None:
    mcp_service = AsyncMock()
    mcp_service.get_tools_for_servers.return_value = [_TOOL_INFO]

    service = ToolService(mcp_service=mcp_service)
    tools = await service.assemble_tools(
        user_id="user-1",
        mcp_server_ids=["s1"],
        use_web_search=False,
    )

    assert len(tools) == 1
    assert isinstance(tools[0], BaseTool)
    assert tools[0].name == "search"


@pytest.mark.asyncio
async def test_assemble_tools_returns_web_search_when_flag_set() -> None:
    service = ToolService(mcp_service=None)

    with patch("app.services.tool_service.web_search_available", return_value=True), \
         patch("app.services.tool_service.create_web_search_tool") as mock_create:
        fake_tool = MagicMock(spec=BaseTool)
        fake_tool.name = "tavily_search_results_json"
        mock_create.return_value = fake_tool

        tools = await service.assemble_tools(
            user_id="user-1",
            mcp_server_ids=[],
            use_web_search=True,
        )

    assert len(tools) == 1
    assert tools[0].name == "tavily_search_results_json"
    mock_create.assert_called_once()


@pytest.mark.asyncio
async def test_assemble_tools_combines_mcp_and_web_search() -> None:
    mcp_service = AsyncMock()
    mcp_service.get_tools_for_servers.return_value = [_TOOL_INFO]

    service = ToolService(mcp_service=mcp_service)

    with patch("app.services.tool_service.web_search_available", return_value=True), \
         patch("app.services.tool_service.create_web_search_tool") as mock_create:
        fake_web_tool = MagicMock(spec=BaseTool)
        fake_web_tool.name = "tavily_search_results_json"
        mock_create.return_value = fake_web_tool

        tools = await service.assemble_tools(
            user_id="user-1",
            mcp_server_ids=["s1"],
            use_web_search=True,
        )

    assert len(tools) == 2
    names = {t.name for t in tools}
    assert "search" in names
    assert "tavily_search_results_json" in names


@pytest.mark.asyncio
async def test_assemble_tools_skips_web_search_when_unavailable() -> None:
    service = ToolService(mcp_service=None)

    with patch("app.services.tool_service.web_search_available", return_value=False):
        tools = await service.assemble_tools(
            user_id="user-1",
            mcp_server_ids=[],
            use_web_search=True,
        )

    assert tools == []


@pytest.mark.asyncio
async def test_assemble_tools_returns_empty_when_nothing_configured() -> None:
    service = ToolService(mcp_service=None)
    tools = await service.assemble_tools(
        user_id="user-1",
        mcp_server_ids=[],
        use_web_search=False,
    )
    assert tools == []


@pytest.mark.asyncio
async def test_assemble_tools_creates_one_client_per_server_url() -> None:
    """Tools from the same server URL share a single MCPClient instance."""
    tool_a = {**_TOOL_INFO, "name": "tool_a"}
    tool_b = {**_TOOL_INFO, "name": "tool_b"}

    mcp_service = AsyncMock()
    mcp_service.get_tools_for_servers.return_value = [tool_a, tool_b]

    service = ToolService(mcp_service=mcp_service)

    with patch("app.services.tool_service.MCPClient") as MockClient:
        mock_client_instance = MagicMock()
        MockClient.return_value = mock_client_instance

        tools = await service.assemble_tools(
            user_id="user-1",
            mcp_server_ids=["s1"],
            use_web_search=False,
        )

    # Only one MCPClient for the single server URL
    MockClient.assert_called_once()
    assert len(tools) == 2
