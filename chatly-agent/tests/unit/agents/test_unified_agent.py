"""Unit tests for UnifiedAgent."""
from collections.abc import AsyncIterator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.messages import AIMessage, AIMessageChunk
from langchain_core.tools import BaseTool

from app.agents.unified_agent import UnifiedAgent
from app.models.chat import ChatInput


async def _iter_chunks() -> AsyncIterator[dict]:
    yield {"messages": [AIMessageChunk(content="Hel")]}
    yield {"messages": [AIMessageChunk(content="lo")]}


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
            ChatInput(message="hi", session_id="session-1", history=[])
        )

    assert result.content == "unified reply"
    assert result.session_id == "session-1"
    assert result.agent_type == "unified"


@pytest.mark.asyncio
async def test_astream_yields_tokens() -> None:
    graph = MagicMock()
    graph.ainvoke = AsyncMock(return_value={"messages": []})
    graph.astream = MagicMock(return_value=_iter_chunks())
    fake_tool = MagicMock(spec=BaseTool)

    with patch("app.agents.unified_agent.create_react_agent", return_value=graph):
        llm = AsyncMock()
        agent = UnifiedAgent(llm=llm, tools=[fake_tool])
        chunks = [
            chunk
            async for chunk in agent.astream(
                ChatInput(message="hi", session_id="session-1", history=[])
            )
        ]

    assert chunks == ["Hel", "lo"]
