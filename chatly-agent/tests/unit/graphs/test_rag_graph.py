from unittest.mock import AsyncMock

import pytest
from langchain_core.messages import AIMessage, HumanMessage

from app.graphs.nodes.retriever_node import retriever_node
from app.graphs.rag_graph import build_rag_graph


@pytest.mark.asyncio
async def test_retriever_node_injects_context_from_vector_search() -> None:
    vector_service = AsyncMock()
    vector_service.similarity_search.return_value = [
        {"content": "first"},
        {"content": "second"},
    ]

    state = {
        "query": "What is this?",
        "session_id": "s1",
        "context": [],
        "messages": [HumanMessage(content="What is this?")],
    }

    result = await retriever_node(state, vector_service)

    assert result["context"] == ["first", "second"]


@pytest.mark.asyncio
async def test_rag_graph_returns_generated_answer() -> None:
    llm = AsyncMock()
    llm.ainvoke.return_value = AIMessage(content="Answer from context")

    vector_service = AsyncMock()
    vector_service.similarity_search.return_value = [{"content": "Context data"}]

    graph = build_rag_graph(llm=llm, vector_service=vector_service)

    result = await graph.ainvoke(
        {
            "query": "Question",
            "session_id": "s1",
            "context": [],
            "messages": [HumanMessage(content="Question")],
        },
        config={"configurable": {"thread_id": "s1"}},
    )

    assert result["messages"][-1].content == "Answer from context"
