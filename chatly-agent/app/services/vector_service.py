from typing import Any, Protocol

from app.repositories.chunk_repo import ChunkRepository
from app.repositories.qdrant_repo import QdrantRepository


class QueryEmbedder(Protocol):
    """Protocol for embedding a single query string."""

    async def aembed_query(self, text: str) -> list[float]:
        """Return embedding vector for query text."""


class VectorService:
    """Service layer for embedding and vector retrieval."""

    def __init__(
        self,
        chunk_repo: ChunkRepository,
        qdrant_repo: QdrantRepository,
        embedder: QueryEmbedder,
    ) -> None:
        self._chunk_repo = chunk_repo
        self._qdrant_repo = qdrant_repo
        self._embedder = embedder

    async def similarity_search(
        self,
        query: str,
        session_id: str,
        top_k: int = 5,
        threshold: float = 0.5,
        conversation_id: str | None = None,
    ) -> list[dict[str, Any]]:
        """Embed query text then run vector search in Qdrant.

        When *conversation_id* is provided the search spans both the session
        scope and the conversation scope (OR logic).
        """
        embedding = await self._embedder.aembed_query(query)
        if conversation_id:
            return await self._qdrant_repo.search_combined(
                embedding, session_id, conversation_id, top_k, threshold
            )
        return await self._qdrant_repo.search(
            embedding,
            session_id,
            top_k,
            threshold,
        )

    async def index_chunks(
        self,
        session_id: str,
        file_id: str,
        user_id: str,
        chunks: list[str],
        embeddings: list[list[float]],
        filename: str = "",
        conversation_id: str | None = None,
    ) -> None:
        """Store chunk vectors in Qdrant for later retrieval."""
        if len(chunks) != len(embeddings):
            raise ValueError("Chunks and embeddings size mismatch")
        await self._qdrant_repo.upsert_chunks(
            session_id=session_id,
            file_id=file_id,
            user_id=user_id,
            chunks=chunks,
            embeddings=embeddings,
            filename=filename,
            conversation_id=conversation_id,
        )

    async def delete_file_vectors(self, file_id: str) -> None:
        """Delete all vectors associated with one file from Qdrant."""
        await self._qdrant_repo.delete_by_file(file_id)

    async def has_context(
        self,
        session_id: str,
        conversation_id: str | None = None,
    ) -> bool:
        """Return True when at least one chunk exists in the session or conversation."""
        if (await self._chunk_repo.count_by_session(session_id)) > 0:
            return True
        if conversation_id:
            return (await self._chunk_repo.count_by_conversation(conversation_id)) > 0
        return False
