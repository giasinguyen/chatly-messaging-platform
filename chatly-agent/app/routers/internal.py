"""Internal trigger endpoints consumed only by chatly-backend.

All routes here are protected by the X-API-Key header (same key used for
MCP SSE endpoints).  They are never exposed to end-users directly.
"""
import asyncio
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, status
from pydantic import BaseModel, Field

from app.dependencies import get_chat_service, get_session_service
from app.models.chat import ChatRequest
from app.services.chat_service import ChatService
from app.services.session_service import SessionService
from app.utils.security import verify_api_key

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/internal",
    tags=["internal"],
    dependencies=[Depends(verify_api_key)],
)

_AI_SESSION_TITLE = "Group AI"


class AssistRequest(BaseModel):
    """Payload sent by the backend when a message mentions @AI."""

    user_id: str = Field(..., description="ID of the user who mentioned @AI")
    conversation_id: str = Field(..., description="Group conversation ID")
    content: str = Field(..., min_length=1, max_length=8192, description="Message that triggered the mention")


class AssistResponse(BaseModel):
    """Immediate acknowledgement returned to the backend."""

    session_id: str
    accepted: bool = True


async def _run_assist(
    user_id: str,
    session_id: str,
    content: str,
    chat_service: ChatService,
) -> None:
    """Background task: run the agent and let it post back via MCP tools."""
    try:
        request = ChatRequest(message=content)
        async for _ in chat_service.stream_chat(
            user_id=user_id,
            session_id=session_id,
            request=request,
        ):
            pass
    except Exception:
        logger.exception(
            "assist task failed user_id=%s session_id=%s", user_id, session_id
        )


@router.post(
    "/assist",
    response_model=AssistResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger AI assist for a group conversation",
    description=(
        "Called by chatly-backend when a message in a group conversation "
        "contains an @AI mention.  Returns 202 immediately and processes "
        "the request in the background."
    ),
)
async def trigger_assist(
    payload: AssistRequest,
    background_tasks: BackgroundTasks,
    session_service: SessionService = Depends(get_session_service),  # noqa: B008
    chat_service: ChatService = Depends(get_chat_service),  # noqa: B008
) -> AssistResponse:
    """Accept an @AI trigger, create/reuse a session, and schedule inference."""
    session = await session_service.find_or_create_for_conversation(
        user_id=payload.user_id,
        conversation_id=payload.conversation_id,
        title=_AI_SESSION_TITLE,
    )
    session_id: str = session["id"]

    background_tasks.add_task(
        _run_assist,
        user_id=payload.user_id,
        session_id=session_id,
        content=payload.content,
        chat_service=chat_service,
    )

    return AssistResponse(session_id=session_id)
