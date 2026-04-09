from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_ok() -> None:
    response = client.get("/health/")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_ready_returns_ready_when_all_ok() -> None:
    with patch("app.routers.health.get_client") as mock_get_client:
        mock_mongo = AsyncMock()
        mock_mongo.admin.command = AsyncMock(return_value={"ok": 1})
        mock_get_client.return_value = mock_mongo

        response = client.get("/health/ready")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["mongodb"] == "ok"


def test_health_ready_returns_degraded_when_mongo_fails() -> None:
    with patch("app.routers.health.get_client") as mock_get_client:
        mock_mongo = AsyncMock()
        mock_mongo.admin.command = AsyncMock(side_effect=Exception("connection refused"))
        mock_get_client.return_value = mock_mongo

        response = client.get("/health/ready")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "degraded"
    assert data["mongodb"] == "error"
