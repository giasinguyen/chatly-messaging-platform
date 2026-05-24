# Chatly Agent

FastAPI service for Chatly's AI workflows. It provides interactive chat, session-scoped RAG over uploaded files, MCP tool calling, image generation tools, group `@AI` assistance, social post/comment AI replies, daily briefings, and internal file indexing for group conversations.

The service is internal to the Chatly platform. `chatly-backend` is the only public caller and forwards authenticated user context through headers.

---

## Features

- **Internal authentication** with `X-API-Key` and `X-User-Id`.
- **Session management** with MongoDB-backed sessions and message history.
- **Agent routing** between `ChatbotAgent` for plain conversation and `UnifiedAgent` for tools, RAG, and image generation.
- **Dedicated background agents** for group `@AI` mentions and social feed AI replies.
- **Session and conversation RAG** using text extraction, chunking, HuggingFace embeddings, and Qdrant search.
- **File storage** through MinIO-compatible local storage or AWS S3.
- **MCP integration** for user-registered JSON-RPC MCP servers and a system `chatly-backend` MCP server.
- **System MCP skill context** fetched from `chatly://skills/*` resources and cached in-process.
- **Web search** through Tavily when requested.
- **Image tools** for generated images and stickers when HuggingFace image dependencies are configured.
- **SSE streaming** with token, tool, error, and done events.
- **Request tracing** with `X-Request-ID`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| API | FastAPI, Uvicorn |
| Agents | LangGraph, LangChain, Groq `ChatGroq` |
| Checkpointing | `langgraph-checkpoint-mongodb` with PyMongo |
| Embeddings | HuggingFace Inference API, default `BAAI/bge-base-en-v1.5` |
| Vector DB | Qdrant |
| Document DB | MongoDB with Motor |
| File Storage | MinIO-compatible client or AWS S3 |
| MCP | `mcp` SDK for SSE transport, raw JSON-RPC 2.0 for HTTP transport |
| Web Search | Tavily |
| Image Generation | HuggingFace, Pillow, Gradio Client |
| Package Manager | `uv` |
| Testing | pytest, pytest-asyncio, pytest-cov, mongomock-motor, respx |
| Quality | Ruff, mypy |

---

## Prerequisites

- Python 3.12+
- `uv`
- Docker and Docker Compose
- Groq API key
- MongoDB, Qdrant, and object storage access

---

## Quick Start

From the monorepo root:

```bash
cd chatly-agent
cp .env.example .env
uv sync --dev
docker compose up -d mongodb qdrant
make run
```

The development server runs at `http://localhost:8000`.

Before starting the app, configure object storage in `.env`. The startup hook checks storage in MinIO mode, so `MINIO_ENDPOINT` must point to a running MinIO instance or `STORAGE_PROVIDER=s3` must point to a valid S3 bucket.

Verify liveness:

```bash
curl http://localhost:8000/health/
```

The current `docker-compose.yml` starts MongoDB, Qdrant, and the app. It does not start a local MinIO container.

---

## Docker Compose Services

| Service | URL | Notes |
|---|---|---|
| `app` | `http://localhost:8000` | FastAPI application |
| `mongodb` | `localhost:27018` | Container port `27017`, mapped to host `27018` |
| `qdrant` | `http://localhost:6333` | HTTP API, gRPC on `6334` |

---

## Environment Variables

Copy `.env.example` to `.env` and configure the values needed for your workflow.

```bash
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile

MONGODB_URI=mongodb://localhost:27018
MONGODB_DB_NAME=agent_server

QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
QDRANT_COLLECTION_NAME=agent_server_chunks
QDRANT_VECTOR_SIZE=768

HUGGINGFACE_API_KEY=hf_...
HF_EMBEDDING_MODEL=BAAI/bge-base-en-v1.5

STORAGE_PROVIDER=minio
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_SECURE=false
MINIO_BUCKET_NAME=uploads

# Used when STORAGE_PROVIDER=s3
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_BUCKET=uploads
STORAGE_REGION=ap-southeast-1

INTERNAL_API_KEY=change-me-use-a-long-random-string-min-32-chars
TAVILY_API_KEY=tvly-dev-...
CHATLY_BACKEND_MCP_URL=http://chatly-backend:8080/api/ai/mcp/sse

APP_ENV=development
LOG_LEVEL=INFO
MAX_FILE_SIZE_MB=5
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
```

`CHATLY_BACKEND_MCP_URL` enables built-in backend tools. Leave it empty to run without system MCP tools.

---

## Authentication

Protected public endpoints require:

```http
X-API-Key: <INTERNAL_API_KEY>
X-User-Id: <user_id>
```

Internal trigger endpoints under `/internal/**` require `X-API-Key`. Their request body supplies the user or conversation identifiers needed for background work.

---

## API Reference

Interactive OpenAPI docs are available at `http://localhost:8000/docs`.

### Sessions

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/sessions` | Create a session. Optional `context_conversation_id` links it to a Chatly conversation. |
| `GET` | `/sessions` | List sessions for the current user. |
| `GET` | `/sessions/{session_id}` | Get one session. |
| `PATCH` | `/sessions/{session_id}` | Rename a session. |
| `DELETE` | `/sessions/{session_id}` | Delete a session, its messages, files, chunks, and vectors. |
| `GET` | `/sessions/{session_id}/messages` | Return message history. |

### Chat

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/sessions/{session_id}/chat` | Send one message and receive the full response. |
| `POST` | `/sessions/{session_id}/chat/stream` | Send one message and receive SSE events. |

