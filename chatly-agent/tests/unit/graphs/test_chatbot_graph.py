from typing import Any

import pytest
from langchain_core.messages import AIMessage

from app.graphs.chatbot_graph import build_chatbot_graph


class FakeLLM:
    async def ainvoke(self, messages: list[Any]) -> AIMessage:
        last = messages[-1]
        return AIMessage(content=f"echo:{last.content}")


@pytest.mark.asyncio
async def test_graph_returns_llm_response() -> None:
    graph = build_chatbot_graph(FakeLLM())

    result = await graph.ainvoke(
        {"messages": [("human", "hello")]},
        config={"configurable": {"thread_id": "thread-1"}},
    )

    assert result["messages"][-1].content == "echo:hello"


@pytest.mark.asyncio
async def test_graph_keeps_state_isolated_by_thread_id() -> None:
    graph = build_chatbot_graph(FakeLLM())

    result_a = await graph.ainvoke(
        {"messages": [("human", "alpha")]},
        config={"configurable": {"thread_id": "thread-a"}},
    )
    result_b = await graph.ainvoke(
        {"messages": [("human", "beta")]},
        config={"configurable": {"thread_id": "thread-b"}},
    )

    assert result_a["messages"][-1].content == "echo:alpha"
    assert result_b["messages"][-1].content == "echo:beta"
