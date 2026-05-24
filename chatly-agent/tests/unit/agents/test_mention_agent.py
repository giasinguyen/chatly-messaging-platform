"""Unit tests for MentionAgent tool partitioning.

Verifies that sendTextMessage is excluded from the research tool list so the
LLM cannot post a duplicate TEXT message before the deterministic sendAiMessage
call at the end of the flow.
"""

from unittest.mock import MagicMock

import pytest
from langchain_core.tools import BaseTool

from app.agents.mention_agent import (
    MentionAgent,
    SEND_AI_MESSAGE_TOOL_NAME,
    SEND_TEXT_MESSAGE_TOOL_NAME,
)


def _make_tool(name: str) -> BaseTool:
    tool = MagicMock(spec=BaseTool)
    tool.name = name
    return tool


def _build_agent(tool_names: list[str]) -> MentionAgent:
    tools = [_make_tool(n) for n in tool_names]
    llm = MagicMock()
    return MentionAgent(llm=llm, tools=tools, conversation_id="conv-1")


def _research_tool_names(agent: MentionAgent) -> list[str]:
    """Extract the names of tools passed to the ReAct graph."""
    if agent._graph is None:
        return []
    # create_react_agent stores the bound tools on the llm; inspect via graph nodes
    # instead, access the graph's nodes → the tool_node holds the tools
    for _, node in agent._graph.nodes.items():
        if hasattr(node, "tools_by_name"):
            return list(node.tools_by_name.keys())
    return []


def test_send_ai_message_is_captured_as_send_tool() -> None:
    agent = _build_agent(["readRecentMessages", SEND_AI_MESSAGE_TOOL_NAME])
    assert agent._send_tool is not None
    assert agent._send_tool.name == SEND_AI_MESSAGE_TOOL_NAME


def test_send_text_message_is_excluded_from_research_tools() -> None:
    """sendTextMessage must NOT appear in the ReAct research tool list."""
    agent = _build_agent(
        ["readRecentMessages", SEND_TEXT_MESSAGE_TOOL_NAME, SEND_AI_MESSAGE_TOOL_NAME]
    )
    research_names = _research_tool_names(agent)
    assert SEND_TEXT_MESSAGE_TOOL_NAME not in research_names


def test_send_ai_message_is_excluded_from_research_tools() -> None:
    """sendAiMessage must NOT appear in the ReAct research tool list (delivery is deterministic)."""
    agent = _build_agent(
        ["readRecentMessages", SEND_TEXT_MESSAGE_TOOL_NAME, SEND_AI_MESSAGE_TOOL_NAME]
    )
    research_names = _research_tool_names(agent)
    assert SEND_AI_MESSAGE_TOOL_NAME not in research_names


def test_regular_tools_remain_in_research_tools() -> None:
    """Context/research tools must be preserved after partitioning."""
    tool_names = [
        "readRecentMessages",
        "getGroupInfo",
        "createGroupPoll",
        SEND_TEXT_MESSAGE_TOOL_NAME,
        SEND_AI_MESSAGE_TOOL_NAME,
    ]
    agent = _build_agent(tool_names)
    research_names = _research_tool_names(agent)
    for name in ["readRecentMessages", "getGroupInfo", "createGroupPoll"]:
        assert name in research_names


@pytest.mark.asyncio
async def test_missing_send_ai_message_tool_logs_warning(
    caplog: pytest.LogCaptureFixture,
) -> None:
    """If sendAiMessage is absent, agent should warn but not raise."""
    import logging

    with caplog.at_level(logging.WARNING, logger="app.agents.mention_agent"):
        agent = _build_agent(["readRecentMessages"])
    assert agent._send_tool is None
    assert any("sendAiMessage" in record.message for record in caplog.records)
