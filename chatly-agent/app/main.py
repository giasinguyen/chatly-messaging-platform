from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.db.mongo import close_client, get_client
from app.db.qdrant import close_client as close_qdrant_client
from app.db.qdrant import get_client as get_qdrant_client
from app.exceptions import (
    MCPConnectionError,
    MCPServerNotFoundError,
    SessionNotFoundError,
)
from app.logging_config import setup_logging
from app.middleware.request_id import RequestIDMiddleware
from app.routers.chat import router as chat_router
from app.routers.files import router as files_router
from app.routers.health import router as health_router
from app.routers.mcp import router as mcp_router
from app.routers.sessions import router as sessions_router
from app.storage.minio import ensure_bucket_exists, get_bucket_name, get_storage_client

setup_logging(settings.log_level)



@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Manage MongoDB connection lifecycle."""
    _ = app
    if settings.app_env != "test":
        client = get_client()
        await client.admin.command("ping")
        qdrant_client = get_qdrant_client()
        await qdrant_client.get_collections()
        ensure_bucket_exists(get_storage_client(), get_bucket_name())
    yield
    await close_client()
    await close_qdrant_client()


app = FastAPI(
    title="agent-server",
    version="0.1.0",
    lifespan=lifespan,
    description="LangGraph-powered AI agent server with RAG, MCP tools, and web search.",
)

app.add_middleware(RequestIDMiddleware)
if settings.app_env == "development":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(health_router)
app.include_router(sessions_router)
app.include_router(chat_router)
app.include_router(files_router)
app.include_router(mcp_router)


@app.exception_handler(SessionNotFoundError)
async def session_not_found_handler(
    request: Request,
    exc: SessionNotFoundError,
) -> JSONResponse:
    """Map SessionNotFoundError to HTTP 404."""
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(MCPConnectionError)
async def mcp_connection_error_handler(
    request: Request,
    exc: MCPConnectionError,
) -> JSONResponse:
    """Map MCPConnectionError to HTTP 400."""
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.exception_handler(MCPServerNotFoundError)
async def mcp_not_found_handler(
    request: Request,
    exc: MCPServerNotFoundError,
) -> JSONResponse:
    """Map MCPServerNotFoundError to HTTP 404."""
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    """Catch-all handler — logs the full traceback so silent 500s are visible."""
    import logging as _logging
    _logging.getLogger(__name__).exception(
        "Unhandled exception on %s %s", request.method, request.url.path
    )
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})
