from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    """Request payload for user registration."""

    email: str = Field(..., min_length=5, max_length=254)
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=100)


class LoginRequest(BaseModel):
    """Request payload for user login."""

    email: str
    password: str


class TokenResponse(BaseModel):
    """JWT access token response."""

    access_token: str
    token_type: str = "bearer"
