"""Tool-calling agent backed by LangGraph ReAct graph."""
import inspect
from collections.abc import AsyncIterator
from typing import Any

from langchain_core.messages import AIMessageChunk, HumanMessage
from langchain_core.tools import BaseTool
from langchain_groq import ChatGroq

from app.graphs.tool_graph import build_tool_graph
from app.models.chat import ChatInput, ChatOutput


class ToolAgent:
    """
    ReAct agent that has access to one or more LangChain tools.

    A fresh graph is built per-request (via the factory) so that each call
    receives the correct tool set without cross-request contamination.
    """

    def __init__(self, llm: ChatGroq, tools: list[BaseTool]) -> None:
        self._llm = llm
        self._graph = build_tool_graph(llm, tools)

    def _build_run_config(self, session_id: str) -> dict[str, dict[str, str]]:
        return {"configurable": {"thread_id": session_id}}

    async def ainvoke(self, input: ChatInput) -> ChatOutput:
        """Run a full ReAct turn and return the final assistant message."""
        messages: list[Any] = [*input.history, HumanMessage(content=input.message)]
        result = await self._graph.ainvoke(
            {"messages": messages},
            config=self._build_run_config(input.session_id),
        )
        content = str(result["messages"][-1].content)
        return ChatOutput(
            content=content,
            session_id=input.session_id,
            message_id="",
            agent_type="tool",
        )

    async def astream(self, input: ChatInput) -> AsyncIterator[str]:
        """Stream assistant response tokens from the ReAct graph."""
        messages: list[Any] = [*input.history, HumanMessage(content=input.message)]
        stream = self._graph.astream(
            {"messages": messages},
            config=self._build_run_config(input.session_id),
            stream_mode="values",
        )
        if inspect.isawaitable(stream):
            stream = await stream
        async for chunk in stream:  # type: ignore[union-attr]
            last = chunk.get("messages", [])
            if not last:
                continue
            msg = last[-1]
            if isinstance(msg, AIMessageChunk) and msg.content:
                yield str(msg.content)
