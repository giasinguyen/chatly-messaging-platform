# Architecture — Chatly Agent

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Component Architecture](#2-component-architecture)
3. [Request Lifecycles](#3-request-lifecycles)
4. [Agent Routing](#4-agent-routing)
5. [Agents](#5-agents)
6. [RAG and File Indexing](#6-rag-and-file-indexing)
7. [MCP Integration](#7-mcp-integration)
8. [Streaming Events](#8-streaming-events)
9. [Database Design](#9-database-design)
10. [Security Model](#10-security-model)
11. [Infrastructure](#11-infrastructure)
12. [Layer Responsibilities](#12-layer-responsibilities)

---

## 1. System Overview

```mermaid
graph TB
    Backend["chatly-backend"]

    subgraph Agent["chatly-agent FastAPI"]
        Auth["API key auth<br/>X-API-Key"]
        UserCtx["User context<br/>X-User-Id or request body"]
        Routers["Routers"]
        Services["Services"]
        Agents["Agents<br/>Chatbot, Unified, Mention, Social"]
        Tools["Tools<br/>RAG, MCP, Web, Image"]
    end

    Groq["Groq LLM"]
    HF["HuggingFace<br/>Embeddings and Image APIs"]
    Tavily["Tavily"]
    UserMCP["User MCP servers<br/>HTTP JSON-RPC"]
    BackendMCP["chatly-backend MCP<br/>SSE"]

    subgraph Data["Data stores"]
        Mongo["MongoDB<br/>sessions, messages, files, chunks, MCP configs, checkpoints"]
        Qdrant["Qdrant<br/>chunk vectors"]
        Storage["MinIO-compatible storage or AWS S3<br/>file binaries"]
    end

    Backend --> Auth --> UserCtx --> Routers --> Services
    Services --> Agents
    Services --> Tools
    Agents --> Groq
    Tools --> HF
    Tools --> Tavily
    Tools --> UserMCP
    Tools --> BackendMCP
    Services --> Mongo
    Services --> Qdrant
    Services --> Storage
```

`chatly-agent` is not a public client-facing service. It receives calls from `chatly-backend`, persists AI sessions and messages, invokes LLMs and tools, and returns or publishes AI-generated results.

---

## 2. Component Architecture

```mermaid
graph LR
    subgraph Routers["app/routers"]
        Sessions["sessions.py"]
        Chat["chat.py"]
        Files["files.py"]
        MCPRouter["mcp.py"]
        Internal["internal.py"]
        Health["health.py"]
    end

    subgraph Services["app/services"]
        SessionSvc["SessionService"]
        ChatSvc["ChatService"]
        FileSvc["FileService"]
        VectorSvc["VectorService"]
        MCPSvc["MCPService"]
        SystemMCPSvc["SystemMCPService"]
        ToolSvc["ToolService"]
        BriefingSvc["BriefingService"]
    end

    subgraph AgentLayer["app/agents and app/graphs"]
        ChatbotAgent["ChatbotAgent"]
        UnifiedAgent["UnifiedAgent"]
        MentionAgent["MentionAgent"]
        SocialAgent["SocialAgent"]
        ChatbotGraph["chatbot_graph"]
    end

    subgraph ToolLayer["app/tools"]
        Retriever["search_documents"]
        MCPTool["dynamic MCP tools"]
        WebSearch["Tavily web search"]
        ImageTools["image generation tools"]
    end

    subgraph Repos["app/repositories"]
        SessionRepo["SessionRepository"]
        MessageRepo["MessageRepository"]
        FileRepo["FileRepository"]
        ChunkRepo["ChunkRepository"]
        MCPRepo["MCPRepository"]
        QdrantRepo["QdrantRepository"]
    end

    subgraph Clients["app/db and app/storage"]
        Motor["Motor MongoDB client"]
        Checkpointer["MongoDBSaver checkpointer"]
        QdrantClient["AsyncQdrantClient"]
        StorageClient["Minio client"]
    end

    Routers --> Services
    ChatSvc --> ChatbotAgent
    ChatSvc --> UnifiedAgent
    ChatSvc --> MentionAgent
    ChatSvc --> SocialAgent
    ChatbotAgent --> ChatbotGraph
    UnifiedAgent --> ToolLayer
    MentionAgent --> ToolLayer
    SocialAgent --> ToolLayer
    Services --> Repos
    Repos --> Clients
```

---

## 3. Request Lifecycles

### Blocking Chat

```mermaid
sequenceDiagram
    participant B as chatly-backend
    participant R as chat.py
    participant CS as ChatService
    participant SS as SessionService
    participant MR as MessageRepository
    participant A as Selected Agent
    participant LLM as Groq

    B->>R: POST /sessions/{id}/chat + X-API-Key + X-User-Id
    R->>CS: chat(user_id, session_id, ChatRequest)
    CS->>SS: get_session(user_id, session_id)
    SS-->>CS: session with optional context_conversation_id
    CS->>MR: find_by_session(session_id)
    MR-->>CS: persisted history
    CS->>CS: build system/session context and select agent
    CS->>MR: create user message with optional attachments
    CS->>A: ainvoke(ChatInput)
    A->>LLM: invoke
    LLM-->>A: final assistant message
    A-->>CS: ChatOutput
    CS->>MR: create assistant message with generated attachments
    CS-->>R: ChatResponse
    R-->>B: 200 response
```

### Streaming Chat

```mermaid
sequenceDiagram
    participant B as chatly-backend
    participant CS as ChatService
    participant A as Selected Agent
    participant Tool as Tool
    participant MR as MessageRepository

    B->>CS: POST /sessions/{id}/chat/stream
    CS->>MR: persist user message
    CS->>A: astream_events(ChatInput)
    loop LangGraph events
        A-->>CS: on_chat_model_stream
        CS-->>B: SSE token event
        A-->>CS: on_tool_start
        CS-->>B: SSE tool_start event
        A->>Tool: call tool
        Tool-->>A: result
        A-->>CS: on_tool_end
        CS-->>B: SSE tool_end event
    end
    CS->>MR: persist full assistant message
    CS-->>B: SSE done event
```

### Internal Background Triggers

```mermaid
sequenceDiagram
    participant B as chatly-backend
    participant R as internal.py
    participant SS as SessionService
    participant BG as BackgroundTasks
    participant CS as ChatService
    participant A as MentionAgent or SocialAgent
    participant MCP as chatly-backend MCP

    B->>R: POST /internal/assist or /internal/social/*
    R->>R: verify X-API-Key
    R->>SS: find_or_create_for_conversation()
    SS-->>R: session_id
    R->>BG: schedule agent task
    R-->>B: 202 Accepted
    BG->>CS: run_group_assist or run_social_*()
    CS->>A: generate response using research tools
    A->>MCP: deterministic publish tool call
```

---

## 4. Agent Routing

`ChatService._select_agent()` decides only for interactive `/sessions/{id}/chat` requests.

```mermaid
flowchart TD
    Start["Chat request"]
    Tools["ToolService.assemble_tools<br/>system MCP + requested user MCP + optional Tavily"]
    Context["VectorService.has_context<br/>session chunks or linked conversation chunks"]
    Images["Build image tools when available"]
    NeedUnified{"Any tools, context, or image tools?"}
    Unified["UnifiedAgent<br/>ReAct graph"]
    Chatbot["ChatbotAgent<br/>plain conversation"]

    Start --> Tools --> Context --> Images --> NeedUnified
    NeedUnified -->|Yes| Unified
    NeedUnified -->|No| Chatbot
```

`UnifiedAgent` receives the complete per-request tool list:

- System backend MCP tools when `CHATLY_BACKEND_MCP_URL` is configured.
- User MCP tools requested by `mcp_server_ids`.
- Tavily web search when `use_web_search=true` and configured.
- `search_documents` when session or linked conversation chunks exist.
- Image tools when the image generation integration is available.

---

## 5. Agents

### ChatbotAgent

Plain conversational agent. It prepends `CHATLY_SYSTEM_PROMPT`, injects MongoDB message history, and invokes a simple LangGraph chatbot graph.

```mermaid
stateDiagram-v2
    [*] --> llm_node
    llm_node --> [*]
```

### UnifiedAgent

General ReAct agent for interactive chat with tools and RAG. A fresh graph is created per request so tool availability cannot leak across requests.

```mermaid
stateDiagram-v2
    [*] --> agent
    agent --> tools : tool calls
    tools --> agent : tool results
    agent --> [*] : final AIMessage
```

It uses `UNIFIED_AGENT_SYSTEM_PROMPT` formatted with `user_id` and runtime `session_context`. MongoDBSaver checkpointing is enabled outside `APP_ENV=test`.

### MentionAgent

Handles group `@AI` mentions from `/internal/assist`.

- Uses research/context MCP tools in a ReAct loop.
- Removes `sendAiMessage` from the LLM tool loop.
- Calls `sendAiMessage` programmatically after final text generation.
- Excludes `sendTextMessage` to avoid duplicate group posts.

### SocialAgent

Handles `/internal/social/mention-comment` and `/internal/social/post-command`.

- Uses research tools when available.
- Detects the `createAiPostComment` publish tool by schema/description.
- Publishes the final AI reply programmatically.

### BriefingService Flow

`BriefingService` creates a temporary "Daily Briefing" session and streams a prompt through `ChatService`. The agent is expected to call backend MCP tools such as `getMyConversations`, `readRecentMessages`, `listGroupReminders`, and `sendTextMessage`.

---

## 6. RAG and File Indexing

### Session File Upload

```mermaid
flowchart LR
    Upload["POST /sessions/{id}/files"]
    Validate["Validate ownership, extension, count <= 4, size"]
    IsImage{"Image extension?"}
    StoreImage["Store object and metadata only"]
    Extract["Extract text<br/>PDF, DOCX, TXT, MD, CSV, JSON"]
    Split["RecursiveCharacterTextSplitter"]
    Embed["HuggingFace embeddings<br/>batched"]
    StoreObj["Store original object"]
    FileMeta["files collection"]
    Chunks["chunks collection"]
    Vectors["Qdrant vectors"]

    Upload --> Validate --> IsImage
    IsImage -->|Yes| StoreImage --> FileMeta
    IsImage -->|No| Extract --> Split --> Embed --> StoreObj --> FileMeta
    Embed --> Chunks
    Embed --> Vectors
```

Supported extensions are `txt`, `md`, `pdf`, `docx`, `csv`, `json`, `jpeg`, `jpg`, `png`, and `webp`. Text-like files are embedded. Images are stored as attachments only.

### Conversation File Indexing

`POST /internal/index-file` is used when `chatly-backend` uploads a file to a group conversation. The agent downloads the backend-provided file URL, extracts and embeds text, stores metadata with `conversation_id` and `backend_file_id`, and indexes vectors scoped to that conversation.

When a chat session has `context_conversation_id`, `VectorService.similarity_search()` searches both:

- session-scoped chunks
- conversation-scoped chunks

---

## 7. MCP Integration

### User-Owned MCP Servers

User MCP servers are stored in MongoDB and managed through `/mcp/servers/**`. Registration verifies connectivity by calling `tools/list`.

Default transport is HTTP JSON-RPC 2.0:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

Tool calls use `tools/call` with `{ "name": "...", "arguments": {...} }`.

### System Backend MCP

`SystemMCPService` configures `chatly-backend` from `CHATLY_BACKEND_MCP_URL`. It is not stored in MongoDB and is not returned by `/mcp/servers`; callers can inspect it through `/mcp/defaults`.

System MCP uses SSE transport and forwards:

```http
X-Internal-API-Key: <INTERNAL_API_KEY>
X-User-Id: <current user id>
```

System MCP also exposes resources. `chatly-agent` reads `chatly://skills/*` resources, concatenates them into runtime skill context, and caches them for 5 minutes.

---

## 8. Streaming Events

`app/models/stream.py` defines the SSE contract:

| Type | Data |
|---|---|
| `token` | `{ "content": string }` |
| `tool_start` | `{ "tool": string, "input": object }` |
| `tool_end` | `{ "tool": string, "output": string }` |
| `error` | `{ "message": string, "code": string?, "category": string?, "retryable": boolean? }` |
| `done` | `{ "agent_type": string, "message_id": string, "attachments": array? }` |

Errors are classified into model rate limit, timeout, provider error, and internal agent error categories before being emitted to clients.

---

## 9. Database Design

### MongoDB Collections

```mermaid
erDiagram
    sessions {
        ObjectId _id PK
        string user_id
        string title
        string context_conversation_id
        datetime created_at
        datetime updated_at
    }

    messages {
        ObjectId _id PK
        string session_id
        string role
        string content
        list attachments
        datetime created_at
    }

    files {
        ObjectId _id PK
        string session_id
        string conversation_id
        string user_id
        string backend_file_id
        string filename
        string mime_type
        int size_bytes
        string minio_bucket
        string object_key
        string etag
        datetime created_at
    }

    chunks {
        ObjectId _id PK
        string file_id
        string session_id
        string conversation_id
        string user_id
        string content
        int chunk_index
    }

    mcp_servers {
        ObjectId _id PK
        string user_id
        string name
        string url
        dict headers
        string transport
        bool is_active
        datetime created_at
        datetime updated_at
    }

    sessions ||--o{ messages : contains
    sessions ||--o{ files : owns
    files ||--o{ chunks : split_into
```

`MongoDBSaver` also stores LangGraph checkpoint documents in the configured MongoDB database.

### Qdrant Collection

Default collection: `agent_server_chunks`.

| Payload | Description |
|---|---|
| `session_id` | Session scope for regular uploads. |
| `conversation_id` | Conversation scope for backend-indexed group files. |
| `file_id` | File metadata ID. |
| `user_id` | Owner or uploader ID. |
| `content` | Raw chunk text. |
| `chunk_index` | Position in source file. |
| `filename` | Source filename. |

Vector size defaults to `768` and should match `HF_EMBEDDING_MODEL`.

### Object Storage

Session uploads use:

```text
{user_id}/{session_id}/{uuid4}/{filename}
```

Conversation-indexed files use:

```text
conversations/{conversation_id}/{uuid4}/{filename}
```

---

## 10. Security Model

```mermaid
flowchart TD
    Request["HTTP request"]
    RID["RequestIDMiddleware"]
    Route["Router"]
    Protected{"Protected endpoint?"}
    Verify["verify_api_key<br/>constant-time compare"]
    UserHeader["X-User-Id dependency<br/>for public protected endpoints"]
    BodyUser["User ID from body<br/>for internal triggers"]
    Ownership["Service-level ownership checks"]
    Work["Business logic"]
    Health["Health handler"]

    Request --> RID --> Route --> Protected
    Protected -->|No| Health
    Protected -->|Yes| Verify
    Verify --> UserHeader --> Ownership --> Work
    Verify --> BodyUser --> Work
```

Public protected endpoints use `get_request_context()`, which validates `X-API-Key` and extracts `X-User-Id`. Internal routes use router-level `verify_api_key` and request bodies supplied by `chatly-backend`.

Sensitive values must come from environment variables. Logs must not include JWTs, API keys, message content, emails, or phone numbers.

---

## 11. Infrastructure

Current `docker-compose.yml` defines:

```mermaid
graph TB
    subgraph Net["agent-net"]
        App["app<br/>FastAPI :8000"]
        Mongo["mongodb<br/>host :27018 -> container :27017"]
        Qdrant["qdrant<br/>:6333 HTTP, :6334 gRPC"]
    end

    App --> Mongo
    App --> Qdrant
```

Object storage is external to the current Compose stack:

- `STORAGE_PROVIDER=minio` expects a reachable MinIO endpoint.
- `STORAGE_PROVIDER=s3` expects AWS S3 credentials and a pre-created bucket.

During application startup, the lifespan hook pings MongoDB, checks Qdrant, ensures the object storage bucket for MinIO mode, and initializes the LangGraph MongoDB checkpointer unless `APP_ENV=test`.

---

## 12. Layer Responsibilities

| Layer | Location | Responsibility | Forbidden |
|---|---|---|---|
| Routers | `app/routers/` | HTTP I/O, dependency injection, status codes | Business logic, direct database access |
| Services | `app/services/` | Orchestration, ownership checks, agent selection, workflows | Direct Motor queries |
| Repositories | `app/repositories/` | MongoDB and Qdrant data access | Agent orchestration |
| Agents | `app/agents/` | Prompt assembly, LangGraph invocation, deterministic publish steps | Direct database access |
| Graphs | `app/graphs/` | LangGraph state definitions | HTTP or persistence concerns |
| Tools | `app/tools/` | LangChain tool wrappers for RAG, MCP, web search, image generation | Session ownership decisions |
| DB clients | `app/db/` | Singleton MongoDB, Qdrant, and checkpointer clients | Business logic |
| Storage | `app/storage/` | MinIO/S3-compatible client and bucket helpers | File extraction or indexing |
| Models | `app/models/` | Pydantic schemas and SSE event formatting | Persistence logic |
| Utils | `app/utils/` | LLM, embeddings, and security helpers | Stateful workflows |
