from qdrant_client import AsyncQdrantClient

from app.config import settings

_client: AsyncQdrantClient | None = None


def get_client() -> AsyncQdrantClient:
    """Return the singleton Qdrant async client."""
    global _client
    if _client is None:
        api_key = settings.qdrant_api_key or None
        _client = AsyncQdrantClient(
            url=settings.qdrant_url,
            api_key=api_key,
            timeout=10,
        )
    return _client


async def close_client() -> None:
    """Close Qdrant async client if it exists."""
    global _client
    if _client is not None:
        await _client.close()
        _client = None
