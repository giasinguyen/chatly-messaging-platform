from collections.abc import AsyncIterator
from typing import Any

from langchain_core.messages import AIMessageChunk, HumanMessage
from langchain_groq import ChatGroq

from app.graphs.chatbot_graph import build_chatbot_graph
from app.models.chat import ChatInput, ChatOutput


class ChatbotAgent:
    """Conversational chatbot backed by LangGraph and ChatGroq."""

    def __init__(self, llm: ChatGroq) -> None:
        self._llm = llm
        self._graph = build_chatbot_graph(llm)
        self.agent_type: str = "chatbot"

    def _build_run_config(self, session_id: str) -> dict[str, dict[str, str]]:
        """Build per-session LangGraph runtime config."""
        return {"configurable": {"thread_id": session_id}}

    async def ainvoke(self, input: ChatInput) -> ChatOutput:
        """Run full chatbot turn and return the final assistant message."""
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
        """Stream assistant response as token chunks."""
        messages: list[Any] = [*input.history, HumanMessage(content=input.message)]
        async for chunk in self._llm.astream(messages):
            if isinstance(chunk, AIMessageChunk) and chunk.content:
                yield str(chunk.content)
                continue
            text = getattr(chunk, "content", "")
            if text:
                yield str(text)
