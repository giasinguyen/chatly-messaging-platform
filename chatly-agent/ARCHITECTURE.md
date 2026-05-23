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
    Client["Client (chatly-backend)"] 

    subgraph agent-server ["agent-server (FastAPI)"]
        Auth["API Key Auth\n(X-API-Key + X-User-Id)"]
        Router["API Router"]
        Service["Service Layer"]

        subgraph Agents["Agent Layer (LangGraph)"]
            CB["ChatbotAgent"]
            UA["UnifiedAgent\n(ReAct — tools + RAG + Image Gen)"]
        end

        Embed["HuggingFace Embeddings\n(BAAI/bge-base-en-v1.5)"]
    end

    Groq["Groq API\n(LLaMA 3.3 70B)"]
    HF["HuggingFace\nInference & Gradio APIs"]
    Tavily["Tavily\nWeb Search"]
    MCP["External MCP Servers\n(JSON-RPC 2.0 over HTTP/SSE)"]

    subgraph Infra["Infrastructure"]
        Mongo["MongoDB\n(sessions, messages, files, chunks, mcp_servers)"]
        Qdrant["Qdrant\n(vector embeddings)"]
        MinIO["MinIO / S3\n(file binaries)"]
    end

    Client -->|"X-API-Key header"| Auth
    Auth --> Router
    Router --> Service
    Service --> Agents
    Agents -->|"LLM calls"| Groq
    Service -->|"embed queries"| HF
    Service -->|"tool calls"| Tavily
    Service -->|"tool calls"| MCP
    Agents -->|"image gen / stickers"| HF
    Service --> Mongo
    Service --> Qdrant
    Service --> MinIO
```

---

## 2. Component Architecture

```mermaid
graph LR
    subgraph Routers ["Routers (HTTP only)"]
        R_Sessions["sessions.py"]
        R_Chat["chat.py"]
        R_Files["files.py"]
        R_MCP["mcp.py"]
        R_Health["health.py"]
    end

    subgraph Services ["Services (Business Logic)"]
        SessionSvc["SessionService"]
        ChatSvc["ChatService"]
        FileSvc["FileService"]
        VectorSvc["VectorService"]
        MCPSvc["MCPService"]
        ToolSvc["ToolService"]
        SystemMCPSvc["SystemMCPService"]
    end

    subgraph AgentLayer ["Agents + Graphs"]
        ChatbotAgent["ChatbotAgent"]
        UnifiedAgent["UnifiedAgent\n(create_react_agent)"]
        ChatbotGraph["chatbot_graph\nSTART → llm_node → END"]
        RetrieverTool["retriever_tool\nsearch_documents()"]
        MCPTool["mcp_tool"]
        WebSearchTool["web_search_tool"]
        ImageGenTool["image_gen_tool\ngenerate_image()\ngenerate_sticker()"]
    end

    subgraph Repos ["Repositories (Data Access)"]
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
        StorageClient["Minio Client\napp/storage/minio.py"]
    end

    Routers --> Services
    Services --> AgentLayer
    Services --> Repos
    AgentLayer --> ChatbotAgent & UnifiedAgent
    ChatbotAgent --> ChatbotGraph
    UnifiedAgent --> RetrieverTool & MCPTool & WebSearchTool & ImageGenTool
    Repos --> DBClients
```

---

## 3. Request Lifecycle

### Blocking Chat Request

```mermaid
sequenceDiagram
    participant C as chatly-backend
    participant MW as Middleware
    participant R as Router
    participant CS as ChatService
    participant SS as SessionService
    participant A as Agent (selected)
    participant LLM as Groq API
    participant DB as MongoDB

    C->>MW: POST /sessions/{id}/chat + X-API-Key + X-User-Id
    MW->>MW: verify_api_key() → resolved user_id
    MW->>R: Forward authenticated request
    R->>CS: chat(user_id, session_id, request)
    CS->>SS: verify session ownership
    SS->>DB: find_by_user_and_id()
    DB-->>SS: session doc
    SS-->>CS: confirmed
    CS->>DB: MessageRepository.find_by_session()
    DB-->>CS: history messages
    CS->>CS: _select_agent() → ChatbotAgent or UnifiedAgent
    CS->>DB: MessageRepository.create_message(role=user)
    CS->>A: ainvoke(ChatInput)
    A->>LLM: ChatGroq.ainvoke(messages)
    LLM-->>A: AIMessage
    A-->>CS: ChatOutput(content, session_id, agent_type)
    CS->>DB: MessageRepository.create_message(role=assistant)
    CS-->>R: ChatResponse
    R-->>C: 200 {"content": "...", "message_id": "...", "agent_type": "..."}
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
    CS-->>C: data: {"done": true, "agent_type": "..."}\n\n
