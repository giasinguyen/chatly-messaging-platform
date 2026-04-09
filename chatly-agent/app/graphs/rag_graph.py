from functools import partial
from typing import Annotated, Any, Protocol, TypedDict, cast

from langchain_core.messages import BaseMessage
from langchain_groq import ChatGroq
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages

from app.graphs.nodes.retriever_node import retriever_node
from app.prompts.rag import RAG_PROMPT
from app.services.vector_service import VectorService


class RagState(TypedDict):
    """State contract for the RAG graph."""

    query: str
    session_id: str
    context: list[str]
    messages: Annotated[list[BaseMessage], add_messages]


class CompiledRagGraph(Protocol):
    """Minimal protocol for compiled RAG graph usage."""

    async def ainvoke(
        self,
        input: dict[str, Any],
        config: dict[str, dict[str, str]],
    ) -> dict[str, Any]:
        """Invoke graph and return state output."""


async def generate_node(state: RagState, llm: ChatGroq) -> dict[str, list[Any]]:
    """Generate assistant answer with retrieved context."""
    context = "\n\n".join(state.get("context", []))
    history = state.get("messages", [])[:-1]
    messages = RAG_PROMPT.format_messages(
        context=context,
        question=state.get("query", ""),
        history=history,
    )
    response = await llm.ainvoke(messages)
    return {"messages": [response]}


def build_rag_graph(llm: ChatGroq, vector_service: VectorService) -> CompiledRagGraph:
    """Build RAG graph with retrieve then generate steps."""
    graph = StateGraph(RagState)
    graph.add_node("retrieve", partial(retriever_node, vector_service=vector_service))
    graph.add_node("generate", partial(generate_node, llm=llm))
    graph.set_entry_point("retrieve")
    graph.add_edge("retrieve", "generate")
    graph.add_edge("generate", END)
    return cast(CompiledRagGraph, graph.compile(checkpointer=MemorySaver()))
