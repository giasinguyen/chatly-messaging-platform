import pytest

from app.config import Settings


def test_settings_load_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GROQ_API_KEY", "gsk-test")
    monkeypatch.setenv("MONGODB_URI", "mongodb://localhost:27017")
    monkeypatch.setenv("MONGODB_DB_NAME", "agent_server_test")
    monkeypatch.setenv("APP_ENV", "test")

    settings = Settings()

    assert settings.groq_api_key == "gsk-test"
    assert settings.mongodb_uri == "mongodb://localhost:27017"
    assert settings.mongodb_db_name == "agent_server_test"
    assert settings.app_env == "test"
