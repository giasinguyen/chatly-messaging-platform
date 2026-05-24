# agent-server

A production-ready FastAPI backend for multi-agent AI chat with RAG, tool-calling, image generation, file uploads, MCP server integration, and streaming — powered by Groq (LLaMA 3.3), LangGraph, MongoDB, Qdrant, and MinIO.

---

## Features

- **Internal API Key Authentication** — all endpoints protected by `X-API-Key` + `X-User-Id` headers forwarded by `chatly-backend`.
- **Session Management** — multi-session chat with per-session history in MongoDB.
- **Two Agent Modes** — automatic routing between `ChatbotAgent` (conversation) and `UnifiedAgent` (RAG + tool-calling + image generation).
- **File Upload & RAG** — PDF, DOCX, TXT, MD, CSV, JSON → chunked → embedded → vector search via a `search_documents` retriever tool.
- **Image Generation** — generate images from text (`FLUX.1-schnell`) and turn photos into stickers (`FLUX.2-Klein`) using HuggingFace APIs.
- **MCP Server Integration** — connect any JSON-RPC 2.0 MCP server (SSE or HTTP), expose its tools to the agent.
- **Web Search** — Tavily integration, opt-in per request.
- **SSE Streaming** — real-time token streaming via Server-Sent Events.
- **Rate Limiting** — per-endpoint limits via SlowAPI.
- **Request Tracing** — `X-Request-ID` on every request/response.

---

## Tech Stack

| Layer | Technology |
|---|---|
| API | FastAPI 0.111+, Uvicorn |
| AI / Agents | LangGraph 0.2+, LangChain 0.2+, Groq (LLaMA 3.3 70B) |
| Embeddings | HuggingFace Inference API (`BAAI/bge-base-en-v1.5`, 768-dim) |
| Image Gen | HuggingFace (`FLUX.1-schnell`, `FLUX.2-Klein`), Pillow, Gradio Client |
| Vector DB | Qdrant |
| Document DB | MongoDB (Motor async driver) |
| File Storage | MinIO (S3-compatible) or AWS S3 |
| Web Search | Tavily |
| Package Manager | `uv` |
| Testing | pytest, pytest-asyncio, mongomock-motor, respx |
| Linting | ruff, mypy |

---

## Prerequisites

