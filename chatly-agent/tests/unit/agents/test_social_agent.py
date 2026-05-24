"""Unit tests for SocialAgent tool partitioning behavior."""

from unittest.mock import MagicMock

import pytest
from langchain_core.tools import BaseTool
from pydantic import BaseModel

import app.agents.social_agent as social_agent_module
from app.agents.social_agent import SocialAgent


def _make_tool(
    name: str, args_fields: list[str] | None = None, description: str = ""
) -> BaseTool:
    tool = MagicMock(spec=BaseTool)
    tool.name = name
    tool.description = description
    if args_fields:
        tool.args_schema = type(
            f"{name}Args",
            (BaseModel,),
            {"__annotations__": {f: str for f in args_fields}},
        )
        # Ensure Pydantic v2 field model is initialized via explicit class creation.
        tool.args_schema.model_rebuild(force=True)
    else:
        tool.args_schema = None
    return tool


def _build_agent(tools: list[BaseTool]) -> SocialAgent:
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


def test_publish_tool_with_required_schema_is_captured_as_send_tool() -> None:
    agent = _build_agent(
        [
            _make_tool("getPostById", ["postId"]),
            _make_tool(
                "tool_x", ["postId", "content", "triggerType", "parentCommentId"]
            ),
        ]
    )
    assert agent._send_tool is not None
    assert agent._send_tool.name == "tool_x"


def test_create_ai_post_comment_excluded_from_research_tools() -> None:
    agent = _build_agent(
        [
            _make_tool("readRecentMessages", ["conversationId"]),
            _make_tool("getPostById", ["postId"]),
            _make_tool(
                "publish", ["postId", "content", "triggerType", "parentCommentId"]
            ),
        ]
    )
    research_names = _research_tool_names(agent)
    assert "publish" not in research_names


def test_publish_tool_can_be_detected_by_description_fallback() -> None:
    agent = _build_agent(
        [
            _make_tool("getPostById", ["postId"]),
            _make_tool(
                "social_tool",
                description="Publish an AI-generated comment on a social post",
            ),
        ]
    )
    assert agent._send_tool is not None
    assert agent._send_tool.name == "social_tool"


def test_regular_tools_remain_available_for_research() -> None:
    agent = _build_agent(
        [
            _make_tool("readRecentMessages", ["conversationId"]),
            _make_tool("getPostById", ["postId"]),
            _make_tool("getPostComments", ["postId"]),
            _make_tool(
                "publish", ["postId", "content", "triggerType", "parentCommentId"]
            ),
        ]
    )
    research_names = _research_tool_names(agent)
    assert "readRecentMessages" in research_names
    assert "getPostById" in research_names
    assert "getPostComments" in research_names


@pytest.mark.asyncio
async def test_missing_publish_tool_logs_warning(
    caplog: pytest.LogCaptureFixture,
) -> None:
    import logging

    with caplog.at_level(logging.WARNING, logger="app.agents.social_agent"):
        agent = _build_agent([_make_tool("getPostById", ["postId"])])

    assert agent._send_tool is None
    assert any("cannot publish" in record.message for record in caplog.records)
