from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_auth_service
from app.middleware.auth import get_current_user
from app.models.user import UserListResponse, UserResponse
from app.services.auth_service import AuthService

router = APIRouter(tags=["users"])


def _to_public_user(user: dict[str, Any]) -> UserResponse:
    return UserResponse(
        id=str(user["id"]),
        email=str(user["email"]),
        full_name=str(user.get("full_name", "")),
        is_active=bool(user.get("is_active", True)),
        created_at=user.get("created_at"),
    )


@router.get(
    "/users",
    response_model=UserListResponse,
    summary="List users",
    description="Return all registered users. Requires authentication.",
    responses={401: {"description": "Unauthorized"}},
)
async def list_users(
    current_user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    service: AuthService = Depends(get_auth_service),  # noqa: B008
) -> UserListResponse:
    """List all users."""
    _ = current_user
    users = await service.list_users()
    public_users = [_to_public_user(user) for user in users]
    return UserListResponse(users=public_users, total=len(public_users))


@router.get(
    "/users/{user_id}",
    response_model=UserResponse,
    summary="Get user by ID",
    description="Return a single user by their ID.",
    responses={401: {"description": "Unauthorized"}, 404: {"description": "User not found"}},
)
async def get_user_by_id(
    user_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
    service: AuthService = Depends(get_auth_service),  # noqa: B008
) -> UserResponse:
    """Get one user by id."""
    _ = current_user
    user = await service.get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return _to_public_user(user)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user",
    description="Return the currently authenticated user's profile.",
    responses={401: {"description": "Unauthorized"}},
)
async def get_me(
    current_user: dict[str, Any] = Depends(get_current_user),  # noqa: B008
) -> UserResponse:
    """Get currently authenticated user."""
    return _to_public_user(current_user)