```

---

## 4. Agent Routing Logic

`ChatService._select_agent()` automatically picks the right agent based on request context:

```mermaid
flowchart TD
    Start([Chat Request])
    AssembleTools["assemble_tools()\nMCP + web search tools"]
    CheckImageGen{"Image Gen available?\n(HF API Key set)"}
    CheckHasContext{"VectorService.has_context\n(session has files?)"}
    BuildRetriever["create_retriever_tool()\nsession-scoped Qdrant search"]
    BuildImageTools["create_image_gen_tools()\ngenerate_image + sticker"]
    CheckNeedUnified{"tools list non-empty\nOR has_context\nOR Image Gen enabled?"}
    UnifiedAgent["UnifiedAgent\n(create_react_agent\n+ all tools)"]
    ChatbotAgent["ChatbotAgent\n(conversation graph)"]

    Start --> AssembleTools --> CheckImageGen
    CheckImageGen -->|Yes| BuildImageTools
    CheckImageGen -->|No| CheckHasContext
    BuildImageTools --> CheckHasContext
    CheckHasContext -->|Yes| BuildRetriever
    CheckHasContext -->|No| CheckNeedUnified
    BuildRetriever --> CheckNeedUnified
    CheckNeedUnified -->|Yes| UnifiedAgent
    CheckNeedUnified -->|No| ChatbotAgent
```

Priority: **UnifiedAgent (tools + RAG + Image Gen combined) > ChatbotAgent**

The `UnifiedAgent` can handle tools, context, and image generation simultaneously — everything is exposed as LangChain tools in a single ReAct loop.

---

## 5. File Upload & RAG Pipeline

```mermaid
flowchart LR
    Upload["POST /files\nmultipart upload"]
    Validate["Validate\n• session ownership\n• file count ≤ 4\n• size ≤ 5 MB\n• supported type"]
    Branch{Is image?}
    Extract["Extract Text\n• PDF → pypdf\n• DOCX → python-docx\n• TXT/MD/CSV/JSON → raw"]
    Split["Chunk Text\nRecursiveCharacterTextSplitter\nsize=1000 overlap=200"]
    Embed["Embed Chunks\nHuggingFace Inference API\nBAAI/bge-base-en-v1.5\nbatch size=16"]
    StoreMeta["Store Metadata\nFileRepository → MongoDB.files"]
    StoreChunks["Store Chunk Text\nChunkRepository → MongoDB.chunks"]
    StoreVectors["Index Vectors\nQdrantRepository → Qdrant\ncollection: agent_server_chunks\ndistance: Cosine"]
    StoreBinary["Store Binary\nMinIO / S3\nkey: user_id/session_id/uuid/filename"]

    Upload --> Validate --> Branch
    Branch -->|No| Extract --> Split --> Embed --> StoreMeta
    Branch -->|Yes| StoreMeta
    Embed --> StoreChunks
    Embed --> StoreVectors
    StoreMeta --> StoreBinary
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

    U->>API: POST /mcp/servers {name, url, transport, headers}
    API->>MCPC: list_tools(url, transport)
    MCPC->>Ext: tools/list (HTTP POST or SSE)
    Ext-->>MCPC: [tool definitions]
    MCPC-->>MCPS: tool list
    MCPS->>DB: MCPRepository.create()
    DB-->>API: server record
    API-->>U: 201 MCPServerResponse

    U->>API: POST /sessions/{id}/chat {mcp_server_ids: ["srv1"]}
    API->>MCPS: get_tools_for_servers(user_id, ["srv1"])
    MCPS->>DB: find_active_by_ids()
    DB-->>MCPS: [server docs]
    MCPS->>Ext: tools/list (live fetch)
    Ext-->>MCPS: tool definitions
    MCPS-->>API: tool info + server metadata
    API->>API: build UnifiedAgent with dynamic MCP tools
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

