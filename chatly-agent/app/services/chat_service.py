import asyncio
import logging
from collections.abc import AsyncIterator
from typing import Any

from langchain_core.messages import AIMessageChunk, AIMessage, BaseMessage, HumanMessage, ToolMessage
from langchain_core.tools import BaseTool
from langchain_groq import ChatGroq
from minio import Minio

from app.config import settings
from app.services.system_mcp import SystemMCPService

from app.agents.chatbot_agent import ChatbotAgent
from app.agents.mention_agent import MentionAgent
from app.agents.unified_agent import UnifiedAgent
from app.models.chat import ChatInput, ChatRequest, ChatResponse, ResumeRequest, SessionStatusResponse
from app.models.stream import (
    done_event,
    error_event,
    interrupt_event,
    token_event,
    tool_end_event,
    tool_start_event,
)
from app.repositories.file_repo import FileRepository
from app.repositories.interrupt_repository import InterruptRepository
from app.repositories.message_repo import MessageRepository
from app.services.session_service import SessionService
from app.services.tool_service import ToolService
from app.services.vector_service import VectorService
from app.tools.image_gen_tool import create_image_gen_tools, image_gen_available
from app.tools.retriever_tool import create_retriever_tool
from app.tools.tool_config import is_sensitive

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
        minio_client: Minio | None = None,
        bucket_name: str = "uploads",
        checkpointer: Any | None = None,
        interrupt_repo: InterruptRepository | None = None,
        system_mcp: SystemMCPService | None = None,
    ) -> None:
        self._session_service = session_service
        self._message_repo = message_repo
        self._chatbot_agent = chatbot_agent
        self._vector_service = vector_service
        self._tool_service = tool_service
        self._llm = llm
        self._file_repo = file_repo
        self._minio_client = minio_client
        self._bucket_name = bucket_name
        self._checkpointer = checkpointer
        self._interrupt_repo = interrupt_repo
        self._system_mcp = system_mcp

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
        extra_tools: list[BaseTool] | None = None,
        context_conversation_id: str | None = None,
    ) -> ChatbotAgent | UnifiedAgent:
        """
        Agent selection priority:
        1. Tools available (MCP or web search) OR session has file context OR
           extra_tools present (e.g. image gen) → UnifiedAgent
        2. Fallback → ChatbotAgent
        """
        tools: list[BaseTool] = []
        if self._tool_service:
            tools = await self._tool_service.assemble_tools(
                user_id, mcp_server_ids, use_web_search
            )

        has_context = await self._vector_service.has_context(
            session_id, conversation_id=context_conversation_id
        )
        merged_extra = list(extra_tools) if extra_tools else []

        if tools or has_context or merged_extra:
            if self._llm is None:
                raise ValueError("LLM is required for unified agent")
            all_tools = list(tools)
            if has_context:
                all_tools.append(create_retriever_tool(
                    self._vector_service, session_id,
                    conversation_id=context_conversation_id,
                ))
            all_tools.extend(merged_extra)
            logger.info(
                "Agent selected: UnifiedAgent (tools=%d has_context=%s) user_id=%s session_id=%s",
                len(all_tools),
                has_context,
                user_id,
                session_id,
            )
            return UnifiedAgent(llm=self._llm, tools=all_tools, checkpointer=self._checkpointer)

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

    async def _build_session_context(
        self,
        user_id: str,
        session_id: str,
        context_conversation_id: str | None = None,
    ) -> str:
        """Build a runtime context block injected verbatim into the system prompt.

        Includes:
        - Chatly platform skill instructions fetched from backend MCP resources
          (cached per process with a 5-minute TTL).
        - Active conversation context when the session is linked to a group/DM.
        - List of files uploaded in this session (when present).
        """
        parts: list[str] = []

        if self._system_mcp is not None:
            skill_context = await self._system_mcp.get_skill_context(user_id)
            if skill_context:
                parts.append(skill_context)

        if context_conversation_id is not None:
            parts.append(
                f"\n\n## Active Conversation Context\n"
                f"You are currently assisting inside conversation ID: `{context_conversation_id}`.\n"
                f"When the user says 'this group', 'here', 'this conversation', or similar, "
                f"they are referring to conversation ID: `{context_conversation_id}`.\n"
                f"Use `getConversationInfo` or `getGroupInfo` to fetch details when needed.\n"
            )

        if self._file_repo is not None:
            files = await self._file_repo.find_by_session(session_id)
            if files:
                lines = []
                for row in files:
                    mime = str(row.get("mime_type", ""))
                    kind = "image" if mime.startswith("image/") else "document"
                    lines.append(
                        f"  - {row['filename']} [{kind}] (file_id: {row['id']})"
                    )
                parts.append(
                    "\nFiles uploaded in this session"
                    " (use the exact file_id when calling tools):\n"
                    + "\n".join(lines)
                    + "\n"
                )

        return "".join(parts)

    def _build_image_tools(
        self,
        user_id: str,
        session_id: str,
        generated_attachments: list[dict[str, Any]],
    ) -> list[BaseTool]:
        """Return image generation tools when all required deps are configured."""
        if (
            self._minio_client is None
            or self._file_repo is None
            or not image_gen_available()
        ):
            return []
        return create_image_gen_tools(
            minio_client=self._minio_client,
            bucket_name=self._bucket_name,
            file_repo=self._file_repo,
            user_id=user_id,
            session_id=session_id,
            generated_attachments=generated_attachments,
        )

    async def chat(
        self,
        user_id: str,
        session_id: str,
        request: ChatRequest,
    ) -> ChatResponse:
        """Run one full chat turn and persist both user and assistant messages."""
        session = await self._session_service.get_session(user_id, session_id)
        conv_id: str | None = session.get("context_conversation_id")

        rows = await self._message_repo.find_by_session(session_id)
        history = self._to_langchain_history(rows)

        generated_attachments: list[dict[str, Any]] = []
        image_tools = self._build_image_tools(user_id, session_id, generated_attachments)
        session_context, agent = await asyncio.gather(
            self._build_session_context(user_id, session_id, context_conversation_id=conv_id),
            self._select_agent(
                user_id, session_id, request.mcp_server_ids, request.use_web_search,
                extra_tools=image_tools,
                context_conversation_id=conv_id,
            ),
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
                session_context=session_context,
            )
        )
        assistant = await self._message_repo.create_message(
            session_id,
            "assistant",
            output.content,
            attachments=generated_attachments or None,
        )

        return ChatResponse(
            content=output.content,
            session_id=session_id,
            message_id=str(assistant["id"]),
            agent_type=output.agent_type,
        )

    async def _handle_tools_interrupt(
        self,
        graph: Any,
        config: dict[str, Any],
        session_id: str,
        user_id: str,
        request: ChatRequest,
        accumulated_content: str,
        generated_attachments: list[dict[str, Any]],
    ) -> AsyncIterator[str]:
        """Handle a graph pause at interrupt_before=['tools'].

        Yields SSE strings. Two outcomes:
        - ALL pending tool calls are safe → auto-resume, continue streaming,
          persist assistant message, yield done_event at the end.
        - ANY pending call is sensitive → save interrupt state to DB,
          yield interrupt_event, stop (no persist, no done_event).
        """
        state = await graph.aget_state(config)
        last_message = state.values["messages"][-1]
        pending_calls: list[dict[str, Any]] = getattr(last_message, "tool_calls", []) or []

        all_safe = bool(pending_calls) and all(
            not is_sensitive(tc["name"]) for tc in pending_calls
        )

        if all_safe:
            full_content = [accumulated_content]
            try:
                async for event in graph.astream_events(None, config, version="v2"):
                    kind = event["event"]
                    if kind == "on_chat_model_stream":
                        chunk = event["data"].get("chunk")
                        if (
                            isinstance(chunk, AIMessageChunk)
                            and chunk.content
                            and not chunk.tool_call_chunks
                        ):
                            token = str(chunk.content)
                            full_content[0] += token
                            yield token_event(token)
                    elif kind == "on_tool_start":
                        tool_name = event.get("name", "")
                        raw_input = event["data"].get("input", {})
                        tool_input = raw_input if isinstance(raw_input, dict) else {"input": str(raw_input)}
                        yield tool_start_event(tool_name, tool_input)
                    elif kind == "on_tool_end":
                        tool_name = event.get("name", "")
                        raw_output = event["data"].get("output", "")
                        tool_output = (
                            str(raw_output.content)
                            if hasattr(raw_output, "content")
                            else str(raw_output)
                        )
                        yield tool_end_event(tool_name, tool_output)
            except Exception:
                logger.exception(
                    "Streaming error during auto-resume session_id=%s", session_id
                )
                yield error_event("An error occurred while generating the response")
                return

            # Check for another interrupt after auto-resume
            new_state = await graph.aget_state(config)
            if new_state.next and "tools" in new_state.next:
                async for sse in self._handle_tools_interrupt(
                    graph, config, session_id, user_id, request,
                    full_content[0], generated_attachments,
                ):
                    yield sse
                return

            # Auto-resume finished — persist and emit done
            assistant = await self._message_repo.create_message(
                session_id,
                "assistant",
                full_content[0],
                attachments=generated_attachments or None,
            )
            yield done_event("unified", str(assistant["id"]), generated_attachments or None)
        else:
            sensitive_calls = [tc for tc in pending_calls if is_sensitive(tc["name"])]
            target_calls = sensitive_calls if sensitive_calls else pending_calls
            first = target_calls[0]
            interrupt_data: dict[str, Any] = {
                "type": "confirm_tool",
                "tool_name": first["name"],
                "tool_input": first["args"],
                "message": f"Agent wants to run `{first['name']}`. Allow?",
                "all_pending": [
                    {"tool": tc["name"], "input": tc["args"]} for tc in target_calls
                ],
                "thread_id": session_id,
            }
            tool_config = {
                "mcp_server_ids": request.mcp_server_ids,
                "use_web_search": request.use_web_search,
                "file_ids": request.file_ids,
            }
            if self._interrupt_repo is not None:
                await self._interrupt_repo.create(
                    session_id=session_id,
                    user_id=user_id,
                    interrupt_data=interrupt_data,
                    tool_config=tool_config,
                )
            yield interrupt_event(interrupt_data)

    async def _resume_graph(
        self,
        graph: Any,
        config: dict[str, Any],
        session_id: str,
        user_id: str,
        request: ChatRequest,
        approved: bool,
    ) -> AsyncIterator[str]:
        """Resume a graph from an interrupt_before=['tools'] pause.

        If approved=True: resume normally (tools run as-is).
        If approved=False: inject ToolMessage rejections then resume so the LLM
            can respond without executing the sensitive tools.
        Yields SSE strings; handles chained interrupts.
        """
        if not approved:
            # Inject rejection ToolMessages so the graph skips the tools node
            state = await graph.aget_state(config)
            last_message = state.values["messages"][-1]
            pending_calls: list[dict[str, Any]] = (
                getattr(last_message, "tool_calls", []) or []
            )
            rejection_messages = [
                ToolMessage(
                    content=f"User rejected tool call: {tc['name']}",
                    tool_call_id=tc["id"],
                )
                for tc in pending_calls
            ]
            await graph.aupdate_state(
                config,
                {"messages": rejection_messages},
                as_node="tools",
            )

        full_content = [""]
        generated_attachments: list[dict[str, Any]] = []
        try:
            # Resume from checkpoint by passing None as input
            async for event in graph.astream_events(None, config, version="v2"):
                kind = event["event"]
                if kind == "on_chat_model_stream":
                    chunk = event["data"].get("chunk")
                    if (
                        isinstance(chunk, AIMessageChunk)
                        and chunk.content
                        and not chunk.tool_call_chunks
                    ):
                        token = str(chunk.content)
                        full_content[0] += token
                        yield token_event(token)
                elif kind == "on_tool_start":
                    tool_name = event.get("name", "")
                    raw_input = event["data"].get("input", {})
                    tool_input = (
                        raw_input if isinstance(raw_input, dict) else {"input": str(raw_input)}
                    )
                    yield tool_start_event(tool_name, tool_input)
                elif kind == "on_tool_end":
                    tool_name = event.get("name", "")
                    raw_output = event["data"].get("output", "")
                    tool_output = (
                        str(raw_output.content)
                        if hasattr(raw_output, "content")
                        else str(raw_output)
                    )
                    yield tool_end_event(tool_name, tool_output)
        except Exception:
            logger.exception(
                "Streaming error during resume session_id=%s", session_id
            )
            yield error_event("An error occurred while generating the response")
            return

        # Check for chained interrupt
        new_state = await graph.aget_state(config)
        if new_state.next and "tools" in new_state.next:
            async for sse in self._handle_tools_interrupt(
                graph, config, session_id, user_id, request,
                full_content[0], generated_attachments,
            ):
                yield sse
            return

        if full_content[0]:
            assistant = await self._message_repo.create_message(
                session_id,
                "assistant",
                full_content[0],
                attachments=generated_attachments or None,
            )
            yield done_event("unified", str(assistant["id"]), generated_attachments or None)

    async def stream_chat(
        self,
        user_id: str,
        session_id: str,
        request: ChatRequest,
    ) -> AsyncIterator[str]:
        """Stream chat response in SSE format and persist final assistant text."""
        # Guard: reject new messages while a HITL confirmation is pending
        if self._interrupt_repo is not None:
            existing = await self._interrupt_repo.get_pending(session_id)
            if existing is not None:
                yield error_event(
                    "Session is awaiting confirmation. Please approve or reject before sending a new message."
                )
                return

        session = await self._session_service.get_session(user_id, session_id)
        conv_id: str | None = session.get("context_conversation_id")

        rows = await self._message_repo.find_by_session(session_id)
        history = self._to_langchain_history(rows)

        generated_attachments: list[dict[str, Any]] = []
        image_tools = self._build_image_tools(user_id, session_id, generated_attachments)
        session_context, agent = await asyncio.gather(
            self._build_session_context(user_id, session_id, context_conversation_id=conv_id),
            self._select_agent(
                user_id, session_id, request.mcp_server_ids, request.use_web_search,
                extra_tools=image_tools,
                context_conversation_id=conv_id,
            ),
        )
        agent_type = agent.agent_type
        chat_input = ChatInput(
            message=request.message,
            session_id=session_id,
            user_id=user_id,
            history=history,
            session_context=session_context,
        )
        config = {"configurable": {"thread_id": session_id}}

        attachments = await self._resolve_attachments(session_id, request.file_ids)
        await self._message_repo.create_message(
            session_id,
            "user",
            request.message,
            attachments=attachments,
        )

        full_content = [""]
        try:
            async for event in agent.astream_events(chat_input, config):
                kind = event["event"]
                if kind == "on_chat_model_stream":
                    chunk = event["data"].get("chunk")
                    if (
                        isinstance(chunk, AIMessageChunk)
                        and chunk.content
                        and not chunk.tool_call_chunks
                    ):
                        token = str(chunk.content)
                        full_content[0] += token
                        yield token_event(token)
                elif kind == "on_tool_start":
                    tool_name = event.get("name", "")
                    raw_input = event["data"].get("input", {})
                    tool_input = raw_input if isinstance(raw_input, dict) else {"input": str(raw_input)}
                    yield tool_start_event(tool_name, tool_input)
                elif kind == "on_tool_end":
                    tool_name = event.get("name", "")
                    raw_output = event["data"].get("output", "")
                    tool_output = (
                        str(raw_output.content)
                        if hasattr(raw_output, "content")
                        else str(raw_output)
                    )
                    yield tool_end_event(tool_name, tool_output)
        except Exception:
            logger.exception(
                "Streaming error for user_id=%s session_id=%s", user_id, session_id
            )
            yield error_event("An error occurred while generating the response")
            return

        # Post-loop: detect interrupt_before=["tools"] pause for UnifiedAgent
        if isinstance(agent, UnifiedAgent) and self._checkpointer is not None:
            state = await agent._graph.aget_state(config)
            if state.next and "tools" in state.next:
                async for sse in self._handle_tools_interrupt(
                    agent._graph, config, session_id, user_id, request,
                    full_content[0], generated_attachments,
                ):
                    yield sse
                return

        assistant = await self._message_repo.create_message(
            session_id,
            "assistant",
            full_content[0],
            attachments=generated_attachments or None,
        )
        yield done_event(agent_type, str(assistant["id"]), generated_attachments or None)

    async def resume_stream(
        self,
        user_id: str,
        session_id: str,
        body: ResumeRequest,
    ) -> AsyncIterator[str]:
        """Resume a HITL-interrupted session and stream the continued response."""
        await self._session_service.get_session(user_id, session_id)

        if self._interrupt_repo is None:
            yield error_event("HITL is not enabled in this environment")
            return

        interrupt_doc = await self._interrupt_repo.get_pending(session_id)
        if interrupt_doc is None:
            yield error_event("No pending interrupt found or it has expired (24h TTL)")
            return

        tool_config = interrupt_doc.tool_config
        # Reconstruct the agent with the exact tool set from the original request
        agent = await self._select_agent(
            user_id,
            session_id,
            mcp_server_ids=tool_config.get("mcp_server_ids", []),
            use_web_search=bool(tool_config.get("use_web_search", False)),
            extra_tools=[],
        )

        if not isinstance(agent, UnifiedAgent):
            yield error_event("Interrupt resume is only supported for UnifiedAgent")
            return

        config = {"configurable": {"thread_id": session_id}}
        await self._interrupt_repo.resolve(session_id)

        request_placeholder = ChatRequest.model_construct(
            message="",
            mcp_server_ids=tool_config.get("mcp_server_ids", []),
            use_web_search=bool(tool_config.get("use_web_search", False)),
            file_ids=tool_config.get("file_ids", []),
        )
        async for sse in self._resume_graph(
            agent._graph, config, session_id, user_id, request_placeholder, body.approved
        ):
            yield sse

    async def get_session_status(
        self,
        user_id: str,
        session_id: str,
    ) -> SessionStatusResponse:
        """Return the current HITL status of a session."""
        await self._session_service.get_session(user_id, session_id)

        if self._interrupt_repo is None:
            return SessionStatusResponse(status="idle")

        interrupt_doc = await self._interrupt_repo.get_pending(session_id)
        if interrupt_doc is not None:
            return SessionStatusResponse(
                status="interrupted",
                interrupt_data=interrupt_doc.interrupt_data,
                interrupted_at=interrupt_doc.created_at,
            )
        return SessionStatusResponse(status="idle")

    # ── Group @AI Mention ────────────────────────────────────────────

    async def run_group_assist(
        self,
        user_id: str,
        session_id: str,
        conversation_id: str,
        content: str,
    ) -> None:
        """Handle an @AI mention in a group conversation.

        Creates a :class:`MentionAgent` that gathers context via read-only
        MCP tools, generates a response, and deterministically delivers it
        to the group via ``sendAiMessage``.
        """
        rows = await self._message_repo.find_by_session(session_id)
        history = self._to_langchain_history(rows)

        session_context = await self._build_session_context(
            user_id, session_id, context_conversation_id=conversation_id,
        )

        # Assemble MCP tools (full set — MentionAgent partitions internally).
        tools: list[BaseTool] = []
        if self._tool_service:
            tools = await self._tool_service.assemble_tools(user_id, [], False)

        if self._llm is None:
            raise ValueError("LLM is required for MentionAgent")

        agent = MentionAgent(
            llm=self._llm,
            tools=tools,
            conversation_id=conversation_id,
        )

        await self._message_repo.create_message(session_id, "user", content)
        response_text = await agent.run(
            message=content,
            user_id=user_id,
            session_context=session_context,
            history=history,
        )
        await self._message_repo.create_message(session_id, "assistant", response_text)
