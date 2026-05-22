"""Agent for Social AI workflows on posts and comments.

Supported workflows:
1. Mention in comment: user mentions @ai in a post comment and expects a reply.
2. Post command: user writes an AI command in the post body.

Like MentionAgent, this agent separates delivery from reasoning:
- ReAct loop is used for context/research tools.
- A deterministic final step calls ``createAiPostComment`` to publish the AI reply.
"""

import logging
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.tools import BaseTool
from langchain_groq import ChatGroq
from langgraph.prebuilt import create_react_agent

logger = logging.getLogger(__name__)

PUBLISH_REQUIRED_FIELDS = {"postId", "content", "triggerType"}


def _tool_input_fields(tool: BaseTool) -> set[str]:
    args_schema = getattr(tool, "args_schema", None)
    if args_schema is None:
        return set()

    # create_mcp_tool builds a Pydantic model class as args_schema.
    fields = getattr(args_schema, "model_fields", None)
    if isinstance(fields, dict):
        return set(fields.keys())
    return set()


def _is_publish_comment_tool(tool: BaseTool) -> bool:
    input_fields = _tool_input_fields(tool)
    if PUBLISH_REQUIRED_FIELDS.issubset(input_fields):
        return True

    description = (getattr(tool, "description", "") or "").lower()
    return "ai-generated comment" in description and "social post" in description

SOCIAL_MENTION_SYSTEM_PROMPT = (
    "You are **Chatly AI**, responding to a user who mentioned @ai in a post comment thread.\n"
    "You are embedded in the Chatly social platform. Your role is to help users with questions,"
    " discussions, and tasks that arise in social post threads.\n\n"
    "Current user ID: {user_id}.\n"
    "Post ID: {post_id}.\n"
    "Parent comment ID: {comment_id}.\n"
    "Mention command: {mention_command}.\n\n"
    "## Provided context\n"
    "Post context:\n{post_context}\n\n"
    "Comment thread context:\n{thread_context}\n\n"
    "{session_context}"
    "## Workflow\n"
    "1. Use `getPostContext` to read the post topic (already provided above, skip if sufficient).\n"
    "2. Use `getPostComments` if you need more thread context.\n"
    "3. Compose a reply that directly addresses the user's mention.\n"
    "4. Call `createAiPostComment` with your reply, setting `parentCommentId` to {comment_id}.\n\n"
    "## Guardrails — MUST follow every response\n"
    "- **Language**: Mirror the language of the user's message exactly. Do not switch languages.\n"
    "- **Safety**: Refuse requests for harmful, hateful, violent, sexually explicit, or illegal content."
    " Reply politely: 'I can't help with that.'\n"
    "- **Privacy**: Never expose raw internal IDs, email addresses, phone numbers, or other PII in the published reply.\n"
    "- **Accuracy**: Do not fabricate facts, statistics, or citations. Say 'I'm not sure' when uncertain.\n"
    "- **Brevity**: Keep replies under 500 characters unless the user explicitly asks for detail.\n"
    "- **Identity**: You are Chatly AI. Do not impersonate any real person or claim to be human.\n"
    "- **Crisis**: If the message hints at self-harm or crisis, respond with empathy and refer to professional help.\n"
)

SOCIAL_POST_COMMAND_SYSTEM_PROMPT = (
    "You are **Chatly AI**, executing an AI command posted by the user on the Chatly social feed.\n"
    "You are embedded in the Chatly platform to help users get more value from posts.\n\n"
    "Current user ID: {user_id}.\n"
    "Post ID: {post_id}.\n\n"
    "## Provided context\n"
    "Post context:\n{post_context}\n\n"
    "Extra context:\n{thread_context}\n\n"
    "{session_context}"
    "## Workflow\n"
    "1. Read the post context above. Call `getPostContext` or `getPostComments` if you need more detail.\n"
    "2. Execute the command implied by the post (summarize, explain, translate, suggest, etc.).\n"
    "3. Call `createAiPostComment` with `triggerType = POST_COMMAND` and no `parentCommentId`.\n\n"
    "## Guardrails — MUST follow every response\n"
    "- **Language**: Mirror the language of the post content.\n"
    "- **Safety**: Decline politely if the command requests harmful, hateful, explicit, or illegal content.\n"
    "- **Accuracy**: Do not fabricate facts. If uncertain, state your assumption.\n"
    "- **Brevity**: Aim for a concise paragraph unless detail is explicitly needed.\n"
    "- **Identity**: You are Chatly AI. Do not claim to be human or impersonate any person.\n"
    "- **Privacy**: Do not expose internal IDs or PII in the published comment.\n"
)


