"""Unified ReAct agent that handles tool use and RAG via a single graph."""
from collections.abc import AsyncIterator
from typing import Any

from langchain_core.messages import AIMessageChunk, HumanMessage
from langchain_core.tools import BaseTool
from langchain_groq import ChatGroq
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent

from app.models.chat import ChatInput, ChatOutput


class UnifiedAgent:
    """
    ReAct agent that handles both tool use and document retrieval.

    Accepts any mix of tools — MCP tools, web search, or retriever_tool.
    A fresh graph is built per-request via the factory so each call
    receives the correct tool set without cross-request contamination.
    """

    def __init__(self, llm: ChatGroq, tools: list[BaseTool]) -> None:
        self._llm = llm
        self._tools = tools
        self._graph = create_react_agent(llm, tools, checkpointer=MemorySaver())
        self.agent_type: str = "unified"

    def _build_run_config(self, session_id: str) -> dict[str, dict[str, str]]:
        """Build per-session LangGraph runtime config."""
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
            agent_type=self.agent_type,
        )

    async def astream(self, input: ChatInput) -> AsyncIterator[str]:
        """Stream assistant response tokens from the ReAct graph."""
        messages: list[Any] = [*input.history, HumanMessage(content=input.message)]
        async for msg, _metadata in self._graph.astream(
            {"messages": messages},
            config=self._build_run_config(input.session_id),
            stream_mode="messages",
        ):
            if not isinstance(msg, AIMessageChunk) or not msg.content:
                continue
            # Skip tool-call chunks (only yield final text tokens)
            if msg.tool_calls or msg.tool_call_chunks:
                continue
            yield str(msg.content)
