from datetime import UTC, datetime
from io import BytesIO
from typing import Any

from fastapi import UploadFile
from fastapi.testclient import TestClient

from app.dependencies import get_file_service
from app.main import app
from app.middleware.auth import get_current_user


class InMemoryFileService:
    def __init__(self) -> None:
        self._files: dict[str, list[dict[str, Any]]] = {"s1": []}

    async def upload_file(
        self,
        user_id: str,
        session_id: str,
        file: UploadFile,
    ) -> dict[str, Any]:
        _ = user_id
        payload = await file.read()
        if len(payload) > 5 * 1024 * 1024:
            raise ValueError("File size exceeds 5MB limit")
        if len(self._files.get(session_id, [])) >= 4:
            raise ValueError("Maximum 4 files per session")

        item = {
            "id": f"file-{len(self._files[session_id]) + 1}",
            "session_id": session_id,
            "user_id": "user-a",
            "filename": file.filename,
            "mime_type": file.content_type,
            "size_bytes": len(payload),
            "minio_bucket": "uploads",
            "object_key": f"user-a/{session_id}/{file.filename}",
            "etag": "etag-1",
            "created_at": datetime.now(UTC),
        }
        self._files[session_id].append(item)
        return item

    async def list_files(self, user_id: str, session_id: str) -> list[dict[str, Any]]:
        _ = user_id
        return list(self._files.get(session_id, []))

    async def delete_file(self, user_id: str, session_id: str, file_id: str) -> None:
        _ = user_id
        current = self._files.get(session_id, [])
        self._files[session_id] = [f for f in current if f["id"] != file_id]


service = InMemoryFileService()


async def _override_current_user() -> dict[str, str]:
    return {"id": "user-a"}


async def _override_file_service() -> InMemoryFileService:
    return service


def _get_client() -> TestClient:
    app.dependency_overrides[get_current_user] = _override_current_user
    app.dependency_overrides[get_file_service] = _override_file_service
    return TestClient(app)


def _clear_overrides() -> None:
    app.dependency_overrides.clear()


def test_upload_txt_file_returns_200() -> None:
    service._files = {"s1": []}
    client = _get_client()

    response = client.post(
        "/sessions/s1/files",
        files={"file": ("sample.txt", BytesIO(b"hello"), "text/plain")},
    )

    _clear_overrides()
    assert response.status_code == 200
    assert response.json()["filename"] == "sample.txt"


def test_upload_file_over_5mb_returns_400() -> None:
    service._files = {"s1": []}
    client = _get_client()

    payload = b"a" * (5 * 1024 * 1024 + 1)
    response = client.post(
        "/sessions/s1/files",
        files={"file": ("large.txt", BytesIO(payload), "text/plain")},
    )

    _clear_overrides()
    assert response.status_code == 400


def test_max_4_files_per_session_returns_400() -> None:
    service._files = {
        "s1": [
            {"id": "file-1"},
            {"id": "file-2"},
            {"id": "file-3"},
            {"id": "file-4"},
        ]
    }
    client = _get_client()

    response = client.post(
        "/sessions/s1/files",
        files={"file": ("sample.txt", BytesIO(b"hello"), "text/plain")},
    )

    _clear_overrides()
    assert response.status_code == 400


def test_delete_file_returns_204() -> None:
    service._files = {
        "s1": [
            {
                "id": "file-1",
                "session_id": "s1",
                "user_id": "user-a",
                "filename": "sample.txt",
                "mime_type": "text/plain",
                "size_bytes": 5,
                "minio_bucket": "uploads",
                "object_key": "user-a/s1/sample.txt",
                "etag": "etag-1",
                "created_at": datetime.now(UTC),
            }
        ]
    }
    client = _get_client()

    response = client.delete("/sessions/s1/files/file-1")

    _clear_overrides()
    assert response.status_code == 204


def test_list_files_returns_items() -> None:
    service._files = {
        "s1": [
            {
                "id": "file-1",
                "session_id": "s1",
                "user_id": "user-a",
                "filename": "sample.txt",
                "mime_type": "text/plain",
                "size_bytes": 5,
                "minio_bucket": "uploads",
                "object_key": "user-a/s1/sample.txt",
                "etag": "etag-1",
                "created_at": datetime.now(UTC),
            }
        ]
    }
    client = _get_client()

    response = client.get("/sessions/s1/files")

    _clear_overrides()
    assert response.status_code == 200
    assert len(response.json()["files"]) == 1
