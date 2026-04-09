from datetime import UTC, datetime
from io import BytesIO
from typing import Any, Protocol
from uuid import uuid4

from docx import Document
from fastapi import UploadFile
from langchain_text_splitters import RecursiveCharacterTextSplitter
from minio import Minio
from pypdf import PdfReader

from app.config import settings
from app.repositories.chunk_repo import ChunkRepository
from app.repositories.file_repo import FileRepository
from app.services.session_service import SessionService
from app.services.vector_service import VectorService

SUPPORTED_EXTENSIONS: set[str] = {"txt", "md", "pdf", "docx", "csv", "json"}
MAX_FILES_PER_SESSION = 4
EMBED_BATCH_SIZE = 16


class DocumentEmbedder(Protocol):
    """Protocol for embedding document chunks."""

    async def aembed_documents(self, texts: list[str]) -> list[list[float]]:
        """Return embeddings for input texts."""


class FileService:
    """Handle file upload lifecycle for RAG context."""

    def __init__(
        self,
        session_service: SessionService,
        file_repo: FileRepository,
        chunk_repo: ChunkRepository,
        vector_service: VectorService,
        embedder: DocumentEmbedder,
        minio_client: Minio,
        bucket_name: str,
    ) -> None:
        self._session_service = session_service
        self._file_repo = file_repo
        self._chunk_repo = chunk_repo
        self._vector_service = vector_service
        self._embedder = embedder
        self._minio_client = minio_client
        self._bucket_name = bucket_name

    async def upload_file(
        self,
        user_id: str,
        session_id: str,
        file: UploadFile,
    ) -> dict[str, Any]:
        """Validate and upload file, then persist chunks and metadata."""
        await self._session_service.get_session(user_id, session_id)
        existing_files = await self._file_repo.count_by_session(session_id)
        if existing_files >= MAX_FILES_PER_SESSION:
            raise ValueError("Maximum 4 files per session")

        filename = str(getattr(file, "filename", ""))
        content_type = str(getattr(file, "content_type", ""))
        extension = (
            filename.rsplit(".", maxsplit=1)[-1].lower() if "." in filename else ""
        )
        if extension not in SUPPORTED_EXTENSIONS:
            raise ValueError("Unsupported file type")

        payload = await file.read()
        if len(payload) > settings.max_file_size_mb * 1024 * 1024:
            raise ValueError("File size exceeds 5MB limit")

        text = self._extract_text(payload, filename, content_type).strip()
        if not text:
            raise ValueError("File has no extractable text")

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
        )
        chunks = splitter.split_text(text)

        try:
            embeddings = await self._embed_chunks(chunks)
        except Exception as exc:  # pragma: no cover - external provider behavior
            raise ValueError(f"Embedding failed: {exc}") from exc

        object_key = f"{user_id}/{session_id}/{uuid4()}/{filename}"
        result = self._minio_client.put_object(
            self._bucket_name,
            object_key,
            data=BytesIO(payload),
            length=len(payload),
            content_type=content_type or "application/octet-stream",
        )

        metadata = await self._file_repo.create(
            {
                "session_id": session_id,
                "user_id": user_id,
                "filename": filename,
                "mime_type": content_type,
                "size_bytes": len(payload),
                "minio_bucket": self._bucket_name,
                "object_key": object_key,
                "etag": getattr(result, "etag", None),
                "created_at": datetime.now(UTC),
            }
        )

        try:
            await self._chunk_repo.insert_many(
                [
                    {
                        "file_id": metadata["id"],
                        "session_id": session_id,
                        "user_id": user_id,
                        "content": content,
                        "chunk_index": index,
                    }
                    for index, content in enumerate(chunks)
                ]
            )
            await self._vector_service.index_chunks(
                session_id=session_id,
                file_id=str(metadata["id"]),
                user_id=user_id,
                chunks=chunks,
                embeddings=embeddings,
            )
        except Exception as exc:  # pragma: no cover - external provider behavior
            await self._chunk_repo.delete_by_file(str(metadata["id"]))
            await self._file_repo.delete(metadata["id"])
            self._minio_client.remove_object(self._bucket_name, object_key)
            raise ValueError("Failed to persist chunks") from exc

        return metadata

    async def _embed_chunks(self, chunks: list[str]) -> list[list[float]]:
        """Embed chunks in small batches to avoid provider payload limits."""
        vectors: list[list[float]] = []
        for start in range(0, len(chunks), EMBED_BATCH_SIZE):
            batch = chunks[start : start + EMBED_BATCH_SIZE]
            batch_vectors = await self._embedder.aembed_documents(batch)
            vectors.extend(batch_vectors)
        return vectors

    async def list_files(self, user_id: str, session_id: str) -> list[dict[str, Any]]:
        """List file metadata for an owned session."""
        await self._session_service.get_session(user_id, session_id)
        files = await self._file_repo.find_by_session(session_id)
        return [item for item in files if item.get("user_id") == user_id]

    async def delete_file(self, user_id: str, session_id: str, file_id: str) -> None:
        """Delete file metadata, chunks, and MinIO object."""
        await self._session_service.get_session(user_id, session_id)
        row = await self._file_repo.find_by_user_and_id(user_id, file_id)
        if row is None or str(row.get("session_id")) != session_id:
            raise ValueError("File not found")

        await self._vector_service.delete_file_vectors(file_id)
        await self._chunk_repo.delete_by_file(file_id)
        self._minio_client.remove_object(
            str(row.get("minio_bucket", self._bucket_name)),
            str(row.get("object_key", "")),
        )
        await self._file_repo.delete(file_id)

    def _extract_text(self, content: bytes, filename: str, mime_type: str) -> str:
        """Dispatch file content extraction by extension and mime type."""
        extension = (
            filename.rsplit(".", maxsplit=1)[-1].lower() if "." in filename else ""
        )
        if extension == "pdf" or mime_type == "application/pdf":
            return self._extract_pdf(content)
        if extension == "docx" or (
            mime_type
            == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ):
            return self._extract_docx(content)
        if extension in {"txt", "md", "csv", "json"}:
            return self._extract_plain(content)
        raise ValueError("Unsupported file type")

    def _extract_pdf(self, content: bytes) -> str:
        """Extract text from PDF bytes."""
        reader = PdfReader(BytesIO(content))
        return "\n".join((page.extract_text() or "") for page in reader.pages)

    def _extract_docx(self, content: bytes) -> str:
        """Extract text from DOCX bytes."""
        document = Document(BytesIO(content))
        return "\n".join(paragraph.text for paragraph in document.paragraphs)

    def _extract_plain(self, content: bytes) -> str:
        """Extract UTF-8 text from plain text-like files."""
        return content.decode("utf-8", errors="ignore")
