# agent-server

A production-ready FastAPI backend for multi-agent AI chat with RAG, tool-calling, file uploads, MCP server integration, and streaming — powered by Groq (LLaMA 3.3), LangGraph, MongoDB, Qdrant, and MinIO.

---

## Features

- **Internal API Key Authentication** — all endpoints protected by `X-Internal-API-Key` + `X-User-Id` headers forwarded by `chatly-backend`
- **Session Management** — multi-session chat with per-session history in MongoDB
- **Two Agent Modes** — automatic routing between `ChatbotAgent` (conversation) and `UnifiedAgent` (RAG + tool-calling)
- **File Upload & RAG** — PDF, DOCX, TXT, MD, CSV, JSON → chunked → embedded → vector search via a `search_documents` retriever tool
- **MCP Server Integration** — connect any JSON-RPC 2.0 MCP server, expose its tools to the agent
- **Web Search** — Tavily integration, opt-in per request
- **SSE Streaming** — real-time token streaming via Server-Sent Events
- **Rate Limiting** — per-endpoint limits via SlowAPI
- **Request Tracing** — `X-Request-ID` on every request/response

---

## Tech Stack

| Layer | Technology |
|---|---|
| API | FastAPI 0.111+, Uvicorn |
| AI / Agents | LangGraph 0.2+, LangChain 0.2+, Groq (LLaMA 3.3 70B) |
| Embeddings | HuggingFace Inference API (`BAAI/bge-base-en-v1.5`, 768-dim) |
| Vector DB | Qdrant |
| Document DB | MongoDB (Motor async driver) |
| File Storage | MinIO (S3-compatible) |
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

# HuggingFace Inference API (required for file upload / RAG)
HUGGINGFACE_API_KEY=hf_...
HF_EMBEDDING_MODEL=BAAI/bge-base-en-v1.5

# MinIO (required for file upload)
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
X-Internal-API-Key: <INTERNAL_API_KEY>
X-User-Id: <user_id>
```

### Sessions

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/sessions` | Create a new chat session |
| `GET` | `/sessions` | List all sessions for current user |
| `GET` | `/sessions/{id}` | Get session details |
| `DELETE` | `/sessions/{id}` | Delete session and all its messages |
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
  "mcp_server_ids": []
}
```

Agent selection is **automatic**:
- MCP server IDs provided **or** `use_web_search=true` → `UnifiedAgent` with tool set
- Session has uploaded files → `UnifiedAgent` with `search_documents` retriever tool
- Tools + context can coexist in the same `UnifiedAgent` instance
- No files and no tools → `ChatbotAgent`

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
data: {"done": true, "agent_type": "unified"}\n\n
```

### Files

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/sessions/{id}/files` | Upload file (PDF, DOCX, TXT, MD, CSV, JSON — max 5 MB) |
| `GET` | `/sessions/{id}/files` | List files in session |
| `DELETE` | `/sessions/{id}/files/{file_id}` | Delete file + vectors |

### MCP Servers

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/mcp/servers` | Register an MCP server (verifies connectivity) |
| `GET` | `/mcp/servers` | List registered MCP servers |
| `GET` | `/mcp/servers/{id}` | Get MCP server details |
| `DELETE` | `/mcp/servers/{id}` | Delete MCP server |
| `PATCH` | `/mcp/servers/{id}/toggle` | Enable/disable MCP server |
| `GET` | `/mcp/servers/{id}/tools` | List tools from MCP server (live) |

### Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health/` | Liveness check |
| `GET` | `/health/ready` | Readiness check (pings MongoDB) |

---

## MCP Server Integration

agent-server supports connecting any JSON-RPC 2.0 MCP server over HTTP. Register a server:

```bash
curl -X POST http://localhost:8000/mcp/servers \
  -H "X-Internal-API-Key: <key>" \
  -H "X-User-Id: <user_id>" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Math Server", "url": "http://localhost:8001/mcp", "headers": {}}'
```

Then pass its ID in chat requests via `mcp_server_ids`. The agent will automatically discover and call its tools alongside any retriever tool from uploaded documents.

Sample MCP servers are included in `mcp-servers/`:
- `mcp-servers/math/` — arithmetic tools (add, subtract, multiply, divide)
- `mcp-servers/text/` — text manipulation tools

```bash
# Start sample MCP servers
docker compose -f docker-compose-mcp.yml up -d
```

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
│   │   ├── retriever_tool.py  # search_documents — session-scoped Qdrant retrieval
│   │   ├── mcp_tool.py
│   │   └── web_search_tool.py
│   ├── routers/             # HTTP handlers (thin layer only)
│   ├── services/            # Business logic
│   ├── repositories/        # MongoDB + Qdrant data access
│   ├── models/              # Pydantic request/response schemas
│   ├── middleware/          # RequestID
│   ├── db/                  # Motor + Qdrant client singletons
│   ├── storage/             # MinIO client singleton
│   ├── prompts/             # LangChain prompt templates
│   └── utils/               # LLM factory, embeddings, security
├── tests/
│   ├── unit/                # Isolated unit tests (mock everything external)
│   └── integration/         # End-to-end API tests
├── mcp-servers/             # Sample MCP server implementations
├── docker-compose.yml       # Full stack (app + infrastructure)
├── docker-compose-mcp.yml   # Sample MCP servers
├── Dockerfile
├── pyproject.toml
├── Makefile
└── AGENTS.md                # Coding conventions & TDD workflow (single source of truth)
```

---

## Development Commands

```bash
make run          # Start dev server with hot reload
make test         # Run unit tests
make test-cov     # Run tests with coverage report (threshold: 80%)
make lint         # ruff check + mypy
make format       # Auto-fix ruff formatting issues
```

---

## Testing

```bash
# Unit tests only (fast — no external services needed)
uv run pytest tests/unit -v

# Integration tests (requires running infrastructure)
uv run pytest tests/integration -v

# With coverage
uv run pytest --cov=app --cov-report=term-missing
```

Unit tests use `mongomock-motor` for in-memory MongoDB and `respx` for mocking HTTP calls. No real external services are required.

---

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for a detailed breakdown of system design, component diagrams, data flow, and database schema.
