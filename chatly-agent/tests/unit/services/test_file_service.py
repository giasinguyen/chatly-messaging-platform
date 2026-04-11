from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services.file_service import FileService


@pytest.mark.asyncio
async def test_upload_file_rejects_size_above_5mb_without_saving_metadata() -> None:
    session_service = AsyncMock()
    file_repo = AsyncMock()
    file_repo.count_by_session.return_value = 0
    chunk_repo = AsyncMock()
    vector_service = AsyncMock()
    minio_client = MagicMock()

    content = b"a" * (5 * 1024 * 1024 + 1)
    upload = SimpleNamespace(
        filename="large.txt",
        content_type="text/plain",
        read=AsyncMock(return_value=content),
    )

    service = FileService(
        session_service=session_service,
        file_repo=file_repo,
        chunk_repo=chunk_repo,
        vector_service=vector_service,
        embedder=AsyncMock(),
        minio_client=minio_client,
        bucket_name="uploads",
    )

    with pytest.raises(ValueError, match="File size"):
        await service.upload_file("u1", "s1", upload)

    file_repo.create.assert_not_called()
    chunk_repo.insert_many.assert_not_called()
    minio_client.put_object.assert_not_called()


@pytest.mark.asyncio
async def test_upload_file_rejects_when_session_has_more_than_4_files() -> None:
    session_service = AsyncMock()
    file_repo = AsyncMock()
    file_repo.count_by_session.return_value = 4

    service = FileService(
        session_service=session_service,
        file_repo=file_repo,
        chunk_repo=AsyncMock(),
        vector_service=AsyncMock(),
        embedder=AsyncMock(),
        minio_client=MagicMock(),
        bucket_name="uploads",
    )

    upload = SimpleNamespace(
        filename="note.txt",
        content_type="text/plain",
        read=AsyncMock(return_value=b"hello"),
    )

    with pytest.raises(ValueError, match="Maximum 4 files"):
        await service.upload_file("u1", "s1", upload)

    file_repo.create.assert_not_called()


@pytest.mark.asyncio
async def test_upload_file_rejects_unsupported_type_without_saving_metadata() -> None:
    file_repo = AsyncMock()
    file_repo.count_by_session.return_value = 0

    service = FileService(
        session_service=AsyncMock(),
        file_repo=file_repo,
        chunk_repo=AsyncMock(),
        vector_service=AsyncMock(),
        embedder=AsyncMock(),
        minio_client=MagicMock(),
        bucket_name="uploads",
    )

    upload = SimpleNamespace(
        filename="bad.exe",
        content_type="application/octet-stream",
        read=AsyncMock(return_value=b"payload"),
    )

    with pytest.raises(ValueError, match="Unsupported file type"):
        await service.upload_file("u1", "s1", upload)

    file_repo.create.assert_not_called()


@pytest.mark.asyncio
async def test_upload_file_success_calls_minio_and_persists_chunks() -> None:
    file_repo = AsyncMock()
    file_repo.count_by_session.return_value = 0
    file_repo.create.return_value = {
        "id": "file-1",
        "session_id": "s1",
        "user_id": "u1",
        "filename": "sample.txt",
        "mime_type": "text/plain",
        "size_bytes": 11,
        "minio_bucket": "uploads",
        "object_key": "u1/s1/sample.txt",
        "etag": "etag-1",
    }

    chunk_repo = AsyncMock()
    vector_service = AsyncMock()
    embedder = AsyncMock()
    embedder.aembed_documents.return_value = [[0.1, 0.2]]

    minio_client = MagicMock()
    minio_client.put_object.return_value = SimpleNamespace(etag="etag-1")

    service = FileService(
        session_service=AsyncMock(),
        file_repo=file_repo,
        chunk_repo=chunk_repo,
        vector_service=vector_service,
        embedder=embedder,
        minio_client=minio_client,
        bucket_name="uploads",
    )

    upload = SimpleNamespace(
        filename="sample.txt",
        content_type="text/plain",
        read=AsyncMock(return_value=b"hello world"),
    )

    result = await service.upload_file("u1", "s1", upload)

    assert result["id"] == "file-1"
    minio_client.put_object.assert_called_once()
    chunk_repo.insert_many.assert_awaited_once()
    vector_service.index_chunks.assert_awaited_once()


