"""Unified ReAct agent that handles tool use and RAG via a single graph."""
from collections.abc import AsyncIterator
from typing import Any

from langchain_core.messages import AIMessageChunk, HumanMessage, SystemMessage
from langchain_core.tools import BaseTool
from langchain_groq import ChatGroq
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent

from app.models.chat import ChatInput, ChatOutput

_SYSTEM_TEMPLATE = (
    "You are Chatly Assistant, an AI helper embedded in the Chatly messaging platform.\n"
    "The current user's ID is: {user_id}\n"
    "When the user asks about themselves (e.g. 'who am I', 'my profile', 'my info'), "
    "call getUserInfo with their exact user ID shown above.\n"
    "Always use the exact user ID provided — never guess or substitute placeholders."
)


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

    def _build_messages(self, input: ChatInput) -> list[Any]:
        system = SystemMessage(content=_SYSTEM_TEMPLATE.format(user_id=input.user_id))
        return [system, *input.history, HumanMessage(content=input.message)]

    async def ainvoke(self, input: ChatInput) -> ChatOutput:
        """Run a full ReAct turn and return the final assistant message."""
        result = await self._graph.ainvoke(
            {"messages": self._build_messages(input)},
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
        async for msg, _metadata in self._graph.astream(
            {"messages": self._build_messages(input)},
            config=self._build_run_config(input.session_id),
            stream_mode="messages",
        ):
            if not isinstance(msg, AIMessageChunk) or not msg.content:
                continue
            # Skip tool-call chunks (only yield final text tokens)
            if msg.tool_calls or msg.tool_call_chunks:
                continue
            yield str(msg.content)
