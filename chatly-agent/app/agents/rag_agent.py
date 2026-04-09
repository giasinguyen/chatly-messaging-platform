import inspect
from collections.abc import AsyncIterator

from langchain_core.messages import AIMessageChunk, HumanMessage
from langchain_groq import ChatGroq

from app.graphs.rag_graph import build_rag_graph
from app.models.chat import ChatInput, ChatOutput
from app.prompts.rag import RAG_PROMPT
from app.services.vector_service import VectorService


class RagAgent:
    """RAG agent that answers using session file context."""

    def __init__(self, llm: ChatGroq, vector_service: VectorService) -> None:
        self._llm = llm
        self._vector_service = vector_service
        self._graph = build_rag_graph(llm, vector_service)

    def _build_run_config(self, session_id: str) -> dict[str, dict[str, str]]:
        """Build per-session LangGraph runtime config."""
        return {"configurable": {"thread_id": session_id}}

    async def ainvoke(self, input: ChatInput) -> ChatOutput:
        """Run one non-streaming RAG turn."""
        messages = [*input.history, HumanMessage(content=input.message)]
        result = await self._graph.ainvoke(
            {
                "query": input.message,
                "session_id": input.session_id,
                "context": [],
                "messages": messages,
            },
            config=self._build_run_config(input.session_id),
        )
        content = str(result["messages"][-1].content)
        return ChatOutput(
            content=content,
            session_id=input.session_id,
            message_id="",
            agent_type="rag",
        )

    async def astream(self, input: ChatInput) -> AsyncIterator[str]:
        """Run one streaming RAG turn."""
        chunks = await self._vector_service.similarity_search(
            query=input.message,
            session_id=input.session_id,
        )
        context = "\n\n".join(str(item.get("content", "")) for item in chunks)
        prompt_messages = RAG_PROMPT.format_messages(
            context=context,
            history=input.history,
            question=input.message,
        )
        stream = self._llm.astream(prompt_messages)
        if inspect.isawaitable(stream):
            stream = await stream
        async for chunk in stream:  # ty:ignore[not-iterable]
            if isinstance(chunk, AIMessageChunk) and chunk.content:
                yield str(chunk.content)
                continue
            text = getattr(chunk, "content", "")
            if text:
                yield str(text)
