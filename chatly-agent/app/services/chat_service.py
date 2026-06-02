import logging
from collections.abc import AsyncIterator
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from langchain_core.messages import (
    AIMessage,
    AIMessageChunk,
    BaseMessage,
    HumanMessage,
)
from langchain_core.tools import BaseTool
from langchain_groq import ChatGroq
from minio import Minio

from app.agents.chatbot_agent import ChatbotAgent
from app.agents.group_agent import GroupAgent
from app.agents.social_agent import SocialAgent
from app.agents.tool_selection import SEND_AI_MESSAGE_TOOL_NAME
from app.agents.unified_agent import UnifiedAgent
from app.models.chat import ChatInput, ChatRequest, ChatResponse
from app.models.stream import (
    done_event,
    error_event,
    token_event,
    tool_end_event,
    tool_start_event,
)
from app.repositories.file_repo import FileRepository
from app.repositories.message_repo import MessageRepository
from app.services.group_action_service import handle_explicit_group_action
from app.services.session_service import SessionService
from app.services.system_mcp import SystemMCPService
from app.services.tool_service import ToolService
from app.services.vector_service import VectorService
from app.tools.image_gen_tool import create_image_gen_tools, image_gen_available
from app.tools.retriever_tool import create_retriever_tool

logger = logging.getLogger(__name__)

