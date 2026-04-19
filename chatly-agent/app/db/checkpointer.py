"""MongoDBSaver singleton for LangGraph graph checkpoints.

Initialized once during FastAPI startup. Uses a dedicated synchronous
PyMongo client (separate from the Motor client used for application data).
The async ``aput``/``aget`` methods on MongoDBSaver run the underlying
sync operations in a thread-pool executor, making them safe to call from
async request handlers.
"""
import logging

from langgraph.checkpoint.mongodb import MongoDBSaver
from pymongo import MongoClient

from app.config import settings

logger = logging.getLogger(__name__)

_checkpointer: MongoDBSaver | None = None
_pymongo_client: MongoClient | None = None


def get_checkpointer() -> MongoDBSaver:
    """Return the singleton MongoDBSaver instance.

    Creates the PyMongo client and indexes on first call (idempotent).
    Safe to call multiple times — subsequent calls return the cached instance.
    """
    global _checkpointer, _pymongo_client
    if _checkpointer is None:
        _pymongo_client = MongoClient(settings.mongodb_uri)
        _checkpointer = MongoDBSaver(
            _pymongo_client,
            db_name=settings.mongodb_db_name,
        )
        logger.info("MongoDBSaver initialised db=%s", settings.mongodb_db_name)
    return _checkpointer


def close_checkpointer() -> None:
    """Close the PyMongo client. Called during app shutdown."""
    global _checkpointer, _pymongo_client
    if _pymongo_client is not None:
        _pymongo_client.close()
        _pymongo_client = None
        _checkpointer = None