@pytest.mark.asyncio
async def test_upload_file_raises_when_embedding_fails_and_no_metadata_saved() -> None:
    file_repo = AsyncMock()
    file_repo.count_by_session.return_value = 0

    embedder = AsyncMock()
    embedder.aembed_documents.side_effect = RuntimeError("hf outage")

    service = FileService(
        session_service=AsyncMock(),
        file_repo=file_repo,
        chunk_repo=AsyncMock(),
        vector_service=AsyncMock(),
        embedder=embedder,
        minio_client=MagicMock(),
        bucket_name="uploads",
    )

    upload = SimpleNamespace(
        filename="sample.txt",
        content_type="text/plain",
        read=AsyncMock(return_value=b"hello world"),
    )

    with pytest.raises(ValueError, match="Embedding failed"):
        await service.upload_file("u1", "s1", upload)

    file_repo.create.assert_not_called()


@pytest.mark.asyncio
async def test_upload_file_rolls_back_chunks_when_vector_indexing_fails() -> None:
    file_repo = AsyncMock()
    file_repo.count_by_session.return_value = 0
    file_repo.create.return_value = {
        "id": "file-1",
        "session_id": "s1",
        "user_id": "u1",
        "filename": "sample.txt",
        "mime_type": "text/plain",
        "size_bytes": 11,
        "minio_bucket": "uploads",
        "object_key": "u1/s1/sample.txt",
        "etag": "etag-1",
    }

    chunk_repo = AsyncMock()
    vector_service = AsyncMock()
    vector_service.index_chunks.side_effect = RuntimeError("qdrant down")
    embedder = AsyncMock()
    embedder.aembed_documents.return_value = [[0.1, 0.2]]

    minio_client = MagicMock()
    minio_client.put_object.return_value = SimpleNamespace(etag="etag-1")

    service = FileService(
        session_service=AsyncMock(),
        file_repo=file_repo,
        chunk_repo=chunk_repo,
        vector_service=vector_service,
        embedder=embedder,
        minio_client=minio_client,
        bucket_name="uploads",
    )

    upload = SimpleNamespace(
        filename="sample.txt",
        content_type="text/plain",
        read=AsyncMock(return_value=b"hello world"),
    )

    with pytest.raises(ValueError, match="Failed to persist chunks"):
        await service.upload_file("u1", "s1", upload)

    chunk_repo.delete_by_file.assert_awaited_once_with("file-1")
    file_repo.delete.assert_awaited_once_with("file-1")
    minio_client.remove_object.assert_called_once()


@pytest.mark.asyncio
async def test_delete_file_removes_chunks_then_minio_object() -> None:
    file_repo = AsyncMock()
    file_repo.find_by_user_and_id.return_value = {
        "id": "file-1",
        "user_id": "u1",
        "session_id": "s1",
        "minio_bucket": "uploads",
        "object_key": "u1/s1/file-1/sample.txt",
    }

    chunk_repo = AsyncMock()
    vector_service = AsyncMock()
    minio_client = MagicMock()

    service = FileService(
        session_service=AsyncMock(),
        file_repo=file_repo,
        chunk_repo=chunk_repo,
        vector_service=vector_service,
        embedder=AsyncMock(),
        minio_client=minio_client,
        bucket_name="uploads",
    )

    await service.delete_file("u1", "s1", "file-1")

    vector_service.delete_file_vectors.assert_awaited_once_with("file-1")
    chunk_repo.delete_by_file.assert_awaited_once_with("file-1")
    minio_client.remove_object.assert_called_once_with(
        "uploads",
        "u1/s1/file-1/sample.txt",
    )
    file_repo.delete.assert_awaited_once_with("file-1")


def test_extract_text_dispatches_supported_types() -> None:
    service = FileService(
        session_service=AsyncMock(),
        file_repo=AsyncMock(),
        chunk_repo=AsyncMock(),
        vector_service=AsyncMock(),
        embedder=AsyncMock(),
        minio_client=MagicMock(),
        bucket_name="uploads",
    )

    service._extract_pdf = MagicMock(return_value="pdf")
    service._extract_docx = MagicMock(return_value="docx")

    assert service._extract_text(b"hello", "sample.txt", "text/plain") == "hello"
    assert service._extract_text(b"hello", "sample.md", "text/markdown") == "hello"
    assert service._extract_text(b"hello", "sample.csv", "text/csv") == "hello"
    assert service._extract_text(b"hello", "sample.json", "application/json") == "hello"
    assert service._extract_text(b"x", "sample.pdf", "application/pdf") == "pdf"
    assert (
        service._extract_text(
            b"x",
            "sample.docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        == "docx"
    )
