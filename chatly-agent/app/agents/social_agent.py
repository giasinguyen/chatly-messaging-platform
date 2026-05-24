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

from app.agents.tool_selection import (
    PUBLISH_REQUIRED_FIELDS,
    SOCIAL_MENTION_TRIGGER_TYPE,
    SOCIAL_POST_COMMAND_TRIGGER_TYPE,
    is_publish_comment_tool,
    partition_social_tools,
)
from app.prompts.social_prompt import (
    SOCIAL_MENTION_SYSTEM_PROMPT,
    SOCIAL_POST_COMMAND_SYSTEM_PROMPT,
)

logger = logging.getLogger(__name__)

SOCIAL_FALLBACK_RESPONSE = "Sorry, I could not generate a response."
PUBLISH_TOOL_RETRY_HINT = (
    "Do not call createAiPostComment directly. Return only the final comment text."
)
_is_publish_comment_tool = is_publish_comment_tool

__all__ = [
    "PUBLISH_REQUIRED_FIELDS",
    "SocialAgent",
    "_is_publish_comment_tool",
]


class SocialAgent:
    """Dedicated agent for social mention and post-command workflows."""

    def __init__(
        self,
        llm: ChatGroq,
        tools: list[BaseTool],
        generated_attachments: list[dict[str, Any]] | None = None,
    ) -> None:
        self._llm = llm
        self._generated_attachments = (
            generated_attachments if generated_attachments is not None else []
        )
        partition = partition_social_tools(tools)
        self._send_tool = partition.delivery_tool

        if self._send_tool is None:
            logger.warning(
                "createAiPostComment tool not found - social agent can "
                "generate text but cannot publish. "
                "available_tools=%s",
                [tool.name for tool in tools],
            )
        else:
            logger.info("SocialAgent publish tool resolved: %s", self._send_tool.name)

        self._graph = (
            create_react_agent(llm, partition.research_tools)
            if partition.research_tools
            else None
        )

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
            trigger_type=SOCIAL_MENTION_TRIGGER_TYPE,
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
            trigger_type=SOCIAL_POST_COMMAND_TRIGGER_TYPE,
        )
        return ai_text

    async def _generate_text(
        self,
        system_message: SystemMessage,
        user_message: str,
        history: list[Any] | None,
    ) -> str:
        messages = [
            system_message,
            *(history or []),
            HumanMessage(content=user_message),
        ]

        if self._graph is not None:
            try:
                result = await self._graph.ainvoke(
                    {"messages": messages},
                    config={"configurable": {"thread_id": "social"}},
                )
                for message in reversed(result["messages"]):
                    if (
                        isinstance(message, AIMessage)
                        and message.content
                        and not message.tool_calls
                    ):
                        return str(message.content)
                return SOCIAL_FALLBACK_RESPONSE
            except Exception as exc:
                if self._is_invalid_publish_tool_call(exc):
                    logger.warning(
                        "SocialAgent detected invalid createAiPostComment tool-call in ReAct loop; falling back to direct LLM text generation"
                    )
                    fallback_messages = [
                        *messages,
                        SystemMessage(content=PUBLISH_TOOL_RETRY_HINT),
                    ]
                    fallback_result = await self._llm.ainvoke(fallback_messages)
                    if fallback_result.content:
                        return str(fallback_result.content)
                    return SOCIAL_FALLBACK_RESPONSE
                raise

        llm_result = await self._llm.ainvoke(messages)
        if llm_result.content:
            return str(llm_result.content)
        return SOCIAL_FALLBACK_RESPONSE

    def _is_invalid_publish_tool_call(self, exc: Exception) -> bool:
        text = str(exc).lower()
        return (
            "not in request.tools" in text
            and "createaipostcomment" in text
        )

    async def _publish_comment(
        self,
        *,
        post_id: str,
        content: str,
        parent_comment_id: str | None,
        trigger_type: str,
    ) -> None:
        if self._send_tool is None:
            logger.error(
                "No createAiPostComment tool available - generated content "
                "is not published"
            )
            return

        payload: dict[str, Any] = {
            "postId": post_id,
            "content": content,
            "triggerType": trigger_type,
        }
        media_urls = self._collect_generated_image_urls()
        if media_urls:
            payload["mediaUrls"] = media_urls
        if parent_comment_id is not None:
            payload["parentCommentId"] = parent_comment_id

        try:
            await self._send_tool.ainvoke(payload)
            logger.info(
                "SocialAgent published AI post comment post_id=%s "
                "parent_comment_id=%s trigger_type=%s image_count=%d",
                post_id,
                parent_comment_id,
                trigger_type,
                len(media_urls),
            )
        except Exception:
            logger.exception(
                "SocialAgent failed publishing AI comment post_id=%s trigger_type=%s",
                post_id,
                trigger_type,
            )

    def _collect_generated_image_urls(self) -> list[str]:
        urls: list[str] = []
        seen: set[str] = set()
        for item in self._generated_attachments:
            url = str(item.get("url") or "").strip()
            if not url or url in seen:
                continue
            seen.add(url)
            urls.append(url)
        return urls
