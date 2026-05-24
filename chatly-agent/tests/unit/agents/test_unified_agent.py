"""Unit tests for UnifiedAgent."""

from collections.abc import AsyncIterator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.messages import AIMessage, AIMessageChunk
from langchain_core.tools import BaseTool

from app.agents.unified_agent import UnifiedAgent
from app.models.chat import ChatInput


async def _iter_events() -> AsyncIterator[dict]:
    yield {
        "event": "on_chat_model_stream",
        "data": {"chunk": AIMessageChunk(content="Hel")},
    }
    yield {
        "event": "on_chat_model_stream",
        "data": {"chunk": AIMessageChunk(content="lo")},
    }


@pytest.mark.asyncio
async def test_ainvoke_returns_chat_output() -> None:
    graph = MagicMock()
    graph.ainvoke = AsyncMock(
        return_value={"messages": [AIMessage(content="unified reply")]}
    )
    fake_tool = MagicMock(spec=BaseTool)

    with patch("app.agents.unified_agent.create_react_agent", return_value=graph):
        llm = AsyncMock()
        agent = UnifiedAgent(llm=llm, tools=[fake_tool])
        result = await agent.ainvoke(
            ChatInput(
                message="hi", session_id="session-1", user_id="user-1", history=[]
            )
        )

    assert result.content == "unified reply"
    assert result.session_id == "session-1"
    assert result.agent_type == "unified"


@pytest.mark.asyncio
async def test_astream_events_delegates_to_graph() -> None:
    graph = MagicMock()
    graph.ainvoke = AsyncMock(return_value={"messages": []})
    graph.astream_events = MagicMock(return_value=_iter_events())
    fake_tool = MagicMock(spec=BaseTool)

    with patch("app.agents.unified_agent.create_react_agent", return_value=graph):
        llm = AsyncMock()
        agent = UnifiedAgent(llm=llm, tools=[fake_tool])
        events = [
            event
            async for event in agent.astream_events(
                ChatInput(
                    message="hi", session_id="session-1", user_id="user-1", history=[]
                ),
                config={"configurable": {"thread_id": "session-1"}},
            )
        ]

    assert len(events) == 2
    assert all(e["event"] == "on_chat_model_stream" for e in events)
    assert events[0]["data"]["chunk"].content == "Hel"
    assert events[1]["data"]["chunk"].content == "lo"
