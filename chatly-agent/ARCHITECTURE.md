# Architecture — agent-server

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Component Architecture](#2-component-architecture)
3. [Request Lifecycle](#3-request-lifecycle)
4. [Agent Routing Logic](#4-agent-routing-logic)
5. [File Upload & RAG Pipeline](#5-file-upload--rag-pipeline)
6. [MCP Tool Integration](#6-mcp-tool-integration)
7. [LangGraph State Machines](#7-langgraph-state-machines)
8. [Database Design](#8-database-design)
9. [Security Model](#9-security-model)
10. [Infrastructure](#10-infrastructure)
11. [Layer Responsibilities](#11-layer-responsibilities)

---

## 1. System Overview

```mermaid
graph TB
    Client["Client (Browser / API)"]

    subgraph agent-server ["agent-server (FastAPI)"]
        Auth["JWT Auth Middleware"]
        Router["API Router"]
        Service["Service Layer"]

        subgraph Agents["Agent Layer (LangGraph)"]
            CB["ChatbotAgent"]
            RAG["RagAgent"]
            TOOL["ToolAgent"]
        end

        Embed["HuggingFace Embeddings\n(BAAI/bge-base-en-v1.5)"]
    end

    Groq["Groq API\n(LLaMA 3.3 70B)"]
    HF["HuggingFace\nInference API"]
    Tavily["Tavily\nWeb Search"]
    MCP["External MCP Servers\n(JSON-RPC 2.0 over HTTP)"]

    subgraph Infra["Infrastructure"]
        Mongo["MongoDB\n(documents, sessions, messages)"]
        Qdrant["Qdrant\n(vector embeddings)"]
        MinIO["MinIO\n(file binaries)"]
    end

    Client -->|"HTTPS Bearer JWT"| Auth
    Auth --> Router
    Router --> Service
    Service --> Agents
    Agents -->|"LLM calls"| Groq
    Service -->|"embed queries"| HF
    Service -->|"tool calls"| Tavily
    Service -->|"tool calls"| MCP
    Service --> Mongo
    Service --> Qdrant
    Service --> MinIO
```

---

## 2. Component Architecture

```mermaid
graph LR
    subgraph Routers ["Routers (HTTP only)"]
        R_Auth["auth.py"]
        R_Sessions["sessions.py"]
        R_Chat["chat.py"]
        R_Files["files.py"]
        R_MCP["mcp.py"]
        R_Users["users.py"]
        R_Health["health.py"]
    end

    subgraph Services ["Services (Business Logic)"]
        AuthSvc["AuthService"]
        SessionSvc["SessionService"]
        ChatSvc["ChatService"]
        FileSvc["FileService"]
        VectorSvc["VectorService"]
        MCPSvc["MCPService"]
        ToolSvc["ToolService"]
    end

    subgraph AgentLayer ["Agents + Graphs"]
        BaseAgent["BaseAgent (ABC)"]
        ChatbotAgent["ChatbotAgent"]
        RagAgent["RagAgent"]
        ToolAgent["ToolAgent"]
        ChatbotGraph["chatbot_graph\nSTART → llm_node → END"]
        RagGraph["rag_graph\nSTART → retrieve → generate → END"]
        ToolGraph["tool_graph\nReAct (prebuilt)"]
    end

    subgraph Repos ["Repositories (Data Access)"]
        UserRepo["UserRepository"]
        SessionRepo["SessionRepository"]
        MessageRepo["MessageRepository"]
        FileRepo["FileRepository"]
        ChunkRepo["ChunkRepository"]
        MCPRepo["MCPRepository"]
        QdrantRepo["QdrantRepository"]
    end

    subgraph DBClients ["DB Clients (Singletons)"]
        MongoClient["Motor AsyncIOMotorClient\napp/db/mongo.py"]
        QdrantClient["AsyncQdrantClient\napp/db/qdrant.py"]
        MinioClient["Minio Client\napp/storage/minio.py"]
    end

    Routers --> Services
    Services --> AgentLayer
    Services --> Repos
    AgentLayer --> BaseAgent
    BaseAgent --> ChatbotAgent & RagAgent & ToolAgent
    ChatbotAgent --> ChatbotGraph
    RagAgent --> RagGraph
    ToolAgent --> ToolGraph
    Repos --> DBClients
```

---

## 3. Request Lifecycle

### Blocking Chat Request

```mermaid
sequenceDiagram
    participant C as Client
    participant MW as Middleware
    participant R as Router
    participant CS as ChatService
    participant SS as SessionService
    participant A as Agent (selected)
    participant LLM as Groq API
    participant DB as MongoDB

    C->>MW: POST /sessions/{id}/chat + Bearer token
    MW->>MW: Validate JWT → resolve user
    MW->>R: Forward authenticated request
    R->>CS: chat(user_id, session_id, request)
    CS->>SS: verify session ownership
    SS->>DB: find_by_user_and_id()
    DB-->>SS: session doc
    SS-->>CS: confirmed
    CS->>DB: MessageRepository.find_by_session()
    DB-->>CS: history messages
    CS->>CS: _select_agent() → pick ChatbotAgent / RagAgent / ToolAgent
    CS->>DB: MessageRepository.create_message(role=user)
    CS->>A: ainvoke(ChatInput)
    A->>LLM: ChatGroq.ainvoke(messages)
    LLM-->>A: AIMessage
    A-->>CS: ChatOutput
    CS->>DB: MessageRepository.create_message(role=assistant)
    CS-->>R: ChatResponse
    R-->>C: 200 {"content": "...", "message_id": "..."}
```

### SSE Streaming Request

```mermaid
sequenceDiagram
    participant C as Client
    participant CS as ChatService
    participant A as Agent
    participant LLM as Groq API
    participant DB as MongoDB

    C->>CS: POST /sessions/{id}/chat/stream
    CS->>DB: persist user message
    CS->>A: astream(ChatInput)
    loop Token streaming
        A->>LLM: stream chunk
        LLM-->>A: AIMessageChunk
        A-->>CS: token string
        CS-->>C: data: {"token": "..."}\n\n
    end
    CS->>DB: persist full assistant message
    CS-->>C: data: [DONE]\n\n
```

---

## 4. Agent Routing Logic

`ChatService._select_agent()` automatically picks the right agent based on request context:

```mermaid
flowchart TD
    Start([Chat Request])
    CheckTools{MCP server IDs\nprovided OR\nuse_web_search=true?}
    CheckContext{session has\nuploaded files?\nVectorService.has_context}
    ToolAgent["ToolAgent\n(ReAct + tools)"]
    RagAgent["RagAgent\n(RAG graph)"]
    ChatbotAgent["ChatbotAgent\n(conversation graph)"]

    Start --> CheckTools
    CheckTools -->|Yes| ToolAgent
    CheckTools -->|No| CheckContext
    CheckContext -->|Yes| RagAgent
    CheckContext -->|No| ChatbotAgent
```

Priority: **Tool > RAG > Chatbot**

---

## 5. File Upload & RAG Pipeline

```mermaid
flowchart LR
    Upload["POST /files\nmultipart upload"]
    Validate["Validate\n• session ownership\n• file count ≤ 4\n• size ≤ 5 MB\n• mime type"]
    Extract["Extract Text\n• PDF → pypdf\n• DOCX → python-docx\n• TXT/MD/CSV/JSON → raw"]
    Split["Chunk Text\nRecursiveCharacterTextSplitter\nsize=1000 overlap=200"]
    Embed["Embed Chunks\nHuggingFace Inference API\nBAAI/bge-base-en-v1.5\nbatch size=16"]
    StoreMeta["Store Metadata\nFileRepository → MongoDB.files"]
    StoreChunks["Store Chunk Text\nChunkRepository → MongoDB.chunks"]
    StoreVectors["Index Vectors\nQdrantRepository → Qdrant\ncollection: agent_server_chunks\ndistance: Cosine"]
    StoreBinary["Store Binary\nMinIO bucket: uploads\nkey: user_id/session_id/uuid/filename"]

    Upload --> Validate --> Extract --> Split --> Embed
    Embed --> StoreMeta
    Embed --> StoreChunks
    Embed --> StoreVectors
    Embed --> StoreBinary
```

### RAG Retrieval (at chat time)

```mermaid
flowchart LR
    Q["User Query"]
    EmbedQ["Embed query\nHuggingFace API"]
    Search["Qdrant vector search\nfilter: session_id\ntop_k=5, threshold=0.5"]
    Context["Inject context\ninto RAG prompt"]
    LLM["ChatGroq\ngenerate answer"]
    Ans["Answer"]

    Q --> EmbedQ --> Search --> Context --> LLM --> Ans
```

---

## 6. MCP Tool Integration

```mermaid
sequenceDiagram
    participant U as User
    participant API as agent-server
    participant MCPS as MCPService
    participant MCPC as MCPClient
    participant Ext as External MCP Server
    participant DB as MongoDB

    U->>API: POST /mcp/servers {name, url, headers}
    API->>MCPC: list_tools(url)
    MCPC->>Ext: POST /mcp {"method": "tools/list", ...}
    Ext-->>MCPC: [{name, description, inputSchema}, ...]
    MCPC-->>MCPS: tool list
    MCPS->>DB: MCPRepository.create()
    DB-->>API: server ID
    API-->>U: 201 MCPServerResponse

    U->>API: POST /sessions/{id}/chat {mcp_server_ids: ["srv1"]}
    API->>MCPS: get_tools_for_servers(user_id, ["srv1"])
    MCPS->>DB: find_active_by_ids()
    DB-->>MCPS: [server docs]
    MCPS->>Ext: tools/list (live fetch)
    Ext-->>MCPS: tool definitions
    MCPS-->>API: LangChain BaseTool list
    API->>API: build ToolAgent with tools
    API->>Ext: call_tool() via MCPClient (during ReAct loop)
    Ext-->>API: tool result
    API-->>U: final answer
```

---

## 7. LangGraph State Machines

### Chatbot Graph

```mermaid
stateDiagram-v2
    [*] --> llm_node : {messages: [...history, HumanMessage]}
    llm_node --> [*] : {messages: [AIMessage]}

    note right of llm_node
        ChatGroq.ainvoke(all messages)
        Checkpointer: MemorySaver (keyed by session_id)
    end note
```

### RAG Graph

```mermaid
stateDiagram-v2
    [*] --> retrieve_node : {query, session_id, context: [], messages}
    retrieve_node --> generate_node : {context: ["chunk1", "chunk2", ...]}
    generate_node --> [*] : {messages: [AIMessage]}

    note right of retrieve_node
        VectorService.similarity_search()
        → populates context field
    end note

    note right of generate_node
        RAG_PROMPT.format(context, question, history)
        → ChatGroq.ainvoke()
    end note
```

### Tool Graph (ReAct)

```mermaid
stateDiagram-v2
    [*] --> agent : {messages: [HumanMessage]}
    agent --> tools : tool_calls in AIMessage
    tools --> agent : ToolMessages (results)
    agent --> [*] : final AIMessage (no tool calls)

    note right of agent
        LangGraph prebuilt create_react_agent
        LLM decides when to call tools
        Loops until final answer
    end note
```

---

## 8. Database Design

### MongoDB Collections

```mermaid
erDiagram
    users {
        ObjectId _id PK
        string email UK
        string hashed_password
        string full_name
        bool is_active
        datetime created_at
    }

    sessions {
        ObjectId _id PK
        string user_id FK
        string title
        datetime created_at
        datetime updated_at
    }

    messages {
        ObjectId _id PK
        string session_id FK
        string role
        string content
        dict tool_calls
        datetime created_at
    }

    files {
        ObjectId _id PK
        string session_id FK
        string user_id FK
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
        string session_id FK
        string file_id FK
        string user_id FK
        string content
        int chunk_index
    }

    mcp_servers {
        ObjectId _id PK
        string user_id FK
        string name
        string url
        dict headers
        bool is_active
        datetime created_at
        datetime updated_at
    }

    users ||--o{ sessions : "has"
    users ||--o{ mcp_servers : "owns"
    sessions ||--o{ messages : "contains"
    sessions ||--o{ files : "has"
    files ||--o{ chunks : "split into"
```

### Qdrant Collection (`agent_server_chunks`)

| Field | Type | Description |
|---|---|---|
| vector | float\[768\] | BAAI/bge-base-en-v1.5 embedding, Cosine distance |
| `session_id` | string (payload) | Used for filtered search |
| `file_id` | string (payload) | Used for deletion by file |
| `user_id` | string (payload) | Owner reference |
| `content` | string (payload) | Raw chunk text returned to LLM |
| `chunk_index` | int (payload) | Position within original file |

### MinIO Bucket (`uploads`)

Object key pattern: `{user_id}/{session_id}/{uuid4}/{original_filename}`

---

## 9. Security Model

```mermaid
flowchart TD
    Request["HTTP Request"]
    RID["RequestIDMiddleware\nStamp X-Request-ID"]
    CORS["CORSMiddleware\nCheck Origin"]
    Route["Route Handler"]
    Protected{Protected\nroute?}
    Bearer["Extract Bearer token\nHTTPBearer()"]
    Decode["decode_token()\npython-jose JWT verify\nHS256 + expiry"]
    UserLookup["UserRepository.find_by_id()\nConfirm user exists + active"]
    Ownership["Service-level\nownership check\nuser_id == doc.user_id"]
    Business["Business Logic"]
    Public["Public Handler\n(health, auth)"]

    Request --> RID --> CORS --> Route
    Route --> Protected
    Protected -->|Yes| Bearer --> Decode --> UserLookup --> Ownership --> Business
    Protected -->|No| Public
```

**Key security properties:**

- Passwords hashed with **bcrypt** (passlib), never stored in plaintext
- JWTs signed with **HS256**, configurable expiry (default 60 min)
- **Ownership enforced** at the service layer for every session/file/MCP operation — no row-level security, explicit `user_id` checks
- File uploads validated: MIME type, size limit (default 5 MB), file count per session (max 4)
- Rate limiting on chat endpoints: 30 requests / minute (SlowAPI)
- CORS origins explicitly configured via `CORS_ORIGINS` env var
- MCP server connectivity verified **before** persisting to database

---

## 10. Infrastructure

```mermaid
graph TB
    subgraph DockerNetwork ["Docker Network: agent-net"]
        App["app\nFastAPI :8000\nDepends on: mongodb, qdrant, minio"]
        Mongo["mongodb\nmongo:7\nPort: 27017\nVolume: mongo_data"]
        Qdrant["qdrant\nqdrant/qdrant:latest\nPort: 6333 HTTP, 6334 gRPC\nVolume: qdrant_data"]
        MinIO["minio\nminio/minio:latest\nPort: 9000 API, 9001 Console\nVolume: minio_data"]
        MinIOInit["minio-init\nminio/mc\nOne-shot: create uploads bucket"]
    end

    Client -->|":8000"| App
    App --> Mongo
    App --> Qdrant
    App --> MinIO
    MinIOInit --> MinIO
```

**Health checks:** All data services (`mongodb`, `qdrant`, `minio`) have Docker health checks. The `app` service waits for all three to be healthy before starting.

**Startup sequence in `app/main.py` lifespan:**
1. Ping MongoDB: `admin.command("ping")`
2. Ping Qdrant: `get_collections()`
3. Skip both when `APP_ENV=test`

**Shutdown sequence:**
1. `close_client()` — MongoDB Motor client
2. `close_client()` — Qdrant async client

---

## 11. Layer Responsibilities

| Layer | Location | Responsibility | Forbidden |
|---|---|---|---|
| **Routers** | `app/routers/` | HTTP request/response, status codes, DI injection | Business logic, DB calls |
| **Services** | `app/services/` | Business logic, orchestration, ownership checks | Direct DB/Motor calls |
| **Repositories** | `app/repositories/` | All MongoDB and Qdrant I/O | Business logic |
| **Agents** | `app/agents/` | LangGraph invocation, streaming | Direct DB calls |
| **Graphs** | `app/graphs/` | LangGraph state machine definitions | Side effects outside state |
| **DB clients** | `app/db/` | Motor and Qdrant singleton clients | Business logic |
| **Storage** | `app/storage/` | MinIO singleton client | Business logic |
| **Models** | `app/models/` | Pydantic schemas for API I/O | Logic |
| **Utils** | `app/utils/` | LLM factory, embedder factory, JWT helpers | Stateful operations |

### Dependency Rule

```
Routers → Services → Repositories → DB Clients
              ↓
           Agents → Graphs → LLM (Groq)
              ↓
           Tools → MCPClient / TavilySearch
```

No layer may import from a layer above it. Repositories are the **only** layer allowed to call Motor or Qdrant clients directly.
