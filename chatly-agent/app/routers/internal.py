"""Internal trigger endpoints consumed only by chatly-backend.

All routes here are protected by the X-API-Key header (same key used for
MCP SSE endpoints).  They are never exposed to end-users directly.
"""
import asyncio
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, status
from pydantic import BaseModel, Field

from app.dependencies import get_briefing_service, get_chat_service, get_file_service, get_session_service
from app.services.briefing_service import BriefingService
from app.services.chat_service import ChatService
from app.services.file_service import FileService
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
    conversation_id: str,
    content: str,
    chat_service: ChatService,
) -> None:
    """Background task: run the MentionAgent and deliver response via sendAiMessage."""
    try:
        await chat_service.run_group_assist(
            user_id=user_id,
            session_id=session_id,
            conversation_id=conversation_id,
            content=content,
        )
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
        conversation_id=payload.conversation_id,
        content=payload.content,
        chat_service=chat_service,
    )

    return AssistResponse(session_id=session_id)


# ---------------------------------------------------------------------------
# Daily briefing trigger (Phase 5)
# ---------------------------------------------------------------------------


class BriefingRequest(BaseModel):
    """Payload sent by the backend DailyBriefingScheduler."""

    user_id: str = Field(..., description="ID of the user to brief")


@router.post(
    "/briefing",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger daily briefing for a user",
    description=(
        "Called by the backend DailyBriefingScheduler at 07:00 VN time. "
        "Creates a session, runs the agent with the briefing prompt, "
        "and the agent delivers summaries via sendTextMessage."
    ),
)
async def trigger_briefing(
    payload: BriefingRequest,
    background_tasks: BackgroundTasks,
    briefing_service: BriefingService = Depends(get_briefing_service),  # noqa: B008
) -> dict[str, bool]:
    """Schedule a daily briefing run in the background."""
    background_tasks.add_task(briefing_service.run_briefing, payload.user_id)
    return {"accepted": True}


# ---------------------------------------------------------------------------
# Conversation file indexing (Phase 6)
# ---------------------------------------------------------------------------


class IndexFileRequest(BaseModel):
    """Payload sent by the backend FileUploadService when an indexable file is uploaded."""

    conversation_id: str = Field(..., description="Group conversation that owns the file")
    file_id: str = Field(..., description="Backend-generated file ID (for deduplication)")
    file_url: str = Field(..., description="Accessible download URL of the uploaded file")
    filename: str = Field(..., description="Original filename including extension")
    mime_type: str = Field(..., description="MIME type of the file")
    uploaded_by: str = Field(..., description="User ID who uploaded the file")


@router.post(
    "/index-file",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Index a conversation file for RAG",
    description=(
        "Called by chatly-backend after a file is uploaded to a group conversation. "
        "Downloads the file, extracts text, embeds it, and stores chunks in Qdrant "
        "scoped to the conversation so group members can query its contents via @AI."
    ),
)
async def index_file(
    payload: IndexFileRequest,
    background_tasks: BackgroundTasks,
    file_service: FileService = Depends(get_file_service),  # noqa: B008
) -> dict[str, bool]:
    """Schedule file indexing in the background."""
    background_tasks.add_task(
        file_service.index_conversation_file,
        conversation_id=payload.conversation_id,
        file_url=payload.file_url,
        filename=payload.filename,
        mime_type=payload.mime_type,
        uploaded_by=payload.uploaded_by,
        backend_file_id=payload.file_id,
    )
    return {"accepted": True}

