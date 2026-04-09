from collections.abc import AsyncIterator
from unittest.mock import AsyncMock

import pytest
from langchain_core.messages import AIMessage

from app.agents.chatbot_agent import ChatbotAgent
from app.models.chat import ChatInput


async def _iter_tokens() -> AsyncIterator[AIMessage]:
    for token in ["Hel", "lo"]:
        yield AIMessage(content=token)


@pytest.mark.asyncio
async def test_ainvoke_returns_chat_output(monkeypatch: pytest.MonkeyPatch) -> None:
    graph = AsyncMock()
    graph.ainvoke.return_value = {"messages": [AIMessage(content="assistant reply")]}

    def _build_graph(_: AsyncMock) -> AsyncMock:
        return graph

    monkeypatch.setattr("app.agents.chatbot_agent.build_chatbot_graph", _build_graph)

    llm = AsyncMock()
    agent = ChatbotAgent(llm)

    result = await agent.ainvoke(
        ChatInput(message="hi", session_id="session-1", history=[])
    )

    assert result.content == "assistant reply"
    assert result.session_id == "session-1"
    assert result.agent_type == "chatbot"


@pytest.mark.asyncio
async def test_astream_yields_tokens(monkeypatch: pytest.MonkeyPatch) -> None:
    graph = AsyncMock()

    def _build_graph(_: AsyncMock) -> AsyncMock:
        return graph

    monkeypatch.setattr("app.agents.chatbot_agent.build_chatbot_graph", _build_graph)

    llm = AsyncMock()
    llm.astream.return_value = _iter_tokens()
    agent = ChatbotAgent(llm)

    chunks = [
        chunk
        async for chunk in agent.astream(
            ChatInput(message="hi", session_id="session-1", history=[])
        )
    ]

    assert chunks == ["Hel", "lo"]
