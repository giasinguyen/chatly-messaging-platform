"""Unit tests for the dynamic MCP tool factory."""
from unittest.mock import AsyncMock

import pytest

from app.tools.mcp_tool import create_mcp_tool


def _tool_info() -> dict:
    return {
        "name": "web_search",
        "description": "Search the web for up-to-date information.",
        "inputSchema": {
            "type": "object",
            "properties": {"query": {"type": "string"}},
            "required": ["query"],
        },
        "server_id": "server-1",
        "server_url": "http://mcp.example.com/mcp",
        "server_headers": {},
    }


@pytest.mark.asyncio
async def test_create_mcp_tool_has_correct_name_and_description() -> None:
    mock_client_call = AsyncMock(return_value="search result")
    tool = create_mcp_tool(_tool_info(), call_tool=mock_client_call)

    assert tool.name == "web_search"
    assert "Search the web" in tool.description


@pytest.mark.asyncio
async def test_create_mcp_tool_arun_delegates_to_call_tool() -> None:
    mock_client_call = AsyncMock(return_value="42")
    tool = create_mcp_tool(_tool_info(), call_tool=mock_client_call)

    result = await tool.arun({"query": "python async"})

    mock_client_call.assert_called_once_with("web_search", {"query": "python async"})
    assert result == "42"


@pytest.mark.asyncio
async def test_create_mcp_tool_arun_with_string_input_wraps_as_dict() -> None:
    """When LangChain passes a raw string, wrap it under the first required key."""
    mock_client_call = AsyncMock(return_value="ok")
    tool = create_mcp_tool(_tool_info(), call_tool=mock_client_call)

    result = await tool.arun("hello world")

    mock_client_call.assert_called_once_with("web_search", {"query": "hello world"})
    assert result == "ok"
