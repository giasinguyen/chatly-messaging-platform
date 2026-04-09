from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings

_client: AsyncIOMotorClient[dict[str, Any]] | None = None


def get_client() -> AsyncIOMotorClient[dict[str, Any]]:
    """Return the singleton MongoDB client."""
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(
            settings.mongodb_uri,
            serverSelectionTimeoutMS=5000,
        )
    return _client


def get_db() -> AsyncIOMotorDatabase[dict[str, Any]]:
    """Return the configured MongoDB database."""
    return get_client()[settings.mongodb_db_name]


async def close_client() -> None:
    """Close MongoDB client if it exists."""
    global _client
    if _client is not None:
        _client.close()
        _client = None


def to_str_id(doc: dict[str, Any] | None) -> dict[str, Any] | None:
    """Convert MongoDB _id ObjectId field to an id string."""
    if doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


def to_object_id(id_str: str) -> ObjectId:
    """Convert a string id to ObjectId."""
    try:
        return ObjectId(id_str)
    except Exception as exc:  # pragma: no cover - pymongo raises multiple types
        raise ValueError(f"Invalid id format: {id_str}") from exc
