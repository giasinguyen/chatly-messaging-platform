from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.db.mongo import close_client, get_client
from app.db.qdrant import close_client as close_qdrant_client
from app.db.qdrant import get_client as get_qdrant_client
from app.exceptions import (
    AgentError,
    AuthError,
    DocumentNotFoundError,
    LLMRateLimitError,
    MCPConnectionError,
    MCPServerNotFoundError,
    SessionNotFoundError,
    VectorSearchError,
)
from app.limiter import limiter
from app.logging_config import setup_logging
from app.middleware.request_id import RequestIDMiddleware
from app.routers.auth import router as auth_router
from app.routers.chat import router as chat_router
from app.routers.files import router as files_router
from app.routers.health import router as health_router
from app.routers.mcp import router as mcp_router
from app.routers.sessions import router as sessions_router
from app.routers.users import router as users_router

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
    yield
    await close_client()
    await close_qdrant_client()


app = FastAPI(
    title="agent-server",
    version="0.1.0",
    lifespan=lifespan,
    description="LangGraph-powered AI agent server with RAG, MCP tools, and web search.",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(sessions_router)
app.include_router(chat_router)
app.include_router(files_router)
app.include_router(users_router)
app.include_router(mcp_router)


@app.exception_handler(SessionNotFoundError)
async def session_not_found_handler(
    request: Request,
    exc: SessionNotFoundError,
) -> JSONResponse:
    """Map SessionNotFoundError to HTTP 404."""
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(LLMRateLimitError)
async def rate_limit_handler(
    request: Request,
    exc: LLMRateLimitError,
) -> JSONResponse:
    """Map LLMRateLimitError to HTTP 429."""
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Retry later."},
    )


@app.exception_handler(AuthError)
async def auth_error_handler(request: Request, exc: AuthError) -> JSONResponse:
    """Map AuthError to HTTP 401."""
    return JSONResponse(status_code=401, content={"detail": str(exc)})


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


@app.exception_handler(DocumentNotFoundError)
async def document_not_found_handler(
    request: Request,
    exc: DocumentNotFoundError,
) -> JSONResponse:
    """Map DocumentNotFoundError to HTTP 404."""
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(VectorSearchError)
async def vector_search_error_handler(
    request: Request,
    exc: VectorSearchError,
) -> JSONResponse:
    """Map VectorSearchError to HTTP 502."""
    return JSONResponse(status_code=502, content={"detail": str(exc)})


@app.exception_handler(AgentError)
async def agent_error_handler(request: Request, exc: AgentError) -> JSONResponse:
    """Map AgentError to HTTP 500."""
    return JSONResponse(
        status_code=500, content={"detail": "Agent execution failed"}
    )
