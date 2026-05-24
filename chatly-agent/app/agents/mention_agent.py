"""Agent for @AI mentions in group conversations.

Architecture:
  1. ReAct loop with read-only tools to gather context (messages, group info, etc.)
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

logger = logging.getLogger(__name__)

SEND_AI_MESSAGE_TOOL_NAME = "sendAiMessage"
SEND_TEXT_MESSAGE_TOOL_NAME = "sendTextMessage"

MENTION_SYSTEM_PROMPT = (
    "You are Chatly AI, responding to an @AI mention in a group conversation.\n"
    "The current user's ID is: {user_id}.\n"
    "The group conversation ID is: {conversation_id}.\n\n"
    "## Available Tools\n"
    "You have a full set of tools at your disposal. Use them as needed:\n\n"
    "**Context & Research:**\n"
    "- readRecentMessages / readMessagesByTimeRange / searchMessages — read conversation history\n"
    "- getGroupInfo / getGroupMembers — group metadata and member list\n"
    "- getConversationInfo / getMyConversations — conversation details\n"
    "- getUserInfo / getMyProfile — user profiles\n"
    "- listGroupNotes — shared group notes\n\n"
    "**Actions:**\n"
    '- createGroupPoll — create a poll (pass `options` as a list of strings, e.g. ["A", "B"])\n'
    "- createGroupReminder / listGroupReminders — manage reminders (always list first to avoid duplicates)\n\n"
    "Use context tools first when you need background info, then perform actions as requested.\n\n"
    "{session_context}"
    "## Response Rules\n"
    "- Be helpful, direct, and concise.\n"
    "- Reply in the same language the user writes in.\n"
    "- Convert technical tool fields into natural language. Do not show raw IDs or raw timestamps unless asked.\n"
    "- Prefer member display names and conversation names over IDs.\n"
    "- If summarizing unread activity, describe message types clearly (text, call event, attachment) with readable time.\n"
    "- Do not fabricate facts, URLs, or citations.\n"
    "- Your final text output will be automatically posted to the group — just write normally.\n"
    "- If you already performed an action (created a poll, set a reminder, etc.), "
    "briefly confirm what you did in your text response.\n"
)


class MentionAgent:
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
    ) -> None:
        self._conversation_id = conversation_id
        self._llm = llm

        # Partition: pull both send tools out — sendAiMessage is used for final
        # delivery, sendTextMessage must not be available to the ReAct loop to
        # prevent the LLM from posting a duplicate TEXT message before the
        # deterministic sendAiMessage call at the end.
        self._send_tool: BaseTool | None = None
        research_tools: list[BaseTool] = []
        for tool in tools:
            if tool.name == SEND_AI_MESSAGE_TOOL_NAME:
                self._send_tool = tool
            elif tool.name == SEND_TEXT_MESSAGE_TOOL_NAME:
                pass  # excluded — delivery is handled via sendAiMessage
            else:
                research_tools.append(tool)

        if self._send_tool is None:
            logger.warning(
                "sendAiMessage tool not found — agent will not be able to post responses"
            )

        # ReAct graph for research only — no checkpointer, no HITL.
        self._graph = (
            create_react_agent(llm, research_tools) if research_tools else None
        )

    async def run(
        self,
        message: str,
        user_id: str,
        session_context: str,
        history: list[Any] | None = None,
    ) -> str:
        """Execute the full mention flow: research → generate → send."""
        system = SystemMessage(
            content=MENTION_SYSTEM_PROMPT.format(
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
                ai_text = "Sorry, I couldn't generate a response."
        else:
            # No research tools — call LLM directly.
            result = await self._llm.ainvoke(msgs)
            ai_text = (
                str(result.content)
                if result.content
                else "Sorry, I couldn't generate a response."
            )

        # ── Phase 2: Deterministic delivery ─────────────────────────────
        if self._send_tool is not None:
            try:
                await self._send_tool.ainvoke(
                    {
                        "conversationId": self._conversation_id,
                        "content": ai_text,
                    }
                )
                logger.info(
                    "MentionAgent delivered response to conversation=%s",
                    self._conversation_id,
                )
            except Exception:
                logger.exception(
                    "MentionAgent failed to send message to conversation=%s",
                    self._conversation_id,
                )
        else:
            logger.error(
                "No sendAiMessage tool available — response discarded for conversation=%s",
                self._conversation_id,
            )

        return ai_text
