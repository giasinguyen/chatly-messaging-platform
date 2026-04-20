from fastapi import APIRouter, Depends, Response, status

from app.dependencies import get_file_service, get_request_context, get_session_service
from app.models.context import RequestContext
from app.models.message import MessageHistory, MessageResponse
from app.models.session import (
    SessionCreate,
    SessionList,
    SessionResponse,
    SessionUpdate,
)
from app.services.file_service import FileService
from app.services.session_service import SessionService

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post(
    "",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create session",
    description="Create a new chat session for the current user.",
    responses={401: {"description": "Unauthorized"}},
)
async def create_session(
    payload: SessionCreate,
    ctx: RequestContext = Depends(get_request_context),  # noqa: B008
    service: SessionService = Depends(get_session_service),  # noqa: B008
) -> SessionResponse:
    """Create a new session for current user."""
    session = await service.create_session(ctx.user_id, payload.title)
    return SessionResponse(**session)


@router.get(
    "",
    response_model=SessionList,
    summary="List sessions",
    description="Return all chat sessions owned by the current user.",
    responses={401: {"description": "Unauthorized"}},
)
async def list_sessions(
    ctx: RequestContext = Depends(get_request_context),  # noqa: B008
    service: SessionService = Depends(get_session_service),  # noqa: B008
) -> SessionList:
    """List sessions for current user."""
    sessions = await service.list_sessions(ctx.user_id)
    session_items = [SessionResponse(**item) for item in sessions]
    return SessionList(sessions=session_items, total=len(session_items))


@router.get(
    "/{session_id}",
    response_model=SessionResponse,
    summary="Get session",
    description="Return one session. Returns 404 if not found or not owned.",
    responses={401: {"description": "Unauthorized"}, 404: {"description": "Session not found"}},
)
async def get_session(
    session_id: str,
    ctx: RequestContext = Depends(get_request_context),  # noqa: B008
    service: SessionService = Depends(get_session_service),  # noqa: B008
) -> SessionResponse:
    """Get one session owned by current user."""
    session = await service.get_session(ctx.user_id, session_id)
    return SessionResponse(**session)


@router.delete(
    "/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete session",
    description="Delete a session and all its messages, files, and vectors. Returns 404 if not found or not owned.",
    responses={401: {"description": "Unauthorized"}, 404: {"description": "Session not found"}},
)
async def delete_session(
    session_id: str,
    ctx: RequestContext = Depends(get_request_context),  # noqa: B008
    service: SessionService = Depends(get_session_service),  # noqa: B008
    file_service: FileService = Depends(get_file_service),  # noqa: B008
) -> Response:
    """Delete one session owned by current user."""
    # Validate ownership before any deletion
    await service.get_session(ctx.user_id, session_id)
    # Delete uploaded files, chunks, and vectors first
    await file_service.delete_files_by_session(session_id)
    # Delete messages and the session record
    await service.delete_session(ctx.user_id, session_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch(
    "/{session_id}",
    response_model=SessionResponse,
    summary="Rename session",
    description="Update the title of a session.",
    responses={401: {"description": "Unauthorized"}, 404: {"description": "Session not found"}},
)
async def rename_session(
    session_id: str,
    payload: SessionUpdate,
    ctx: RequestContext = Depends(get_request_context),  # noqa: B008
    service: SessionService = Depends(get_session_service),  # noqa: B008
) -> SessionResponse:
    """Rename one session owned by current user."""
    session = await service.rename_session(ctx.user_id, session_id, payload.title)
    return SessionResponse(**session)


@router.get(
    "/{session_id}/messages",
    response_model=MessageHistory,
    summary="Get message history",
    description="Return all messages in a session, sorted oldest first.",
    responses={401: {"description": "Unauthorized"}, 404: {"description": "Session not found"}},
)
async def get_history(
    session_id: str,
    ctx: RequestContext = Depends(get_request_context),  # noqa: B008
    service: SessionService = Depends(get_session_service),  # noqa: B008
) -> MessageHistory:
    """Get message history for one owned session."""
    messages = await service.get_history(ctx.user_id, session_id)
    return MessageHistory(messages=[MessageResponse(**item) for item in messages])
