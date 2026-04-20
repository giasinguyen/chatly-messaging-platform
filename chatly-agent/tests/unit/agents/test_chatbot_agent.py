from collections.abc import AsyncIterator
from unittest.mock import AsyncMock, MagicMock

import pytest
from langchain_core.messages import AIMessage, AIMessageChunk

from app.agents.chatbot_agent import ChatbotAgent
from app.models.chat import ChatInput


async def _iter_chunks() -> AsyncIterator[AIMessageChunk]:
    for token in ["Hel", "lo"]:
        yield AIMessageChunk(content=token)


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
        ChatInput(message="hi", session_id="session-1", user_id="user-1", history=[])
    )

    assert result.content == "assistant reply"
    assert result.session_id == "session-1"
    assert result.agent_type == "chatbot"


@pytest.mark.asyncio
async def test_astream_events_yields_token_events(monkeypatch: pytest.MonkeyPatch) -> None:
    graph = AsyncMock()

    def _build_graph(_: AsyncMock) -> AsyncMock:
        return graph

    monkeypatch.setattr("app.agents.chatbot_agent.build_chatbot_graph", _build_graph)

    llm = MagicMock()
    llm.astream = MagicMock(return_value=_iter_chunks())
    agent = ChatbotAgent(llm)

    events = [
        event
        async for event in agent.astream_events(
            ChatInput(message="hi", session_id="session-1", user_id="user-1", history=[]),
            config={"configurable": {"thread_id": "session-1"}},
        )
    ]

    assert len(events) == 2
    assert all(e["event"] == "on_chat_model_stream" for e in events)
    assert events[0]["data"]["chunk"].content == "Hel"
    assert events[1]["data"]["chunk"].content == "lo"
