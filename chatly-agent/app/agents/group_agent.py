"""Agent for @AI mentions in group conversations.

Architecture:
  1. ReAct loop with research/action tools for group context and tasks
  2. LLM generates a response as normal text
  3. Deterministic final step: call ``sendAiMessage`` MCP tool to deliver the response

This removes the dependency on the LLM deciding to call sendAiMessage —
the delivery is handled structurally by the graph.
"""

import logging
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.tools import BaseTool
from langchain_groq import ChatGroq
from langgraph.prebuilt import create_react_agent

from app.agents.tool_selection import (
    SEND_AI_MESSAGE_TOOL_NAME,
    SEND_TEXT_MESSAGE_TOOL_NAME,
    partition_group_tools,
)
from app.prompts.group_prompt import GROUP_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

GROUP_FALLBACK_RESPONSE = "Sorry, I couldn't generate a response."

__all__ = [
    "GroupAgent",
    "SEND_AI_MESSAGE_TOOL_NAME",
    "SEND_TEXT_MESSAGE_TOOL_NAME",
]


class GroupAgent:
    """Dedicated agent for @AI mention handling.

    Unlike ``UnifiedAgent``, this agent:
    - Runs without a checkpointer (no HITL needed).
    - Separates ``sendAiMessage`` from the tool list so the LLM cannot
      accidentally skip delivery.
    - Programmatically calls ``sendAiMessage`` after the LLM generates text.
    """

    def __init__(
        self,
        llm: ChatGroq,
        tools: list[BaseTool],
        conversation_id: str,
        generated_attachments: list[dict[str, Any]] | None = None,
    ) -> None:
        self._conversation_id = conversation_id
        self._llm = llm
        self._generated_attachments = (
            generated_attachments if generated_attachments is not None else []
        )

        partition = partition_group_tools(tools)
        self._send_tool = partition.delivery_tool

        if self._send_tool is None:
            logger.warning("sendAiMessage tool not found - agent cannot post responses")

        # ReAct graph for research only — no checkpointer, no HITL.
        self._graph = (
            create_react_agent(llm, partition.research_tools)
            if partition.research_tools
            else None
        )

    async def run(
        self,
        message: str,
        user_id: str,
        session_context: str,
        history: list[Any] | None = None,
    ) -> str:
        """Execute the full group mention flow: research → generate → send."""
        system = SystemMessage(
            content=GROUP_SYSTEM_PROMPT.format(
                user_id=user_id,
                conversation_id=self._conversation_id,
                session_context=session_context,
            )
        )
        msgs = [system, *(history or []), HumanMessage(content=message)]

        # ── Phase 1: ReAct research loop ────────────────────────────────
        if self._graph is not None:
            config = {"configurable": {"thread_id": "mention"}}
            result = await self._graph.ainvoke({"messages": msgs}, config=config)
            # Extract the final AI text from the message list.
            ai_text = ""
            for m in reversed(result["messages"]):
                if isinstance(m, AIMessage) and m.content and not m.tool_calls:
                    ai_text = str(m.content)
                    break
            if not ai_text:
                ai_text = GROUP_FALLBACK_RESPONSE
        else:
            # No research tools — call LLM directly.
            result = await self._llm.ainvoke(msgs)
            ai_text = (
                str(result.content) if result.content else GROUP_FALLBACK_RESPONSE
            )

        # ── Phase 2: Deterministic delivery ─────────────────────────────
        if self._send_tool is not None:
            try:
                payload = {
                    "conversationId": self._conversation_id,
                    "content": ai_text,
                }
                image_urls = self._collect_generated_image_urls()
                if image_urls:
                    payload["imageUrls"] = image_urls

                await self._send_tool.ainvoke(payload)
                logger.info(
                    "GroupAgent delivered response to conversation=%s image_count=%d",
                    self._conversation_id,
                    len(image_urls),
                )
            except Exception:
                logger.exception(
                    "GroupAgent failed to send message to conversation=%s",
                    self._conversation_id,
                )
        else:
            logger.error(
                "No sendAiMessage tool available - response discarded "
                "for conversation=%s",
                self._conversation_id,
            )

        return ai_text

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
