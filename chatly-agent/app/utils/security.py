from datetime import UTC, datetime, timedelta
from typing import cast

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    """Hash plain-text password using bcrypt."""
    return cast(str, _pwd_context.hash(plain))


def verify_password(plain: str, hashed: str) -> bool:
    """Verify plain-text password against hashed value."""
    return cast(bool, _pwd_context.verify(plain, hashed))


def create_access_token(user_id: str) -> str:
    """Create JWT access token containing user id as subject."""
    expire = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": user_id, "exp": expire}
    return cast(
        str,
        jwt.encode(
            payload,
            settings.jwt_secret_key,
            algorithm=settings.jwt_algorithm,
        ),
    )


def decode_token(token: str) -> str:
    """Decode JWT and return the user id in the sub claim."""
    payload = jwt.decode(
        token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
    )
    user_id = payload.get("sub")
    if not isinstance(user_id, str) or not user_id:
        raise JWTError("Missing subject")
    return user_id
