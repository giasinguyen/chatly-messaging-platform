from functools import partial
from typing import Annotated, TypedDict

from langchain_core.messages import BaseMessage
from langchain_groq import ChatGroq
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages
from langgraph.graph.state import CompiledStateGraph

from app.graphs.nodes.llm_node import llm_node


class ChatbotState(TypedDict):
    """State contract for chatbot graph."""

    messages: Annotated[list[BaseMessage], add_messages]


def build_chatbot_graph(llm: ChatGroq) -> CompiledStateGraph:
    """Build chatbot graph with one LLM generation node."""
    graph = StateGraph(ChatbotState)
    graph.add_node("llm", partial(llm_node, llm=llm))
    graph.set_entry_point("llm")
    graph.add_edge("llm", END)
    return graph.compile(checkpointer=MemorySaver())
