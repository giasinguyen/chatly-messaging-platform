import json
import logging
from collections.abc import AsyncIterator
from typing import Any

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langchain_core.tools import BaseTool
from langchain_groq import ChatGroq

from app.agents.chatbot_agent import ChatbotAgent
from app.agents.unified_agent import UnifiedAgent
from app.models.chat import ChatInput, ChatRequest, ChatResponse
from app.repositories.file_repo import FileRepository
from app.repositories.message_repo import MessageRepository
from app.services.session_service import SessionService
from app.services.tool_service import ToolService
from app.services.vector_service import VectorService
from app.tools.retriever_tool import create_retriever_tool

logger = logging.getLogger(__name__)


class ChatService:
    """Business logic for chat invocation and streaming."""

    def __init__(
        self,
        session_service: SessionService,
        message_repo: MessageRepository,
        chatbot_agent: ChatbotAgent,
        vector_service: VectorService,
        tool_service: ToolService | None = None,
        llm: ChatGroq | None = None,
        file_repo: FileRepository | None = None,
    ) -> None:
        self._session_service = session_service
        self._message_repo = message_repo
        self._chatbot_agent = chatbot_agent
        self._vector_service = vector_service
        self._tool_service = tool_service
        self._llm = llm
        self._file_repo = file_repo

    async def _resolve_attachments(
        self,
        session_id: str,
        file_ids: list[str],
    ) -> list[dict[str, Any]]:
        """Return attachment metadata dicts for the given file IDs within the session."""
        if not file_ids or self._file_repo is None:
            return []
        rows = await self._file_repo.find_many_by_session_and_ids(session_id, file_ids)
        return [
            {
                "file_id": str(row.get("id", "")),
                "filename": str(row.get("filename", "")),
                "content_type": str(row.get("mime_type", "")),
                "size": int(row.get("size_bytes", 0)),
            }
            for row in rows
        ]

    async def _select_agent(
        self,
        user_id: str,
        session_id: str,
        mcp_server_ids: list[str],
        use_web_search: bool,
    ) -> ChatbotAgent | UnifiedAgent:
        """
        Agent selection priority:
        1. Tools available (MCP or web search) OR session has file context → UnifiedAgent
        2. Fallback → ChatbotAgent
        """
        tools: list[BaseTool] = []
        if self._tool_service:
            tools = await self._tool_service.assemble_tools(
                user_id, mcp_server_ids, use_web_search
            )

        has_context = await self._vector_service.has_context(session_id)

        if tools or has_context:
            if self._llm is None:
                raise ValueError("LLM is required for unified agent")
            all_tools = list(tools)
            if has_context:
                all_tools.append(create_retriever_tool(self._vector_service, session_id))
            logger.info(
                "Agent selected: UnifiedAgent (tools=%d has_context=%s) user_id=%s session_id=%s",
                len(all_tools),
                has_context,
                user_id,
                session_id,
            )
            return UnifiedAgent(llm=self._llm, tools=all_tools)

        logger.info(
            "Agent selected: ChatbotAgent (no tools, no context) user_id=%s session_id=%s",
            user_id,
            session_id,
        )
        return self._chatbot_agent

    def _to_langchain_history(self, rows: list[dict[str, Any]]) -> list[BaseMessage]:
        """Convert persisted message rows into LangChain message objects."""
        history: list[BaseMessage] = []
        for row in rows:
            role = str(row.get("role", ""))
            content = str(row.get("content", ""))
            if role == "assistant":
                history.append(AIMessage(content=content))
            else:
                history.append(HumanMessage(content=content))
        return history

    async def chat(
        self,
        user_id: str,
        session_id: str,
        request: ChatRequest,
    ) -> ChatResponse:
        """Run one full chat turn and persist both user and assistant messages."""
        await self._session_service.get_session(user_id, session_id)

        rows = await self._message_repo.find_by_session(session_id)
        history = self._to_langchain_history(rows)
        agent = await self._select_agent(
            user_id, session_id, request.mcp_server_ids, request.use_web_search
        )

        attachments = await self._resolve_attachments(session_id, request.file_ids)
        await self._message_repo.create_message(
            session_id,
            "user",
            request.message,
            attachments=attachments,
        )
        output = await agent.ainvoke(
            ChatInput(
                message=request.message,
                session_id=session_id,
                user_id=user_id,
                history=history,
            )
        )
        assistant = await self._message_repo.create_message(
            session_id,
            "assistant",
            output.content,
        )

        return ChatResponse(
            content=output.content,
            session_id=session_id,
            message_id=str(assistant["id"]),
            agent_type=output.agent_type,
        )

    async def stream_chat(
        self,
        user_id: str,
        session_id: str,
        request: ChatRequest,
    ) -> AsyncIterator[str]:
        """Stream chat response in SSE format and persist final assistant text."""
        await self._session_service.get_session(user_id, session_id)

        rows = await self._message_repo.find_by_session(session_id)
        history = self._to_langchain_history(rows)
        agent = await self._select_agent(
            user_id, session_id, request.mcp_server_ids, request.use_web_search
        )
        agent_type = agent.agent_type

        attachments = await self._resolve_attachments(session_id, request.file_ids)
        await self._message_repo.create_message(
            session_id,
            "user",
            request.message,
            attachments=attachments,
        )

        chunks: list[str] = []
        async for token in agent.astream(
            ChatInput(
                message=request.message,
                session_id=session_id,
                user_id=user_id,
                history=history,
            )
        ):
            chunks.append(token)
            yield f"data: {json.dumps({'token': token})}\n\n"

        full_response = "".join(chunks)
        await self._message_repo.create_message(
            session_id,
            "assistant",
            full_response,
        )
        yield f"data: {json.dumps({'done': True, 'agent_type': agent_type})}\n\n"