class SocialAgent:
    """Dedicated agent for social mention and post-command workflows."""

    def __init__(
        self,
        llm: ChatGroq,
        tools: list[BaseTool],
    ) -> None:
        self._llm = llm
        self._send_tool: BaseTool | None = None
        research_tools: list[BaseTool] = []

        for tool in tools:
            if _is_publish_comment_tool(tool):
                self._send_tool = tool
            else:
                research_tools.append(tool)

        if self._send_tool is None:
            logger.warning(
                "createAiPostComment tool not found - social agent can generate text but cannot publish. "
                "available_tools=%s",
                [tool.name for tool in tools],
            )
        else:
            logger.info("SocialAgent publish tool resolved: %s", self._send_tool.name)

        self._graph = create_react_agent(llm, research_tools) if research_tools else None

    async def run_mention_in_comment(
        self,
        *,
        message: str,
        user_id: str,
        post_id: str,
        comment_id: str,
        mention_command: str,
        post_context: str,
        thread_context: str,
        session_context: str,
        history: list[Any] | None = None,
    ) -> str:
        """Generate and publish an AI reply for mention-in-comment flow."""
        system = SystemMessage(
            content=SOCIAL_MENTION_SYSTEM_PROMPT.format(
                user_id=user_id,
                post_id=post_id,
                comment_id=comment_id,
                mention_command=mention_command,
                post_context=post_context,
                thread_context=thread_context,
                session_context=session_context,
            )
        )
        ai_text = await self._generate_text(system, message, history)
        await self._publish_comment(
            post_id=post_id,
            content=ai_text,
            parent_comment_id=comment_id,
            trigger_type="MENTION_IN_COMMENT",
        )
        return ai_text

    async def run_post_command(
        self,
        *,
        message: str,
        user_id: str,
        post_id: str,
        post_context: str,
        thread_context: str,
        session_context: str,
        history: list[Any] | None = None,
    ) -> str:
        """Generate and publish an AI reply for post-command flow."""
        system = SystemMessage(
            content=SOCIAL_POST_COMMAND_SYSTEM_PROMPT.format(
                user_id=user_id,
                post_id=post_id,
                post_context=post_context,
                thread_context=thread_context,
                session_context=session_context,
            )
        )
        ai_text = await self._generate_text(system, message, history)
        await self._publish_comment(
            post_id=post_id,
            content=ai_text,
            parent_comment_id=None,
            trigger_type="POST_COMMAND",
        )
        return ai_text

    async def _generate_text(
        self,
        system_message: SystemMessage,
        user_message: str,
        history: list[Any] | None,
    ) -> str:
        messages = [system_message, *(history or []), HumanMessage(content=user_message)]

        if self._graph is not None:
            result = await self._graph.ainvoke(
                {"messages": messages},
                config={"configurable": {"thread_id": "social"}},
            )
            for message in reversed(result["messages"]):
                if isinstance(message, AIMessage) and message.content and not message.tool_calls:
                    return str(message.content)
            return "Sorry, I could not generate a response."

        llm_result = await self._llm.ainvoke(messages)
        if llm_result.content:
            return str(llm_result.content)
        return "Sorry, I could not generate a response."

    async def _publish_comment(
        self,
        *,
        post_id: str,
        content: str,
        parent_comment_id: str | None,
        trigger_type: str,
    ) -> None:
        if self._send_tool is None:
            logger.error("No createAiPostComment tool available - generated content is not published")
            return

        payload: dict[str, Any] = {
            "postId": post_id,
            "content": content,
            "triggerType": trigger_type,
        }
        if parent_comment_id is not None:
            payload["parentCommentId"] = parent_comment_id

        try:
            await self._send_tool.ainvoke(payload)
            logger.info(
                "SocialAgent published AI post comment post_id=%s parent_comment_id=%s trigger_type=%s",
                post_id,
                parent_comment_id,
                trigger_type,
            )
        except Exception:
            logger.exception(
                "SocialAgent failed publishing AI comment post_id=%s trigger_type=%s",
                post_id,
                trigger_type,
            )