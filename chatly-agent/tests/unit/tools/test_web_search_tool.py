"""Unit tests for web_search_tool factory and availability helper."""

from unittest.mock import patch

import pytest
from langchain_core.tools import BaseTool

from app.tools.web_search_tool import create_web_search_tool, web_search_available


def test_web_search_available_returns_true_when_key_set() -> None:
    with patch("app.tools.web_search_tool.settings") as mock_settings:
        mock_settings.tavily_api_key = "tvly-abc123"
        assert web_search_available() is True


def test_web_search_available_returns_false_when_key_empty() -> None:
    with patch("app.tools.web_search_tool.settings") as mock_settings:
        mock_settings.tavily_api_key = ""
        assert web_search_available() is False


def test_create_web_search_tool_returns_tavily_instance() -> None:
    with patch("app.tools.web_search_tool.settings") as mock_settings:
        mock_settings.tavily_api_key = "tvly-abc123"
        tool = create_web_search_tool()
        assert isinstance(tool, BaseTool)
        assert tool.name == "tavily_search"


def test_create_web_search_tool_exposes_only_query_schema() -> None:
    with patch("app.tools.web_search_tool.settings") as mock_settings:
        mock_settings.tavily_api_key = "tvly-abc123"
        tool = create_web_search_tool()
        assert tool.args == {
            "query": {
                "title": "Query",
                "type": "string",
            }
        }


def test_create_web_search_tool_raises_when_key_missing() -> None:
    with patch("app.tools.web_search_tool.settings") as mock_settings:
        mock_settings.tavily_api_key = ""
        with pytest.raises(ValueError, match="Tavily API key"):
            create_web_search_tool()