Request body:

```json
{
  "message": "Summarize this file",
  "use_web_search": false,
  "mcp_server_ids": [],
  "file_ids": []
}
```

Blocking response:

```json
{
  "content": "Here is the summary...",
  "session_id": "...",
  "message_id": "...",
  "agent_type": "unified"
}
```

SSE frames use this shape:

```text
data: {"type":"token","data":{"content":"Hello"}}

data: {"type":"tool_start","data":{"tool":"search_documents","input":{"query":"..."}}}

data: {"type":"tool_end","data":{"tool":"search_documents","output":"..."}}

data: {"type":"error","data":{"message":"Model request timed out.","code":"MODEL_TIMEOUT","category":"timeout","retryable":true}}

data: {"type":"done","data":{"agent_type":"unified","message_id":"...","attachments":[...]}}
```

### Files

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/sessions/{session_id}/files` | Upload one file. Supported extensions: `txt`, `md`, `pdf`, `docx`, `csv`, `json`, `jpeg`, `jpg`, `png`, `webp`. |
| `GET` | `/sessions/{session_id}/files` | List files in a session. |
| `GET` | `/sessions/{session_id}/files/{file_id}/content` | Stream stored file bytes. |
| `DELETE` | `/sessions/{session_id}/files/{file_id}` | Delete file metadata, chunks, object storage data, and vectors. |

Text files are indexed for RAG. Images are stored and exposed to the agent as file metadata but are not embedded as text chunks.

### MCP

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/mcp/servers` | Register a user-owned MCP server after live connectivity verification. |
| `GET` | `/mcp/servers` | List user-owned MCP servers. System defaults are excluded. |
| `GET` | `/mcp/servers/{server_id}` | Get one user-owned MCP server. |
| `PATCH` | `/mcp/servers/{server_id}/toggle` | Enable or disable a server. |
| `DELETE` | `/mcp/servers/{server_id}` | Delete a server. |
| `GET` | `/mcp/servers/{server_id}/tools` | Live-fetch a registered server's tools. |
| `GET` | `/mcp/defaults` | List configured system MCP servers such as `chatly-backend`. |

Custom MCP servers use HTTP JSON-RPC by default. The system backend MCP uses SSE transport with `X-Internal-API-Key` and `X-User-Id`.

### Internal Triggers

These routes are called by `chatly-backend` only and return `202 Accepted` quickly while background work continues.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/internal/assist` | Trigger group `@AI` assistance and publish with `sendAiMessage`. |
| `POST` | `/internal/social/mention-comment` | Trigger an AI reply to a social comment mention. |
| `POST` | `/internal/social/post-command` | Trigger an AI reply for a social post command. |
| `POST` | `/internal/briefing` | Trigger a user's daily briefing flow. |
| `POST` | `/internal/index-file` | Index a backend-hosted group conversation file into conversation-scoped RAG. |

### Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health/` | Liveness check. |
| `GET` | `/health/ready` | MongoDB readiness check. |

---

## Agent Behavior

`ChatService` chooses the agent per request:

- `UnifiedAgent` is used when there are MCP tools, web search, uploaded/session context, conversation context files, or image generation tools.
- `ChatbotAgent` is used for plain conversation without tools or indexed context.
- `MentionAgent` handles group `@AI` triggers and programmatically calls `sendAiMessage`.
- `SocialAgent` handles social post/comment flows and programmatically calls `createAiPostComment`.

System MCP tools are assembled automatically when `CHATLY_BACKEND_MCP_URL` is configured. User MCP tools are added only when requested by `mcp_server_ids`. Tavily web search is added only when `use_web_search=true` and `TAVILY_API_KEY` is configured.

---

## Project Structure

```text
chatly-agent/
├── app/
│   ├── main.py                 # FastAPI entry point, lifespan, middleware, exception handlers
│   ├── config.py               # pydantic-settings configuration
│   ├── dependencies.py         # FastAPI dependency factories
│   ├── exceptions.py           # Domain exception types
│   ├── agents/                 # ChatbotAgent, UnifiedAgent, MentionAgent, SocialAgent
│   ├── db/                     # MongoDB, Qdrant, and LangGraph checkpointer singletons
│   ├── graphs/                 # Chatbot LangGraph graph
│   ├── middleware/             # Request ID middleware
│   ├── models/                 # Pydantic API and internal schemas
│   ├── prompts/                # System prompts
│   ├── repositories/           # MongoDB and Qdrant data access
│   ├── routers/                # HTTP route handlers
│   ├── services/               # Business logic and orchestration
│   ├── storage/                # MinIO/S3-compatible storage client
│   ├── tools/                  # Retriever, MCP, web search, and image tools
│   └── utils/                  # LLM, embeddings, and security helpers
├── tests/
│   ├── fixtures/
│   ├── integration/
│   └── unit/
├── Dockerfile
├── docker-compose.yml
├── Makefile
├── pyproject.toml
└── AGENTS.md
```

---

## Development Commands

```bash
make run          # Start dev server with hot reload
make test         # Run tests
make test-cov     # Run tests with coverage
make lint         # ruff check, ruff format check, mypy
make format       # ruff format and auto-fix
```

---

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for request lifecycles, agent routing, RAG, MCP, storage, and database details.