RATE_LIMIT_PATTERNS = (
    "rate limit",
    "too many requests",
    "quota exceeded",
    "429",
)
TIMEOUT_PATTERNS = (
    "timeout",
    "timed out",
    "deadline exceeded",
)
MAX_MODEL_HISTORY_MESSAGES = 12
MAX_MODEL_HISTORY_MESSAGE_CHARS = 4000
TRUNCATED_HISTORY_SUFFIX = "\n\n[Earlier content truncated to fit model limits.]"
LOCAL_TIMEZONE = ZoneInfo("Asia/Ho_Chi_Minh")


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
        self._system_mcp = system_mcp

    async def _resolve_attachments(
        self,
        session_id: str,
        file_ids: list[str],
    ) -> list[dict[str, Any]]:
        """Return attachment metadata for file IDs within the session."""
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
        platform_tools: list[BaseTool] | None = None,
    ) -> ChatbotAgent | UnifiedAgent:
        """
        Agent selection priority:
        1. Tools available (MCP or web search) OR session has file context OR
           extra_tools present (e.g. image gen) → UnifiedAgent
        2. Fallback → ChatbotAgent
        """
        tools: list[BaseTool] = list(platform_tools) if platform_tools else []
        if platform_tools is None and self._tool_service:
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
                all_tools.append(
                    create_retriever_tool(
                        self._vector_service,
                        session_id,
                        conversation_id=context_conversation_id,
                    )
                )
            all_tools.extend(merged_extra)
            logger.info(
                "Agent selected: UnifiedAgent "
                "(tools=%d has_context=%s) user_id=%s session_id=%s",
                len(all_tools),
                has_context,
                user_id,
                session_id,
            )
            return UnifiedAgent(llm=self._llm, tools=all_tools)

        logger.info(
            "Agent selected: ChatbotAgent "
            "(no tools, no context) user_id=%s session_id=%s",
            user_id,
            session_id,
        )
        return self._chatbot_agent

    def _to_langchain_history(self, rows: list[dict[str, Any]]) -> list[BaseMessage]:
        """Convert persisted message rows into LangChain message objects."""
        history: list[BaseMessage] = []
        recent_rows = rows[-MAX_MODEL_HISTORY_MESSAGES:]
        for row in recent_rows:
            role = str(row.get("role", ""))
            content = self._trim_history_content(str(row.get("content", "")))
            if role == "assistant":
                history.append(AIMessage(content=content))
            else:
                history.append(HumanMessage(content=content))
        return history

    def _trim_history_content(self, content: str) -> str:
        """Cap persisted message content before it is sent back to the model."""
        if len(content) <= MAX_MODEL_HISTORY_MESSAGE_CHARS:
            return content
        keep_chars = MAX_MODEL_HISTORY_MESSAGE_CHARS - len(TRUNCATED_HISTORY_SUFFIX)
        return content[:keep_chars].rstrip() + TRUNCATED_HISTORY_SUFFIX

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
            local_now = datetime.now(LOCAL_TIMEZONE)
            parts.append(
                f"\n\n## Active Conversation Context\n"
                "You are currently assisting inside conversation ID: "
                f"`{context_conversation_id}`.\n"
                "Current local datetime: "
                f"{local_now.isoformat(timespec='minutes')} "
                "(Asia/Ho_Chi_Minh). Use this to resolve relative dates like "
                "'today', 'tomorrow', 'hôm nay', and 'ngày mai'.\n"
                "When the user says 'this group', 'here', 'this conversation', "
                "or similar, they are referring to conversation ID: "
                f"`{context_conversation_id}`.\n"
                "Use `getConversationInfo` or `getGroupInfo` to fetch details "
                "when needed.\n"
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

    async def _send_group_action_response(
        self,
        tools: list[BaseTool],
        conversation_id: str,
        content: str,
    ) -> None:
        """Publish a deterministic group action confirmation."""
        send_tool = next(
            (tool for tool in tools if tool.name == SEND_AI_MESSAGE_TOOL_NAME),
            None,
        )
        if send_tool is None:
            logger.error(
                "No sendAiMessage tool available for group action response "
                "conversation=%s",
                conversation_id,
            )
            return
        await send_tool.ainvoke(
            {
                "conversationId": conversation_id,
                "content": content,
            }
        )

    def _classify_stream_error(
        self,
        exc: Exception,
    ) -> tuple[str, str, str, bool]:
        """Classify agent/runtime exceptions into a stable client error payload."""
        error_type = type(exc).__name__.lower()
        message = str(exc).lower()
        signature = f"{error_type} {message}"

        if any(pattern in signature for pattern in RATE_LIMIT_PATTERNS):
            return (
                "Model rate limit reached. Please retry in a moment.",
                "MODEL_RATE_LIMIT",
                "rate_limit",
                True,
            )

        if isinstance(exc, TimeoutError) or any(
            pattern in signature for pattern in TIMEOUT_PATTERNS
        ):
            return (
                "Model request timed out. Please try again.",
                "MODEL_TIMEOUT",
                "timeout",
                True,
            )

        provider_keywords = (
            "groq",
            "openai",
            "anthropic",
            "provider",
            "apierror",
            "service unavailable",
            "bad gateway",
        )
        if any(keyword in signature for keyword in provider_keywords):
            return (
                "Model provider is temporarily unavailable. Please retry later.",
                "MODEL_PROVIDER_ERROR",
                "provider_error",
                True,
            )

        return (
            "The agent could not generate a response right now. Please try again.",
            "AGENT_INTERNAL_ERROR",
            "internal_error",
            True,
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
        image_tools = self._build_image_tools(
            user_id, session_id, generated_attachments
        )
        platform_tools: list[BaseTool] = []
        if self._tool_service:
            platform_tools = await self._tool_service.assemble_tools(
                user_id,
                request.mcp_server_ids,
                request.use_web_search,
            )

        session_context = await self._build_session_context(
            user_id, session_id, context_conversation_id=conv_id
        )

        attachments = await self._resolve_attachments(session_id, request.file_ids)
        await self._message_repo.create_message(
            session_id,
            "user",
            request.message,
            attachments=attachments,
        )
        all_tools = [*platform_tools, *image_tools]
        if conv_id is not None:
            action = await handle_explicit_group_action(
                all_tools,
                request.message,
                conv_id,
            )
            if action is not None:
                assistant = await self._message_repo.create_message(
                    session_id,
                    "assistant",
                    action.content,
                    attachments=None,
                )
                return ChatResponse(
                    content=action.content,
                    session_id=session_id,
                    message_id=str(assistant["id"]),
                    agent_type="group_action",
                )

        agent = await self._select_agent(
            user_id,
            session_id,
            request.mcp_server_ids,
            request.use_web_search,
            extra_tools=image_tools,
            context_conversation_id=conv_id,
            platform_tools=platform_tools,
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

    async def stream_chat(
        self,
        user_id: str,
        session_id: str,
        request: ChatRequest,
    ) -> AsyncIterator[str]:
        """Stream chat response in SSE format and persist final assistant text."""
        session = await self._session_service.get_session(user_id, session_id)
        conv_id: str | None = session.get("context_conversation_id")

        rows = await self._message_repo.find_by_session(session_id)
        history = self._to_langchain_history(rows)

        generated_attachments: list[dict[str, Any]] = []
        image_tools = self._build_image_tools(
            user_id, session_id, generated_attachments
        )
        platform_tools: list[BaseTool] = []
        if self._tool_service:
            platform_tools = await self._tool_service.assemble_tools(
                user_id,
                request.mcp_server_ids,
                request.use_web_search,
            )

        session_context = await self._build_session_context(
            user_id, session_id, context_conversation_id=conv_id
        )

        attachments = await self._resolve_attachments(session_id, request.file_ids)
        await self._message_repo.create_message(
            session_id,
            "user",
            request.message,
            attachments=attachments,
        )
        all_tools = [*platform_tools, *image_tools]
        if conv_id is not None:
            action = await handle_explicit_group_action(
                all_tools,
                request.message,
                conv_id,
            )
            if action is not None:
                assistant = await self._message_repo.create_message(
                    session_id,
                    "assistant",
                    action.content,
                    attachments=None,
                )
                yield token_event(action.content)
                yield done_event("group_action", str(assistant["id"]), None)
                return

        agent = await self._select_agent(
            user_id,
            session_id,
            request.mcp_server_ids,
            request.use_web_search,
            extra_tools=image_tools,
            context_conversation_id=conv_id,
            platform_tools=platform_tools,
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
                    tool_input = (
                        raw_input
                        if isinstance(raw_input, dict)
                        else {"input": str(raw_input)}
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
        except Exception as exc:
            logger.exception(
                "Streaming error for user_id=%s session_id=%s", user_id, session_id
            )
            err_message, err_code, err_category, retryable = (
                self._classify_stream_error(exc)
            )
            yield error_event(
                message=err_message,
                code=err_code,
                category=err_category,
                retryable=retryable,
            )
            return

        assistant = await self._message_repo.create_message(
            session_id,
            "assistant",
            full_content[0],
            attachments=generated_attachments or None,
        )
        yield done_event(
            agent_type, str(assistant["id"]), generated_attachments or None
        )

    # ── Group @AI Mention ────────────────────────────────────────────

    async def run_group_assist(
        self,
        user_id: str,
        session_id: str,
        conversation_id: str,
        content: str,
    ) -> None:
        """Handle an @AI mention in a group conversation.

        Creates a :class:`GroupAgent` that gathers context, performs group
        actions when requested, generates a response, and deterministically delivers it
        to the group via ``sendAiMessage``.
        """
        rows = await self._message_repo.find_by_session(session_id)
        history = self._to_langchain_history(rows)

        session_context = await self._build_session_context(
            user_id,
            session_id,
            context_conversation_id=conversation_id,
        )

        generated_attachments: list[dict[str, Any]] = []
        image_tools = self._build_image_tools(
            user_id,
            session_id,
            generated_attachments,
        )

        # Assemble MCP tools (full set — GroupAgent partitions internally).
        tools: list[BaseTool] = []
        if self._tool_service:
            tools = await self._tool_service.assemble_tools(user_id, [], True)
        tools.extend(image_tools)
        logger.info(
            "Group assist assembled tools: count=%d names=%s",
            len(tools),
            [tool.name for tool in tools],
        )

        if self._llm is None:
            raise ValueError("LLM is required for GroupAgent")

        await self._message_repo.create_message(session_id, "user", content)
        action = await handle_explicit_group_action(
            tools,
            content,
            conversation_id,
        )
        if action is not None:
            await self._send_group_action_response(
                tools,
                conversation_id,
                action.content,
            )
            await self._message_repo.create_message(
                session_id,
                "assistant",
                action.content,
            )
            return

        agent = GroupAgent(
            llm=self._llm,
            tools=tools,
            conversation_id=conversation_id,
            generated_attachments=generated_attachments,
        )

        response_text = await agent.run(
            message=content,
            user_id=user_id,
            session_context=session_context,
            history=history,
        )
        await self._message_repo.create_message(session_id, "assistant", response_text)

    async def run_social_mention_assist(
        self,
        *,
        user_id: str,
        post_id: str,
        comment_id: str,
        content: str,
        mention_command: str,
        post_context: str,
        thread_context: str,
    ) -> None:
        """Handle stateless social mention-in-comment flow and publish AI reply."""
        session_context = (
            "\n\n## Active Social Context\n"
            f"You are assisting on post ID: `{post_id}`.\n"
            f"Mentioned comment ID: `{comment_id}`.\n"
        )

        generated_attachments: list[dict[str, Any]] = []
        image_tools = self._build_image_tools(
            user_id,
            f"social:post:{post_id}",
            generated_attachments,
        )

        tools: list[BaseTool] = []
        if self._tool_service:
            tools = await self._tool_service.assemble_tools(user_id, [], True)
        tools.extend(image_tools)
        logger.info(
            "Social post-command assist assembled tools: count=%d names=%s",
            len(tools),
            [tool.name for tool in tools],
        )

        if self._llm is None:
            raise ValueError("LLM is required for SocialAgent")

        agent = SocialAgent(
            llm=self._llm,
            tools=tools,
            generated_attachments=generated_attachments,
        )

        await agent.run_mention_in_comment(
            message=content,
            user_id=user_id,
            post_id=post_id,
            comment_id=comment_id,
            mention_command=mention_command,
            post_context=post_context,
            thread_context=thread_context,
            session_context=session_context,
            history=[],
        )

    async def run_social_post_command_assist(
        self,
        *,
        user_id: str,
        post_id: str,
        command_content: str,
        post_context: str,
        thread_context: str,
    ) -> None:
        """Handle stateless social post-command flow and publish AI reply."""
        session_context = (
            "\n\n## Active Social Context\n"
            f"You are assisting on post ID: `{post_id}`.\n"
            "The user intentionally posted an AI command.\n"
        )

        generated_attachments: list[dict[str, Any]] = []
        image_tools = self._build_image_tools(
            user_id,
            f"social:post:{post_id}",
            generated_attachments,
        )

        tools: list[BaseTool] = []
        if self._tool_service:
            tools = await self._tool_service.assemble_tools(user_id, [], True)
        tools.extend(image_tools)

        if self._llm is None:
            raise ValueError("LLM is required for SocialAgent")

        agent = SocialAgent(
            llm=self._llm,
            tools=tools,
            generated_attachments=generated_attachments,
        )

        await agent.run_post_command(
            message=command_content,
            user_id=user_id,
            post_id=post_id,
            post_context=post_context,
            thread_context=thread_context,
            session_context=session_context,
            history=[],
        )
