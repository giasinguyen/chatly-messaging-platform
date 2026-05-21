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

CREATE_AI_POST_COMMENT_TOOL_NAME = "createAiPostComment"

SOCIAL_MENTION_SYSTEM_PROMPT = (
    "You are Chatly Social AI, responding to an AI mention inside a post comment thread.\n"
    "Current user ID: {user_id}.\n"
    "Post ID: {post_id}.\n"
    "Parent comment ID: {comment_id}.\n"
    "Mention command: {mention_command}.\n\n"
    "## Provided context\n"
    "Post context:\n{post_context}\n\n"
    "Comment thread context:\n{thread_context}\n\n"
    "{session_context}"
    "## Response rules\n"
    "- Reply in the same language as the user message.\n"
    "- Be concise, helpful, and directly relevant to the thread.\n"
    "- Do not expose raw IDs in the final reply text.\n"
    "- Do not fabricate facts.\n"
    "- Final output will be posted as an AI comment reply.\n"
)

SOCIAL_POST_COMMAND_SYSTEM_PROMPT = (
    "You are Chatly Social AI, executing an AI command posted by the user.\n"
    "Current user ID: {user_id}.\n"
    "Post ID: {post_id}.\n\n"
    "## Provided context\n"
    "Post context:\n{post_context}\n\n"
    "Extra context:\n{thread_context}\n\n"
    "{session_context}"
    "## Response rules\n"
    "- Reply in the same language as the command.\n"
    "- Be concise and actionable.\n"
    "- If the command is ambiguous, make a safe assumption and state it briefly.\n"
    "- Do not expose raw IDs in final text.\n"
    "- Do not fabricate facts.\n"
    "- Final output will be posted as an AI comment on the post.\n"
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
            if tool.name == CREATE_AI_POST_COMMENT_TOOL_NAME:
                self._send_tool = tool
            else:
                research_tools.append(tool)

        if self._send_tool is None:
            logger.warning(
                "createAiPostComment tool not found - social agent can generate text but cannot publish"
            )

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