- Python 3.12+
- [`uv`](https://docs.astral.sh/uv/) — `pip install uv`
- Docker + Docker Compose

---

## Quick Start (Docker)

```bash
# 1. Clone the repository
git clone <repo-url>
cd agent-server

# 2. Create your environment file
cp .env.example .env
# Edit .env — set GROQ_API_KEY and INTERNAL_API_KEY at minimum

# 3. Start all infrastructure services + app
docker compose up -d --build

# 4. Verify
curl http://localhost:8000/health/
# {"status": "ok"}
```

The Docker Compose stack starts:

| Service | URL | Description |
|---|---|---|
| `app` | `http://localhost:8000` | FastAPI application |
| `mongodb` | `localhost:27017` | MongoDB 7 |
| `qdrant` | `http://localhost:6333` | Qdrant vector DB |
| `minio` | `http://localhost:9000` | MinIO object storage |
| `minio-console` | `http://localhost:9001` | MinIO web console |

---

## Local Development

```bash
# Install dependencies
uv sync --dev

# Copy and configure environment
cp .env.example .env

# Start infrastructure (MongoDB, Qdrant, MinIO)
docker compose up -d mongodb qdrant minio minio-init

# Run the development server
make run
# or: uv run uvicorn app.main:app --reload --port 8000
```

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Groq (required)
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile

# MongoDB (required)
MONGODB_URI=mongodb://localhost:27017/
MONGODB_DB_NAME=agent_server

# Qdrant (required)
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=                         # leave empty for local

# HuggingFace Inference API (required for file upload / RAG / Image Gen)
HUGGINGFACE_API_KEY=hf_...
HF_EMBEDDING_MODEL=BAAI/bge-base-en-v1.5

# Storage (required for file upload)
STORAGE_PROVIDER=minio                  # "minio" or "s3"
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_SECURE=false
MINIO_BUCKET_NAME=uploads

# Internal API key (required — shared secret with chatly-backend)
INTERNAL_API_KEY=change-me-use-a-long-random-string

# Tavily web search (optional)
TAVILY_API_KEY=tvly-...

# App
APP_ENV=development
LOG_LEVEL=INFO
CORS_ORIGINS=["http://localhost:3000"]
MAX_FILE_SIZE_MB=5
```

---

## API Reference

Interactive docs available at `http://localhost:8000/docs` when the server is running.

All protected endpoints require two headers forwarded by `chatly-backend`:

```
X-API-Key: <INTERNAL_API_KEY>
X-User-Id: <user_id>
```

### Sessions

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/sessions` | Create a new chat session |
| `GET` | `/sessions` | List all sessions for current user |
| `GET` | `/sessions/{id}` | Get session details |
| `DELETE` | `/sessions/{id}` | Delete session and all its messages |
| `PATCH` | `/sessions/{id}` | Rename session |
| `GET` | `/sessions/{id}/messages` | Get full message history |

### Chat

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/sessions/{id}/chat` | Send message, get response (blocking) |
| `POST` | `/sessions/{id}/chat/stream` | Send message, stream response (SSE) |

**Chat request body:**

```json
{
  "message": "Explain LangGraph in simple terms",
  "use_web_search": false,
  "mcp_server_ids": [],
  "file_ids": []
}
```

Agent selection is **automatic**:
- MCP server IDs provided **or** `use_web_search=true` → `UnifiedAgent` with tool set.
- Session has uploaded files → `UnifiedAgent` with `search_documents` retriever tool.
- Image generation tools are automatically enabled if `HUGGINGFACE_API_KEY` is set.
- No files and no tools → `ChatbotAgent`.

**Blocking response:**

```json
{
  "content": "LangGraph is ...",
  "session_id": "...",
  "message_id": "...",
  "agent_type": "chatbot"
}
```

**SSE stream format:**

```
data: {"token": "Lang"}\n\n
data: {"token": "Graph"}\n\n
data: {"done": true, "agent_type": "unified"}
```

### Files

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/sessions/{id}/files` | Upload file (PDF, DOCX, TXT, MD, CSV, JSON, PNG, JPEG, WEBP — max 5 MB) |
| `GET` | `/sessions/{id}/files` | List files in session |
| `DELETE` | `/sessions/{id}/files/{file_id}` | Delete file + vectors |
| `GET` | `/sessions/{id}/files/{file_id}/content` | Download/Stream raw file content |

### MCP Servers

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/mcp/servers` | Register an MCP server (SSE or HTTP) |
| `GET` | `/mcp/servers` | List user-registered MCP servers |
| `GET` | `/mcp/servers/{id}` | Get MCP server details |
| `DELETE` | `/mcp/servers/{id}` | Delete MCP server |
| `PATCH` | `/mcp/servers/{id}/toggle` | Enable/disable MCP server |
| `GET` | `/mcp/servers/{id}/tools` | List tools from MCP server (live) |
| `GET` | `/mcp/defaults` | List built-in system MCP servers |

### Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health/` | Liveness check |
| `GET` | `/health/ready` | Readiness check (pings MongoDB) |

---

## Project Structure

```
agent-server/
├── app/
│   ├── main.py              # FastAPI entry point, lifespan, middleware
│   ├── config.py            # pydantic-settings (all env vars)
│   ├── dependencies.py      # FastAPI Depends() factories
│   ├── exceptions.py        # Custom exception hierarchy
│   ├── agents/
│   │   ├── chatbot_agent.py # Conversational agent (LangGraph chatbot graph)
│   │   └── unified_agent.py # ReAct agent for tools + RAG (create_react_agent)
│   ├── graphs/
│   │   ├── chatbot_graph.py # START → llm_node → END
│   │   └── nodes/
│   │       └── llm_node.py
│   ├── tools/
│   │   ├── retriever_tool.py # search_documents — session-scoped Qdrant retrieval
│   │   ├── mcp_tool.py       # Dynamic wrapper for MCP tools
│   │   ├── web_search_tool.py # Tavily search tool
│   │   └── image_gen_tool.py # generate_image and generate_sticker tools
│   ├── routers/             # HTTP handlers (thin layer only)
│   ├── services/            # Business logic (Chat, File, MCP, Session, etc.)
│   ├── repositories/        # MongoDB + Qdrant data access
│   ├── models/              # Pydantic request/response schemas
│   ├── middleware/          # RequestID tracking
│   ├── db/                  # Motor + Qdrant client singletons
│   ├── storage/             # MinIO / S3 client singleton
│   ├── prompts/             # LangChain prompt templates
│   └── utils/               # LLM factory, embeddings, security
├── tests/
│   ├── unit/                # Isolated unit tests
│   └── integration/         # End-to-end API tests
├── Dockerfile
├── pyproject.toml
├── Makefile
└── AGENTS.md                # Coding conventions & TDD workflow
```

---

## Development Commands

```bash
make run          # Start dev server with hot reload
make test         # Run unit tests
make test-cov     # Run tests with coverage report
make lint         # ruff check + mypy
make format       # Auto-fix ruff formatting issues
```

---

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for a detailed breakdown of system design, component diagrams, data flow, and database schema.
