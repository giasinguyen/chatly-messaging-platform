from datetime import UTC, datetime, timedelta

import pytest
from jose import JWTError, jwt

from app.config import settings
from app.utils.security import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_hash_password_returns_different_value() -> None:
    hashed = hash_password("password123")

    assert hashed != "password123"


def test_verify_password_true_for_valid_and_false_for_invalid() -> None:
    hashed = hash_password("password123")

    assert verify_password("password123", hashed)
    assert not verify_password("wrong", hashed)


def test_create_access_token_can_be_decoded() -> None:
    token = create_access_token("user-1")

    user_id = decode_token(token)

    assert user_id == "user-1"


def test_decode_token_raises_for_expired_token() -> None:
    payload = {
        "sub": "user-1",
        "exp": datetime.now(UTC) - timedelta(minutes=1),
    }
    token = jwt.encode(
        payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm
    )

    with pytest.raises(JWTError):
        decode_token(token)
