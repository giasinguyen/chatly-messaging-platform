from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_auth_service
from app.models.auth import LoginRequest, RegisterRequest, TokenResponse
from app.models.user import UserResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Create a new user account with email and password.",
    responses={
        201: {"description": "User created successfully"},
        400: {"description": "Email already registered or invalid input"},
    },
)
async def register(
    payload: RegisterRequest,
    service: AuthService = Depends(get_auth_service),  # noqa: B008
) -> UserResponse:
    """Register a user account."""
    try:
        user = await service.register_user(
            email=payload.email,
            password=payload.password,
            full_name=payload.full_name,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return UserResponse(**user)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login",
    description="Authenticate with email and password, returns a JWT Bearer token.",
    responses={
        200: {"description": "JWT access token"},
        401: {"description": "Invalid credentials"},
    },
)
async def login(
    payload: LoginRequest,
    service: AuthService = Depends(get_auth_service),  # noqa: B008
) -> TokenResponse:
    """Login and get JWT token."""
    try:
        token = await service.login(payload.email, payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    return TokenResponse(access_token=token)
