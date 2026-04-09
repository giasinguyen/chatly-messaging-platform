from functools import partial
from typing import Annotated, Protocol, TypedDict, cast

from langchain_core.messages import BaseMessage
from langchain_groq import ChatGroq
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages

from app.graphs.nodes.llm_node import llm_node


class ChatbotState(TypedDict):
    """State contract for chatbot graph."""

    messages: Annotated[list[BaseMessage], add_messages]


class CompiledChatbotGraph(Protocol):
    """Minimal protocol for compiled chatbot graph usage."""

    async def ainvoke(
        self,
        input: dict[str, list[BaseMessage | tuple[str, str]]],
        config: dict[str, dict[str, str]],
    ) -> dict[str, list[BaseMessage]]:
        """Invoke graph and return updated messages in state."""


def build_chatbot_graph(llm: ChatGroq) -> CompiledChatbotGraph:
    """Build chatbot graph with one LLM generation node."""
    graph = StateGraph(ChatbotState)
    graph.add_node("llm", partial(llm_node, llm=llm))
    graph.set_entry_point("llm")
    graph.add_edge("llm", END)
    return cast(CompiledChatbotGraph, graph.compile(checkpointer=MemorySaver()))
