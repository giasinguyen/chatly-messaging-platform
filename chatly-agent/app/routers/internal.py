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
_SOCIAL_MENTION_SESSION_TITLE = "Social AI Mention"
_SOCIAL_COMMAND_SESSION_TITLE = "Social AI Command"


class AssistRequest(BaseModel):
    """Payload sent by the backend when a message mentions @AI."""

    user_id: str = Field(..., description="ID of the user who mentioned @AI")
    conversation_id: str = Field(..., description="Group conversation ID")
    content: str = Field(..., min_length=1, max_length=8192, description="Message that triggered the mention")


class AssistResponse(BaseModel):
    """Immediate acknowledgement returned to the backend."""

    session_id: str
    accepted: bool = True


class SocialMentionRequest(BaseModel):
    """Payload for social mention-in-comment workflow."""

    user_id: str = Field(..., description="User who mentioned AI in comment")
    post_id: str = Field(..., description="Target post ID")
    comment_id: str = Field(..., description="Comment ID containing AI mention")
    content: str = Field(..., min_length=1, max_length=8192, description="Trigger comment content")
    mention_command: str = Field(default="@ai", description="Mention keyword used by user")
    post_context: str = Field(default="", description="Optional post context prepared by backend")
    thread_context: str = Field(default="", description="Optional comment thread context prepared by backend")


class SocialPostCommandRequest(BaseModel):
    """Payload for social post-command workflow."""

    user_id: str = Field(..., description="User who posted AI command")
    post_id: str = Field(..., description="Target post ID")
    command_content: str = Field(..., min_length=1, max_length=8192, description="Post command content")
    post_context: str = Field(default="", description="Optional post context prepared by backend")
    thread_context: str = Field(default="", description="Optional extra context prepared by backend")


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


async def _run_social_mention_assist(
    user_id: str,
    session_id: str,
    post_id: str,
    comment_id: str,
    content: str,
    mention_command: str,
    post_context: str,
    thread_context: str,
    chat_service: ChatService,
) -> None:
    """Background task for social mention-in-comment processing."""
    try:
        await chat_service.run_social_mention_assist(
            user_id=user_id,
            session_id=session_id,
            post_id=post_id,
            comment_id=comment_id,
            content=content,
            mention_command=mention_command,
            post_context=post_context,
            thread_context=thread_context,
        )
    except Exception:
        logger.exception(
            "social mention task failed user_id=%s session_id=%s post_id=%s comment_id=%s",
            user_id,
            session_id,
            post_id,
            comment_id,
        )


async def _run_social_post_command_assist(
    user_id: str,
    session_id: str,
    post_id: str,
    command_content: str,
    post_context: str,
    thread_context: str,
    chat_service: ChatService,
) -> None:
    """Background task for social post-command processing."""
    try:
        await chat_service.run_social_post_command_assist(
            user_id=user_id,
            session_id=session_id,
            post_id=post_id,
            command_content=command_content,
            post_context=post_context,
            thread_context=thread_context,
        )
    except Exception:
        logger.exception(
            "social post-command task failed user_id=%s session_id=%s post_id=%s",
            user_id,
            session_id,
            post_id,
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


@router.post(
    "/social/mention-comment",
    response_model=AssistResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger social AI for mention in comment",
    description=(
        "Called by chatly-backend when a post comment mentions AI. "
        "Returns 202 immediately and runs social mention handling in background."
    ),
)
async def trigger_social_mention_comment(
    payload: SocialMentionRequest,
    background_tasks: BackgroundTasks,
    session_service: SessionService = Depends(get_session_service),  # noqa: B008
    chat_service: ChatService = Depends(get_chat_service),  # noqa: B008
) -> AssistResponse:
    """Accept social mention trigger and schedule social mention handling."""
    session = await session_service.find_or_create_for_conversation(
        user_id=payload.user_id,
        conversation_id=f"social:post:{payload.post_id}",
        title=_SOCIAL_MENTION_SESSION_TITLE,
    )
    session_id: str = session["id"]

    background_tasks.add_task(
        _run_social_mention_assist,
        user_id=payload.user_id,
        session_id=session_id,
        post_id=payload.post_id,
        comment_id=payload.comment_id,
        content=payload.content,
        mention_command=payload.mention_command,
        post_context=payload.post_context,
        thread_context=payload.thread_context,
        chat_service=chat_service,
    )

    return AssistResponse(session_id=session_id)


@router.post(
    "/social/post-command",
    response_model=AssistResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger social AI for post command",
    description=(
        "Called by chatly-backend when a post is marked as AI command. "
        "Returns 202 immediately and runs social post-command handling in background."
    ),
)
async def trigger_social_post_command(
    payload: SocialPostCommandRequest,
    background_tasks: BackgroundTasks,
    session_service: SessionService = Depends(get_session_service),  # noqa: B008
    chat_service: ChatService = Depends(get_chat_service),  # noqa: B008
) -> AssistResponse:
    """Accept social post-command trigger and schedule background handling."""
    session = await session_service.find_or_create_for_conversation(
        user_id=payload.user_id,
        conversation_id=f"social:post:{payload.post_id}",
        title=_SOCIAL_COMMAND_SESSION_TITLE,
    )
    session_id: str = session["id"]

    background_tasks.add_task(
        _run_social_post_command_assist,
        user_id=payload.user_id,
        session_id=session_id,
        post_id=payload.post_id,
        command_content=payload.command_content,
        post_context=payload.post_context,
        thread_context=payload.thread_context,
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

