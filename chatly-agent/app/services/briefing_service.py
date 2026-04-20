"""Daily briefing generation for the proactive push trigger (Phase 5)."""
import logging
from typing import Any

from app.models.chat import ChatRequest
from app.services.chat_service import ChatService
from app.services.session_service import SessionService

logger = logging.getLogger(__name__)

_BRIEFING_SESSION_TITLE = "Daily Briefing"
_BRIEFING_PROMPT = """\
Please prepare the user's daily morning briefing.

Steps:
1. Call `getMyConversations` to find all conversations you are part of.
2. For each group conversation, call `readRecentMessages` to see what happened in \
the last 24 hours.
3. For each group, call `listGroupReminders` to surface reminders due today or tomorrow.
4. Compile a concise briefing.
5. For every group that had meaningful activity or has upcoming reminders, call \
`sendTextMessage` to deliver that group's briefing summary directly into the conversation.

Guidelines:
- Address the group members collectively (e.g. "Good morning everyone!").
- Keep each group summary to 3–5 bullet points.
- Highlight: unread discussions, important decisions, upcoming reminders.
- Skip groups with zero activity in the past 24 hours.
- Identify yourself as the AI assistant.
"""


class BriefingService:
    """Drives the daily proactive briefing flow."""

    def __init__(
        self,
        session_service: SessionService,
        chat_service: ChatService,
    ) -> None:
        self._session_service = session_service
        self._chat_service = chat_service

    async def run_briefing(self, user_id: str) -> None:
        """Create a throwaway session and run the agent with the briefing prompt."""
        session = await self._session_service.create_session(
            user_id=user_id,
            title=_BRIEFING_SESSION_TITLE,
        )
        session_id: str = session["id"]
        logger.info("Briefing started user_id=%s session_id=%s", user_id, session_id)
        try:
            request = ChatRequest(message=_BRIEFING_PROMPT)
            async for _ in self._chat_service.stream_chat(
                user_id=user_id,
                session_id=session_id,
                request=request,
            ):
                pass
        except Exception:
            logger.exception("Briefing failed user_id=%s session_id=%s", user_id, session_id)
