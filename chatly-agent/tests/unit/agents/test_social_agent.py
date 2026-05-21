"""Unit tests for SocialAgent tool partitioning behavior."""

from unittest.mock import MagicMock

import pytest
from langchain_core.tools import BaseTool

import app.agents.social_agent as social_agent_module
from app.agents.social_agent import CREATE_AI_POST_COMMENT_TOOL_NAME, SocialAgent


def _make_tool(name: str) -> BaseTool:
    tool = MagicMock(spec=BaseTool)
    tool.name = name
    return tool


def _build_agent(tool_names: list[str]) -> SocialAgent:
    tools = [_make_tool(name) for name in tool_names]
    return SocialAgent(llm=MagicMock(), tools=tools)


@pytest.fixture(autouse=True)
def _mock_create_react_agent(monkeypatch: pytest.MonkeyPatch) -> None:
    class _ToolNode:
        def __init__(self, tools: list[BaseTool]) -> None:
            self.tools_by_name = {tool.name: tool for tool in tools}

    class _FakeGraph:
        def __init__(self, tools: list[BaseTool]) -> None:
            self.nodes = {"tool_node": _ToolNode(tools)}

    def _fake_factory(_llm: MagicMock, tools: list[BaseTool]) -> _FakeGraph:
        return _FakeGraph(tools)

    monkeypatch.setattr(social_agent_module, "create_react_agent", _fake_factory)


def _research_tool_names(agent: SocialAgent) -> list[str]:
    if agent._graph is None:
        return []
    for _, node in agent._graph.nodes.items():
        if hasattr(node, "tools_by_name"):
            return list(node.tools_by_name.keys())
    return []


def test_create_ai_post_comment_is_captured_as_send_tool() -> None:
    agent = _build_agent(["readRecentMessages", CREATE_AI_POST_COMMENT_TOOL_NAME])
    assert agent._send_tool is not None
    assert agent._send_tool.name == CREATE_AI_POST_COMMENT_TOOL_NAME


def test_create_ai_post_comment_excluded_from_research_tools() -> None:
    agent = _build_agent(["readRecentMessages", "getPostById", CREATE_AI_POST_COMMENT_TOOL_NAME])
    research_names = _research_tool_names(agent)
    assert CREATE_AI_POST_COMMENT_TOOL_NAME not in research_names


def test_regular_tools_remain_available_for_research() -> None:
    agent = _build_agent(["readRecentMessages", "getPostById", "getPostComments", CREATE_AI_POST_COMMENT_TOOL_NAME])
    research_names = _research_tool_names(agent)
    assert "readRecentMessages" in research_names
    assert "getPostById" in research_names
    assert "getPostComments" in research_names


@pytest.mark.asyncio
async def test_missing_publish_tool_logs_warning(caplog: pytest.LogCaptureFixture) -> None:
    import logging

    with caplog.at_level(logging.WARNING, logger="app.agents.social_agent"):
        agent = _build_agent(["getPostById"])

    assert agent._send_tool is None
    assert any("createAiPostComment" in record.message for record in caplog.records)