Used by `ChatbotAgent` — pure conversation with no external tools.

### UnifiedAgent (create_react_agent)

```mermaid
stateDiagram-v2
    [*] --> agent : {messages: [HumanMessage]}
    agent --> tools : tool_calls in AIMessage
    tools --> agent : ToolMessages (results)
    agent --> [*] : final AIMessage (no tool calls)

    note right of agent
        LangGraph prebuilt create_react_agent
        LLM decides which tools to call
        Loops until final answer
    end note

    note right of tools
        Any combination of:
        • search_documents (Qdrant retriever)
        • generate_image / generate_sticker
        • mcp_tool (external MCP servers)
        • web_search_tool (Tavily)
    end note
```

Each `UnifiedAgent` instance is built fresh per request by `_select_agent()` and receives only the tools relevant to that request.

---

## 8. Database Design

### MongoDB Collections

```mermaid
erDiagram
    sessions {
        ObjectId _id PK
        string user_id
        string title
        datetime created_at
        datetime updated_at
    }

    messages {
        ObjectId _id PK
        string session_id FK
        string role
        string content
        list attachments
        datetime created_at
    }

    files {
        ObjectId _id PK
        string session_id FK
        string user_id
        string filename
        string mime_type
        int size_bytes
        string minio_bucket
        string object_key
        string etag
        string source
        datetime created_at
    }

    chunks {
        ObjectId _id PK
        string session_id FK
        string file_id FK
        string user_id
        string content
        int chunk_index
    }

    mcp_servers {
        ObjectId _id PK
        string user_id
        string name
        string url
        string transport
        dict headers
        bool is_active
        datetime created_at
        datetime updated_at
    }

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
| `filename` | string (payload) | Source filename for citations |

### Object Storage Bucket (`uploads`)

Object key pattern: `{user_id}/{session_id}/{uuid4 or 'generated'}/{filename}`

---

## 9. Security Model

```mermaid
flowchart TD
    Request["HTTP Request"]
    RID["RequestIDMiddleware\nStamp X-Request-ID"]
    CORS["CORSMiddleware\nCheck Origin"]
    Route["Route Handler"]
    Protected{Protected\nroute?}
    APIKey["verify_api_key()\nConstant-time compare\nX-API-Key header"]
    UserID["Extract X-User-Id header\n(forwarded by chatly-backend)"]
    Ownership["Service-level\nownership check\nuser_id == doc.user_id"]
    Business["Business Logic"]
    Public["Public Handler\n(health)"]

    Request --> RID --> CORS --> Route
    Route --> Protected
    Protected -->|Yes| APIKey --> UserID --> Ownership --> Business
    Protected -->|No| Public
```

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

---

## 11. Layer Responsibilities

| Layer | Location | Responsibility | Forbidden |
|---|---|---|---|
| **Routers** | `app/routers/` | HTTP request/response, status codes, DI injection | Business logic, DB calls |
| **Services** | `app/services/` | Business logic, orchestration, ownership checks | Direct DB/Motor calls |
| **Repositories** | `app/repositories/` | All MongoDB and Qdrant I/O | Business logic |
| **Agents** | `app/agents/` | LangGraph invocation, token streaming | Direct DB calls |
| **Graphs** | `app/graphs/` | LangGraph state machine definitions | Side effects outside state |
| **DB clients** | `app/db/` | Motor and Qdrant singleton clients | Business logic |
| **Storage** | `app/storage/` | MinIO / S3 singleton client | Business logic |
| **Models** | `app/models/` | Pydantic schemas for API I/O | Logic |
| **Utils** | `app/utils/` | LLM factory, embedder factory | Stateful operations |
| **Tools** | `app/tools/` | External tool implementations (Retriever, MCP, Web, Image Gen) | Business logic |
