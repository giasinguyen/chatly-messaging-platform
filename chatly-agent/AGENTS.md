# AGENTS.md — Chatly Agent

> Module-specific coding guide for `chatly-agent`.
> Read the root `AGENTS.md` first. This file adds rules for the Python/FastAPI/LangGraph agent service.

---

## Table of Contents

1. [Scope](#1-scope)
2. [Tech Stack](#2-tech-stack)
3. [Project Layout](#3-project-layout)
4. [Architecture Rules](#4-architecture-rules)
5. [Coding Conventions](#5-coding-conventions)
6. [Agent Patterns](#6-agent-patterns)
7. [LangGraph Patterns](#7-langgraph-patterns)
8. [FastAPI Patterns](#8-fastapi-patterns)
9. [Persistence and Storage](#9-persistence-and-storage)
10. [MCP and Tools](#10-mcp-and-tools)
11. [Error Handling](#11-error-handling)
12. [Testing](#12-testing)
13. [Linting and Commands](#13-linting-and-commands)
14. [Pre-Commit Checklist](#14-pre-commit-checklist)

---

## 1. Scope

`chatly-agent` owns AI workflows for the Chatly platform:

- Interactive chat with plain conversation, RAG, tools, image generation, and SSE streaming.
- Session and message persistence for AI conversations.
- File ingestion, text extraction, chunking, embeddings, and Qdrant indexing.
- User-owned MCP server registration and tool wrapping.
- System MCP integration with `chatly-backend`.
- Group `@AI` mention handling, social AI replies, daily briefings, and internal conversation file indexing.

`chatly-agent` does not own user authentication, main chat storage, WebSocket delivery, or public client APIs. Those belong to `chatly-backend`.

---

## 2. Tech Stack

| Area | Technology |
|---|---|
| Runtime | Python 3.12+ |
| Package manager | `uv` |
| API | FastAPI, Uvicorn |
| Settings | `pydantic-settings` |
| Agents | LangGraph, LangChain, Groq `ChatGroq` |
| Checkpointing | `langgraph-checkpoint-mongodb` |
| Database | MongoDB with Motor async driver |
| Vector store | Qdrant |
| Object storage | MinIO-compatible client or AWS S3 |
| Embeddings | HuggingFace Inference API |
| Web search | Tavily |
| Image tools | HuggingFace, Pillow, Gradio Client |
| MCP | `mcp` SDK for SSE, raw JSON-RPC 2.0 over HTTP |
| Tests | pytest, pytest-asyncio, pytest-cov, mongomock-motor, respx |
| Quality | Ruff, mypy |

Use `uv` for dependency management. Do not install or run project dependencies with raw `pip` commands unless explicitly debugging an environment issue.

---

## 3. Project Layout

```text
chatly-agent/
├── app/
│   ├── main.py                 # FastAPI app, lifespan, middleware, exception handlers
│   ├── config.py               # Settings loaded from environment variables
│   ├── dependencies.py         # FastAPI dependency factories
│   ├── exceptions.py           # Domain exceptions
│   ├── logging_config.py       # Logging setup
│   ├── agents/                 # ChatbotAgent, UnifiedAgent, MentionAgent, SocialAgent
│   ├── db/                     # MongoDB, Qdrant, and LangGraph checkpointer clients
│   ├── graphs/                 # Custom LangGraph graph builders
│   ├── middleware/             # Request ID middleware
│   ├── models/                 # Pydantic request/response/internal schemas
│   ├── prompts/                # System prompts
│   ├── repositories/           # MongoDB and Qdrant data access
│   ├── routers/                # HTTP route handlers
│   ├── services/               # Business workflows and orchestration
│   ├── storage/                # MinIO/S3-compatible storage client
│   ├── tools/                  # LangChain tool factories
│   └── utils/                  # LLM, embeddings, security helpers
├── tests/
│   ├── fixtures/
│   ├── integration/
│   └── unit/
├── ARCHITECTURE.md
├── README.md
├── Makefile
├── pyproject.toml
└── uv.lock
```

Placement rules:

- Put HTTP request/response code in `app/routers/`.
- Put business orchestration in `app/services/`.
- Put MongoDB and Qdrant I/O in `app/repositories/`.
- Put LangGraph and LLM invocation in `app/agents/` and `app/graphs/`.
- Put reusable LangChain tool factories in `app/tools/`.
- Put Pydantic schemas in `app/models/`.
- Put shared client factories in `app/db/`, `app/storage/`, and `app/utils/`.

---

## 4. Architecture Rules

### 4.1 Layer Boundaries

| Layer | May do | Must not do |
|---|---|---|
| Routers | Validate HTTP shape, inject dependencies, return HTTP responses | Business logic, direct database calls |
| Services | Orchestrate use cases, enforce ownership, select agents, coordinate repositories | Direct Motor queries |
| Repositories | Query MongoDB/Qdrant and serialize persistence documents | Business workflows, LLM calls |
| Agents | Build prompts/messages, invoke LangGraph/LLM, perform deterministic publish steps | Direct database calls |
| Tools | Wrap external capabilities as LangChain tools | Session ownership decisions |
| DB/storage clients | Create singleton clients and low-level helpers | Business logic |

### 4.2 Internal Service Boundary

`chatly-agent` is called by `chatly-backend`, not by frontend or mobile clients. Public protected endpoints use:

```http
X-API-Key: <INTERNAL_API_KEY>
X-User-Id: <user_id>
```

Internal trigger endpoints under `/internal/**` use `X-API-Key` and receive user/conversation IDs in the request body.

### 4.3 Configuration

- All secrets must come from environment variables.
- `.env.example` must contain placeholders only.
- Settings belong in `app/config.py`.
- Do not add global configuration reads throughout the codebase if dependency injection is already available.

---

## 5. Coding Conventions

### 5.1 Python Style

- Use Python 3.12 syntax.
- Type every function signature, including return types.
- Prefer `collections.abc` imports for collection protocols such as `AsyncIterator`.
- Use `async`/`await` for DB, HTTP, storage, and LLM I/O.
- Use `logging.getLogger(__name__)`; never commit `print()`.
- Keep service functions and agent methods around 50 lines or less. Extract helpers when a workflow grows.
- Comments should explain why something is non-obvious, not restate what the code says.

```python
async def get_session(user_id: str, session_id: str) -> dict[str, object]:
    """Return one owned session or raise SessionNotFoundError."""
    session = await self._session_repo.find_by_user_and_id(user_id, session_id)
    if session is None:
        raise SessionNotFoundError("Session not found")
    return session
```

### 5.2 Naming

| Artifact | Convention | Example |
|---|---|---|
| Classes | `PascalCase` | `ChatService`, `UnifiedAgent` |
| Functions and methods | `snake_case` | `stream_chat`, `get_live_tools` |
| Variables | `snake_case` | `session_id`, `generated_attachments` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_FILES_PER_SESSION` |
| Private helpers | `_single_leading_underscore` | `_select_agent` |
| Files | `snake_case.py` | `tool_service.py` |
| Tests | `test_snake_case.py` | `test_chat_api.py` |

Boolean names must use `is_`, `has_`, `can_`, or `should_` when practical.

### 5.3 Imports

Order imports as standard library, third-party, then internal modules. Use absolute imports from `app`.

```python
import logging
from collections.abc import AsyncIterator
from typing import Any

from fastapi import Depends
from langchain_core.tools import BaseTool

from app.models.chat import ChatInput
from app.services.vector_service import VectorService
```

### 5.4 Pydantic Models

- Request and response schemas live in `app/models/`.
- Use `Field(default_factory=list)` for list defaults.
- Keep internal agent input/output schemas separate from HTTP schemas when their responsibilities differ.
- Use `model_config = {"frozen": True}` for immutable internal input models when mutation is not intended.

```python
class ChatRequest(BaseModel):
    """Incoming chat payload for one turn."""

    message: str = Field(..., min_length=1, max_length=8192)
    use_web_search: bool = False
    mcp_server_ids: list[str] = Field(default_factory=list)
    file_ids: list[str] = Field(default_factory=list)
```

---

## 6. Agent Patterns

### 6.1 BaseAgent Contract

Interactive agents implement `BaseAgent` from `app/agents/base.py`.

```python
class BaseAgent(ABC):
    """Contract that every interactive agent must fulfill."""

    agent_type: str

    @abstractmethod
    async def ainvoke(
        self,
        input: ChatInput,
        config: dict[str, Any] | None = None,
    ) -> ChatOutput:
        """Run a full agent turn and return the final response."""
        ...

    @abstractmethod
    async def astream_events(
        self,
        input: ChatInput,
        config: dict[str, Any],
    ) -> AsyncIterator[dict[str, Any]]:
        """Yield LangGraph v2 stream events."""
        ...
```

Do not introduce a separate `astream()` token-only contract. `ChatService.stream_chat()` consumes LangGraph event streams so it can emit token, tool, error, and done SSE frames.

### 6.2 ChatbotAgent

Use `ChatbotAgent` for plain conversation without tools or indexed context.

- Prepend `CHATLY_SYSTEM_PROMPT`.
- Inject persisted message history from MongoDB.
- Use `build_chatbot_graph()` for blocking calls.
- Stream directly from the LLM as `on_chat_model_stream`-compatible events.

### 6.3 UnifiedAgent

Use `UnifiedAgent` for interactive requests with tools, RAG, web search, or image generation.

- Build a fresh ReAct graph per request.
- Pass only the tools relevant to that request.
- Inject `UNIFIED_AGENT_SYSTEM_PROMPT` with `user_id` and runtime `session_context`.
- Use MongoDBSaver checkpointing outside test mode.

### 6.4 MentionAgent

Use `MentionAgent` for `/internal/assist`.

- It handles group `@AI` mention flows.
- It may use research/context MCP tools in a ReAct loop.
- It removes `sendAiMessage` from the LLM tool loop and calls it programmatically after text generation.
- It excludes `sendTextMessage` to avoid duplicate group messages.

### 6.5 SocialAgent

Use `SocialAgent` for `/internal/social/mention-comment` and `/internal/social/post-command`.

- It may use research tools in a ReAct loop.
- It resolves the publish tool for `createAiPostComment`.
- It programmatically publishes the final reply after generation.

### 6.6 Agent Selection

`ChatService._select_agent()` chooses between `ChatbotAgent` and `UnifiedAgent` for interactive chat:

- Use `UnifiedAgent` when tools are available, session/conversation vector context exists, or image generation tools are available.
- Use `ChatbotAgent` only when the request has no tools and no indexed context.

System MCP tools are included automatically when `CHATLY_BACKEND_MCP_URL` is configured. User MCP tools are included only for requested `mcp_server_ids`. Tavily is included only when `use_web_search=True` and configured.

---

## 7. LangGraph Patterns

### 7.1 Custom Graphs

Custom graph builders belong in `app/graphs/`. Keep graph nodes small, async when they perform I/O, and free of persistence side effects.

```python
class ChatbotState(TypedDict):
    """State for the chatbot graph."""

    messages: Annotated[list[BaseMessage], add_messages]
```

```python
def build_chatbot_graph(llm: ChatGroq) -> CompiledStateGraph:
    """Build the simple chatbot graph."""
    graph = StateGraph(ChatbotState)
    graph.add_node("llm", partial(llm_node, llm=llm))
    graph.set_entry_point("llm")
    graph.add_edge("llm", END)
    return graph.compile()
```

### 7.2 ReAct Graphs

Use `langgraph.prebuilt.create_react_agent` for tool-capable agents. Do not hand-roll ReAct loops unless the workflow needs deterministic steps that the graph cannot express cleanly.

### 7.3 Streaming

Agents should yield LangGraph v2 style events from `astream_events()`. `ChatService` is responsible for translating these events to the SSE wire format in `app/models/stream.py`.

---

## 8. FastAPI Patterns

### 8.1 Routers

Routers must stay thin:

- Accept path/body/query parameters.
- Resolve dependencies with `Depends`.
- Map local validation errors to HTTP exceptions when appropriate.
- Return Pydantic response models or `StreamingResponse`.
- Delegate workflows to services.

```python
@router.post("/chat", response_model=ChatResponse)
async def invoke_chat(
    session_id: str,
    payload: ChatRequest,
    ctx: RequestContext = Depends(get_request_context),  # noqa: B008
    service: ChatService = Depends(get_chat_service),  # noqa: B008
) -> ChatResponse:
    """Run one chat turn and return full response."""
    return await service.chat(
        user_id=ctx.user_id,
        session_id=session_id,
        request=payload,
    )
```

### 8.2 Dependencies

All dependency factories belong in `app/dependencies.py`.

- Build repositories from `get_database()`.
- Build services from repositories and other services.
- Build agents and utility clients through existing factory functions.
- Use `get_request_context()` for protected public endpoints.

### 8.3 Application Lifespan

`app/main.py` owns startup/shutdown checks:

- Ping MongoDB.
- Check Qdrant availability.
- Ensure the MinIO bucket exists when using MinIO storage.
- Initialize and close the LangGraph MongoDB checkpointer outside test mode.
- Close MongoDB and Qdrant clients on shutdown.

Do not create ad hoc database clients in routers, services, or agents.

---

## 9. Persistence and Storage

### 9.1 MongoDB Collections

| Collection | Purpose | Repository |
|---|---|---|
| `sessions` | AI chat sessions | `SessionRepository` |
| `messages` | Messages and attachments per session | `MessageRepository` |
| `files` | Uploaded or indexed file metadata | `FileRepository` |
| `chunks` | Extracted text chunks | `ChunkRepository` |
| `mcp_servers` | User-owned MCP server configs | `MCPRepository` |

LangGraph checkpoints are also stored in MongoDB through `MongoDBSaver`.

### 9.2 ObjectId Serialization

- MongoDB stores native `_id` values.
- Repositories return serialized `id` strings.
- Do not expose raw `_id` outside repositories.
- Convert inbound ID strings with `to_object_id()` in repository code.

```python
def to_str_id(doc: dict[str, Any]) -> dict[str, Any]:
    """Convert MongoDB _id to public id."""
    if doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc
```

### 9.3 Qdrant

Qdrant stores embeddings for chunks. Use `QdrantRepository` for vector I/O.

- Session uploads are scoped by `session_id`.
- Backend-indexed group files may also be scoped by `conversation_id`.
- `VectorService.similarity_search()` may search both scopes when a session has `context_conversation_id`.

Do not use MongoDB Atlas Vector Search in this module.

### 9.4 File Storage

Use `app/storage/minio.py` for both local MinIO-compatible storage and AWS S3.

- `STORAGE_PROVIDER=minio` uses `MINIO_*` settings.
- `STORAGE_PROVIDER=s3` uses `STORAGE_*` settings.
- S3 buckets should be provisioned outside the application.
- MinIO buckets may be created by `ensure_bucket_exists()`.

### 9.5 File Processing

`FileService` owns upload, validation, extraction, chunking, embedding, storage, and cleanup.

- Supported extensions: `txt`, `md`, `pdf`, `docx`, `csv`, `json`, `jpeg`, `jpg`, `png`, `webp`.
- Text files are extracted, chunked, embedded, and indexed.
- Images are stored as attachments and metadata, not embedded as text.
- Keep maximum file count and batch-size constants at module level.

---

## 10. MCP and Tools

### 10.1 ToolService

`ToolService` assembles tools in this order:

1. System MCP tools from `chatly-backend`, when configured.
2. User-owned MCP tools requested by `mcp_server_ids`.
3. Tavily web search when requested and configured.

`ChatService` appends RAG and image generation tools separately.

### 10.2 User-Owned MCP Servers

User servers are stored in `mcp_servers`.

- Default transport is raw HTTP JSON-RPC 2.0.
- Registration must verify connectivity with `tools/list`.
- Disabled servers are skipped.
- Unreachable requested servers are skipped with a warning so one bad tool server does not break the whole chat request.

### 10.3 System MCP

`SystemMCPService` reads `CHATLY_BACKEND_MCP_URL`.

- System MCP uses SSE transport.
- It forwards `X-Internal-API-Key` and `X-User-Id`.
- It is never stored in MongoDB.
- `/mcp/defaults` exposes configured system server metadata.
- Skill resources under `chatly://skills/*` are fetched and cached for runtime prompt context.

### 10.4 Tool Factories

Tool factories live in `app/tools/` and should return LangChain `BaseTool` instances or decorated tools.

- `retriever_tool.py` creates `search_documents`.
- `mcp_tool.py` wraps dynamic MCP tools.
- `web_search_tool.py` creates Tavily search tools.
- `image_gen_tool.py` creates image and sticker generation tools.

Tools must not perform session ownership checks. Services must enforce ownership before constructing tool context.

---

## 11. Error Handling

### 11.1 Exceptions

Use domain exceptions from `app/exceptions.py` for expected service-level failures.

```python
class AgentServerError(Exception):
    """Base exception for chatly-agent."""


class SessionNotFoundError(AgentServerError):
    """Session does not exist or is not owned by the user."""


class MCPConnectionError(AgentServerError):
    """MCP server could not be reached or returned an invalid response."""
```

### 11.2 HTTP Mapping

Global exception handlers live in `app/main.py`.

- `SessionNotFoundError` maps to `404`.
- `MCPConnectionError` maps to `400`.
- `MCPServerNotFoundError` maps to `404`.
- Unknown exceptions are logged and returned as `500` with a generic message.

Routers may map local `ValueError` cases to `HTTPException` when the service intentionally raises them for request validation.

### 11.3 Streaming Errors

`ChatService.stream_chat()` must classify model/runtime errors and emit an SSE `error` event instead of leaking provider exception text. Keep the client payload stable:

```json
{
  "type": "error",
  "data": {
    "message": "Model request timed out. Please try again.",
    "code": "MODEL_TIMEOUT",
    "category": "timeout",
    "retryable": true
  }
}
```

---

## 12. Testing

### 12.1 Requirements

- Add or update unit tests for every changed service or agent behavior.
- Add integration tests for new or changed router endpoints.
- Mock external providers in unit tests: Groq, HuggingFace, Tavily, MCP servers, S3/MinIO, Qdrant, and HTTP calls.
- Use `mongomock-motor` for repository-focused MongoDB tests when practical.
- Prefer behavior tests over implementation tests.

### 12.2 Naming

Use:

```text
test_<behavior>_when_<condition>
```

Examples:

```python
async def test_stream_chat_emits_error_when_model_times_out() -> None: ...
async def test_register_server_raises_when_mcp_unreachable() -> None: ...
async def test_similarity_search_includes_conversation_scope_when_present() -> None: ...
```

### 12.3 Structure

Use Arrange / Act / Assert. Keep one primary behavior per test.

```python
async def test_chat_returns_unified_agent_when_context_exists(
    chat_service: ChatService,
) -> None:
    # Arrange
    request = ChatRequest(message="Summarize the uploaded file")

    # Act
    response = await chat_service.chat(
        user_id="user-1",
        session_id="session-1",
        request=request,
    )

    # Assert
    assert response.agent_type == "unified"
```

### 12.4 Fixtures

Shared fixtures belong in `tests/conftest.py`. Keep fixtures explicit and typed when possible. Do not hide major behavior inside overly broad fixtures.

### 12.5 Coverage

The configured coverage threshold is 80%. If a change touches core workflows such as chat routing, file ingestion, MCP, or streaming, add focused tests even if coverage already passes.

---

## 13. Linting and Commands

Use the Makefile:

```bash
make run          # Start dev server with hot reload
make test         # Run tests
make test-cov     # Run tests with coverage
make lint         # Ruff check, Ruff format check, mypy
make format       # Ruff format and auto-fix
```

Current quality configuration lives in `pyproject.toml`:

- Ruff line length: 88.
- Ruff selected rule groups: `E`, `F`, `I`, `UP`, `B`, `SIM`, `ANN`.
- Mypy strict mode is enabled.
- Tests use `pytest` with `asyncio_mode = "auto"`.

Run the smallest relevant test command while iterating, then run broader checks before handing off substantial changes.

---

## 14. Pre-Commit Checklist

Before committing changes in `chatly-agent`:

- [ ] All code, comments, docstrings, commit text, and docs are in English.
- [ ] No secrets, tokens, emails, phone numbers, or message contents are logged.
- [ ] All public/protected routes use the correct API key dependency.
- [ ] Routers remain thin and do not call repositories directly.
- [ ] Services do not call Motor directly.
- [ ] Agents do not call databases directly.
- [ ] New constants are named and placed at module level.
- [ ] New or changed services and agents have focused tests.
- [ ] New or changed router endpoints have integration coverage.
- [ ] `make lint` passes or known failures are documented.
- [ ] `make test` or the relevant subset passes.
- [ ] `README.md` and `ARCHITECTURE.md` are updated when behavior, endpoints, environment variables, storage, MCP contracts, or agent workflows change.

Core principle: keep the service boring at the boundaries and explicit in the workflows. Future maintainers should be able to trace a request from router to service to repository or agent without guessing.
