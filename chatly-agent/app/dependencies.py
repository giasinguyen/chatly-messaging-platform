from typing import Any

from fastapi import Depends, Header
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.agents.chatbot_agent import ChatbotAgent
from app.db.mongo import get_db
from app.db.qdrant import get_client as get_qdrant_client
from app.models.context import RequestContext
from app.repositories.chunk_repo import ChunkRepository
from app.repositories.file_repo import FileRepository
from app.repositories.mcp_repo import MCPRepository
from app.repositories.message_repo import MessageRepository
from app.repositories.qdrant_repo import QdrantRepository
from app.repositories.session_repo import SessionRepository
from app.services.chat_service import ChatService
from app.services.file_service import FileService
from app.services.mcp_service import MCPService
from app.services.session_service import SessionService
from app.services.system_mcp import SystemMCPService
from app.services.tool_service import ToolService
from app.services.vector_service import VectorService
from app.storage.minio import get_bucket_name, get_storage_client
from app.utils.embeddings import get_embedder
from app.utils.llm import get_llm
from app.utils.security import verify_api_key


def get_database() -> AsyncIOMotorDatabase[dict[str, Any]]:
    """Provide MongoDB database dependency."""
    return get_db()


def get_session_repository(
    db: AsyncIOMotorDatabase[dict[str, Any]] = Depends(get_database),  # noqa: B008
) -> SessionRepository:
    """Build session repository dependency."""
    return SessionRepository(collection=db["sessions"])


def get_message_repository(
    db: AsyncIOMotorDatabase[dict[str, Any]] = Depends(get_database),  # noqa: B008
) -> MessageRepository:
    """Build message repository dependency."""
    return MessageRepository(collection=db["messages"])


def get_file_repository(
    db: AsyncIOMotorDatabase[dict[str, Any]] = Depends(get_database),  # noqa: B008
) -> FileRepository:
    """Build file repository dependency."""
    return FileRepository(collection=db["files"])


def get_chunk_repository(
    db: AsyncIOMotorDatabase[dict[str, Any]] = Depends(get_database),  # noqa: B008
) -> ChunkRepository:
    """Build chunk repository dependency."""
    return ChunkRepository(collection=db["chunks"])


def get_qdrant_repository() -> QdrantRepository:
    """Build Qdrant vector repository dependency."""
    return QdrantRepository(client=get_qdrant_client())


def get_chatbot_agent() -> ChatbotAgent:
    """Build chatbot agent dependency."""
    return ChatbotAgent(llm=get_llm())


def get_vector_service(
    chunk_repo: ChunkRepository = Depends(get_chunk_repository),  # noqa: B008
    qdrant_repo: QdrantRepository = Depends(get_qdrant_repository),  # noqa: B008
) -> VectorService:
    """Build vector service dependency."""
    return VectorService(
        chunk_repo=chunk_repo,
        qdrant_repo=qdrant_repo,
        embedder=get_embedder(),
    )


def get_session_service(
    session_repo: SessionRepository = Depends(get_session_repository),  # noqa: B008
    message_repo: MessageRepository = Depends(get_message_repository),  # noqa: B008
) -> SessionService:
    """Build session service dependency."""
    return SessionService(session_repo=session_repo, message_repo=message_repo)


def get_mcp_repository(
    db: AsyncIOMotorDatabase[dict[str, Any]] = Depends(get_database),  # noqa: B008
) -> MCPRepository:
    """Build MCP server repository dependency."""
    return MCPRepository(collection=db["mcp_servers"])


def get_mcp_service(
    mcp_repo: MCPRepository = Depends(get_mcp_repository),  # noqa: B008
) -> MCPService:
    """Build MCP service dependency."""
    return MCPService(mcp_repo=mcp_repo)


def get_system_mcp_service() -> SystemMCPService:
    """Build system MCP service dependency."""
    return SystemMCPService()


def get_tool_service(
    mcp_service: MCPService = Depends(get_mcp_service),  # noqa: B008
    system_mcp_service: SystemMCPService = Depends(get_system_mcp_service),  # noqa: B008
) -> ToolService:
    """Build tool assembly service dependency."""
    return ToolService(mcp_service=mcp_service, system_mcp_service=system_mcp_service)


def get_chat_service(
    session_service: SessionService = Depends(get_session_service),  # noqa: B008
    message_repo: MessageRepository = Depends(get_message_repository),  # noqa: B008
    chatbot_agent: ChatbotAgent = Depends(get_chatbot_agent),  # noqa: B008
    vector_service: VectorService = Depends(get_vector_service),  # noqa: B008
    tool_service: ToolService = Depends(get_tool_service),  # noqa: B008
    file_repo: FileRepository = Depends(get_file_repository),  # noqa: B008
) -> ChatService:
    """Build chat service dependency."""
    from app.config import settings
    checkpointer = None
    if settings.app_env != "test":
        from app.db.checkpointer import get_checkpointer
        checkpointer = get_checkpointer()
    return ChatService(
        session_service=session_service,
        message_repo=message_repo,
        chatbot_agent=chatbot_agent,
        vector_service=vector_service,
        tool_service=tool_service,
        llm=get_llm(),
        file_repo=file_repo,
        minio_client=get_storage_client(),
        bucket_name=get_bucket_name(),
        checkpointer=checkpointer,
    )


def get_file_service(
    session_service: SessionService = Depends(get_session_service),  # noqa: B008
    file_repo: FileRepository = Depends(get_file_repository),  # noqa: B008
    chunk_repo: ChunkRepository = Depends(get_chunk_repository),  # noqa: B008
    vector_service: VectorService = Depends(get_vector_service),  # noqa: B008
) -> FileService:
    """Build file service dependency."""
    return FileService(
        session_service=session_service,
        file_repo=file_repo,
        chunk_repo=chunk_repo,
        vector_service=vector_service,
        embedder=get_embedder(),
        minio_client=get_storage_client(),
        bucket_name=get_bucket_name(),
    )


async def get_request_context(
    _: None = Depends(verify_api_key),  # noqa: B008
    x_user_id: str = Header(..., alias="X-User-Id"),  # noqa: B008
) -> RequestContext:
    """
    Primary dependency for all protected endpoints.
    Replaces the old get_current_user() JWT-based dependency.
    """
    return RequestContext(user_id=x_user_id)
