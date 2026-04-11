from __future__ import annotations

import uuid
from collections.abc import Sequence
from typing import Any

from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models

from app.config import settings


class QdrantRepository:
    """Repository for vector operations stored in Qdrant."""

    def __init__(self, client: AsyncQdrantClient) -> None:
        self._client = client
        self._collection_name = settings.qdrant_collection_name
        self._vector_size = settings.qdrant_vector_size
        self._collection_ready = False

    async def _ensure_collection(self) -> None:
        """Create collection on first use when it does not exist."""
        if self._collection_ready:
            return
        exists = await self._client.collection_exists(self._collection_name)
        if not exists:
            await self._client.create_collection(
                collection_name=self._collection_name,
                vectors_config=models.VectorParams(
                    size=self._vector_size,
                    distance=models.Distance.COSINE,
                ),
            )
        self._collection_ready = True

    async def upsert_chunks(
        self,
        session_id: str,
        file_id: str,
        user_id: str,
        chunks: Sequence[str],
        embeddings: Sequence[Sequence[float]],
    ) -> None:
        """Persist chunk vectors and payloads to Qdrant."""
        await self._ensure_collection()

        points: list[models.PointStruct] = []
        for index, (content, vector) in enumerate(zip(chunks, embeddings, strict=True)):
            points.append(
                models.PointStruct(
                    id=str(uuid.uuid4()),
                    vector=list(vector),
                    payload={
                        "session_id": session_id,
                        "file_id": file_id,
                        "user_id": user_id,
                        "content": content,
                        "chunk_index": index,
                    },
                )
            )

        if points:
            await self._client.upsert(
                collection_name=self._collection_name,
                points=points,
                wait=True,
            )

    async def search(
        self,
        embedding: list[float],
        session_id: str,
        top_k: int = 5,
        threshold: float = 0.5,
    ) -> list[dict[str, Any]]:
        """Search vectors by session and return payload rows with similarity score."""
        await self._ensure_collection()

        query_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="session_id",
                    match=models.MatchValue(value=session_id),
                )
            ]
        )
        response = await self._client.query_points(
            collection_name=self._collection_name,
            query=embedding,
            query_filter=query_filter,
            with_payload=True,
            limit=top_k,
            score_threshold=threshold,
        )

        rows: list[dict[str, Any]] = []
        for point in response.points:
            payload = point.payload or {}
            if not isinstance(payload, dict):
                continue
            row = dict(payload)
            row["score"] = float(point.score)
            rows.append(row)
        return rows

    async def delete_by_file(self, file_id: str) -> None:
        """Delete all vectors related to one file id."""
        await self._ensure_collection()

        selector = models.FilterSelector(
            filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="file_id",
                        match=models.MatchValue(value=file_id),
                    )
                ]
            )
        )
        await self._client.delete(
            collection_name=self._collection_name,
            points_selector=selector,
            wait=True,
        )
