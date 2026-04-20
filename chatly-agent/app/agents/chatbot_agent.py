from collections.abc import AsyncIterator
from typing import Any

from langchain_core.messages import AIMessageChunk, HumanMessage, SystemMessage
from langchain_groq import ChatGroq

from app.agents.base import BaseAgent
from app.graphs.chatbot_graph import build_chatbot_graph
from app.models.chat import ChatInput, ChatOutput
from app.prompts.system_prompt import CHATLY_SYSTEM_PROMPT


class ChatbotAgent(BaseAgent):
    """Conversational chatbot backed by LangGraph and ChatGroq."""

    def __init__(self, llm: ChatGroq) -> None:
        self._llm = llm
        self._graph = build_chatbot_graph(llm)
        self.agent_type: str = "chatbot"

    def _build_run_config(self, session_id: str) -> dict[str, dict[str, str]]:
        """Build per-session LangGraph runtime config."""
        return {"configurable": {"thread_id": session_id}}

    def _build_messages(self, input: ChatInput) -> list[Any]:
        """Prepend system prompt then history, then current user turn."""
        return [
            SystemMessage(content=CHATLY_SYSTEM_PROMPT),
            *input.history,
            HumanMessage(content=input.message),
        ]

    async def ainvoke(
        self, input: ChatInput, config: dict[str, Any] | None = None
    ) -> ChatOutput:
        """Run full chatbot turn and return the final assistant message."""
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

    async def astream_events(
        self, input: ChatInput, config: dict[str, Any]
    ) -> AsyncIterator[dict[str, Any]]:
        """Yield on_chat_model_stream events wrapping each LLM token."""
        messages = self._build_messages(input)
        async for chunk in self._llm.astream(messages):
            if isinstance(chunk, AIMessageChunk) and chunk.content:
                yield {"event": "on_chat_model_stream", "data": {"chunk": chunk}}
