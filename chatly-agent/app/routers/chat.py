from typing import Any

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from app.dependencies import get_chat_service
from app.limiter import limiter
from app.middleware.auth import get_current_user
from app.models.chat import ChatRequest, ChatResponse
from app.services.chat_service import ChatService

router = APIRouter(prefix="/sessions/{session_id}", tags=["chat"])


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Invoke agent (blocking)",
    description="Send a message to the agent and receive the full response once complete.",
    responses={
        401: {"description": "Missing or invalid token"},
        404: {"description": "Session not found"},
        429: {"description": "Rate limit exceeded"},
    },
)
@limiter.limit("30/minute")
async def invoke_chat(
    request: Request,
    session_id: str,
    payload: ChatRequest,
    current_user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    service: ChatService = Depends(get_chat_service),  # noqa: B008
) -> ChatResponse:
    """Run one chat turn and return full response."""
    return await service.chat(
        user_id=str(current_user["id"]),
        session_id=session_id,
        request=payload,
    )


@router.post(
    "/chat/stream",
    summary="Invoke agent (SSE streaming)",
    description=(
        "Send a message and receive the response as a stream of Server-Sent Events. "
        "Format: `data: {\"token\": \"...\"}\\n\\n`, terminated by `data: [DONE]\\n\\n`."
    ),
    responses={
        401: {"description": "Missing or invalid token"},
        404: {"description": "Session not found"},
        429: {"description": "Rate limit exceeded"},
    },
)
@limiter.limit("30/minute")
async def stream_chat(
    request: Request,
    session_id: str,
    payload: ChatRequest,
    current_user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    service: ChatService = Depends(get_chat_service),  # noqa: B008
) -> StreamingResponse:
    """Run one chat turn and stream SSE tokens."""
    return StreamingResponse(
        service.stream_chat(
            user_id=str(current_user["id"]),
            session_id=session_id,
            request=payload,
        ),
        media_type="text/event-stream",
    )
