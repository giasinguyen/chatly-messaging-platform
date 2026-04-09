"""ReAct tool-calling graph using LangGraph's prebuilt create_react_agent."""
from langchain_core.tools import BaseTool
from langchain_groq import ChatGroq
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent


def build_tool_graph(llm: ChatGroq, tools: list[BaseTool]):  # type: ignore[return]
    """
    Build a ReAct agent that can call the provided *tools*.

    The graph is compiled with an in-process MemorySaver so that conversation
    history is preserved per thread_id (session_id).
    """
    return create_react_agent(llm, tools, checkpointer=MemorySaver())
