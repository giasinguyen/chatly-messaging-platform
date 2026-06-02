"""Unified ReAct agent that handles tool use and RAG via a single graph."""

import warnings
from collections.abc import AsyncIterator
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import BaseTool
from langchain_groq import ChatGroq

with warnings.catch_warnings():
    warnings.simplefilter("ignore")
    from langgraph.prebuilt import create_react_agent

from app.agents.base import BaseAgent
from app.models.chat import ChatInput, ChatOutput
from app.prompts.system_prompt import UNIFIED_AGENT_SYSTEM_PROMPT


class UnifiedAgent(BaseAgent):
    """ReAct agent that handles tool use and document retrieval.

    A fresh graph is built per-request so each call receives the correct
    tool set without cross-request contamination. History is injected
    explicitly from MongoDB on every turn.
    """

    def __init__(
        self,
        llm: ChatGroq,
        tools: list[BaseTool],
    ) -> None:
        self._llm = llm
        self._tools = tools
        self._graph = create_react_agent(llm, tools)
        self.agent_type: str = "unified"

    def _build_messages(self, input: ChatInput) -> list[Any]:
        system = SystemMessage(
            content=UNIFIED_AGENT_SYSTEM_PROMPT.format(
                user_id=input.user_id,
                session_context=input.session_context,
            )
        )
        return [system, *input.history, HumanMessage(content=input.message)]

    async def ainvoke(
        self, input: ChatInput, config: dict[str, Any] | None = None
    ) -> ChatOutput:
        """Run a full ReAct turn and return the final assistant message."""
        _config = config or {"configurable": {"thread_id": input.session_id}}
        result = await self._graph.ainvoke(
            {"messages": self._build_messages(input)},
            config=_config,
        )
        content = str(result["messages"][-1].content)
        return ChatOutput(
            content=content,
            session_id=input.session_id,
            agent_type=self.agent_type,
        )

    async def astream_events(
        self, input: ChatInput, config: dict[str, Any]
    ) -> AsyncIterator[dict[str, Any]]:
        """Delegate to the LangGraph graph's astream_events v2."""
        async for event in self._graph.astream_events(
            {"messages": self._build_messages(input)},
            config=config,
            version="v2",
        ):
            yield event
