from typing import Any

from fastapi import APIRouter, Depends, Response, status

from app.dependencies import get_session_service
from app.middleware.auth import get_current_user
from app.models.message import MessageHistory, MessageResponse
from app.models.session import SessionCreate, SessionList, SessionResponse
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
    current_user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    service: SessionService = Depends(get_session_service),  # noqa: B008
) -> SessionResponse:
    """Create a new session for current user."""
    session = await service.create_session(current_user["id"], payload.title)
    return SessionResponse(**session)


@router.get(
    "",
    response_model=SessionList,
    summary="List sessions",
    description="Return all chat sessions owned by the current user.",
    responses={401: {"description": "Unauthorized"}},
)
async def list_sessions(
    current_user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    service: SessionService = Depends(get_session_service),  # noqa: B008
) -> SessionList:
    """List sessions for current user."""
    sessions = await service.list_sessions(current_user["id"])
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
    current_user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    service: SessionService = Depends(get_session_service),  # noqa: B008
) -> SessionResponse:
    """Get one session owned by current user."""
    session = await service.get_session(current_user["id"], session_id)
    return SessionResponse(**session)


@router.delete(
    "/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete session",
    description="Delete a session and all its messages. Returns 404 if not found or not owned.",
    responses={401: {"description": "Unauthorized"}, 404: {"description": "Session not found"}},
)
async def delete_session(
    session_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    service: SessionService = Depends(get_session_service),  # noqa: B008
) -> Response:
    """Delete one session owned by current user."""
    await service.delete_session(current_user["id"], session_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/{session_id}/messages",
    response_model=MessageHistory,
    summary="Get message history",
    description="Return all messages in a session, sorted oldest first.",
    responses={401: {"description": "Unauthorized"}, 404: {"description": "Session not found"}},
)
async def get_history(
    session_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    service: SessionService = Depends(get_session_service),  # noqa: B008
) -> MessageHistory:
    """Get message history for one owned session."""
    messages = await service.get_history(current_user["id"], session_id)
    return MessageHistory(messages=[MessageResponse(**item) for item in messages])
