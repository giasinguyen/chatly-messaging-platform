# Chatly Messaging Platform — C4 Container Architecture

> Generated from codebase analysis on 2026-04-20.
> Reflects **actual** implementation, not an idealised target.

---

## 1. Container Inventory

| # | Container | Technology | Responsibility |
|---|---|---|---|
| 1 | **Web Application** | React 19 / TypeScript 5 / Vite 7 / Zustand / ShadCN UI / Tailwind CSS v4 | SPA: chat, video/audio calls (WebRTC), file sharing, AI assistant |
| 2 | **Mobile Application** | Expo 54 / React Native 0.81 / NativeWind / Zustand | Native mobile client: chat, calls, push notifications, AI assistant |
| 3 | **Backend API Server** | Java 21 / Spring Boot 4 / Spring Security / Spring WebSocket (STOMP/SockJS) / MapStruct | Auth, users, contacts, groups, conversations, messages, file upload, presence, WebSocket broker, call signaling, push notifications |
| 4 | **AI Agent Service** | Python 3.12 / FastAPI / LangGraph / LangChain | LLM chatbot pipeline, RAG retrieval, MCP tool orchestration, AI sessions |
| 5 | **PostgreSQL** | PostgreSQL 16 | Users, contacts, friend requests, groups, group memberships |
| 6 | **MongoDB (Backend)** | MongoDB 7 | Conversations, messages (chat history) |
| 7 | **Redis** | Redis 7 | Presence cache, JWT token blacklist, session data |
| 8 | **MongoDB (Agent)** | MongoDB 7 | AI agent sessions, chat history, tool execution logs |
| 9 | **Qdrant** | Qdrant (latest) | Document embeddings for RAG retrieval |
| 10 | **File / Object Storage** | Local FS (dev) / AWS S3 (prod) / MinIO (agent dev) | Uploaded files, media, documents |
| 11 | **MCP Tool Servers** | Python / FastAPI / MCP SDK | Dynamic tool plugins for the AI agent (math, text, etc.) |

---

## 2. External Systems

| System | Purpose | Called By |
|---|---|---|
| **Groq LLM API** | LLM inference (Llama 3.3 70B) | Agent Service |
| **HuggingFace API** | Embedding model (BGE-base-en-v1.5) | Agent Service |
| **Tavily Search API** | Web search as agent tool | Agent Service |
| **APNs / FCM (via Expo)** | Mobile push notification delivery | Backend (indirectly via Expo push) |

---

## 3. Communication Patterns

### 3.1 Client ↔ Backend

| Flow | Protocol | Details |
|---|---|---|
| REST API calls | HTTPS / JSON | Auth, CRUD for users/contacts/groups/messages, file upload |
| Real-time messaging | WebSocket (STOMP over SockJS for web; STOMP for mobile) | Chat send/receive, typing indicators, seen receipts |
| Presence | WebSocket (STOMP) | Online/offline status via `/topic/presence` |
| Call signaling | WebSocket (STOMP) | WebRTC offer/answer/ICE candidate exchange |
| File upload | HTTPS multipart | `POST /api/upload` |

### 3.2 Backend ↔ Agent Service

| Flow | Protocol | Details |
|---|---|---|
| AI chat request | Internal REST (HTTPS) | Backend → Agent via `AgentProxyClient` using `WebClient`. Authenticated with `X-Internal-API-Key` header. User context via `X-User-Id` header. |
| AI response delivery | REST response | Agent returns response synchronously; backend delivers to client. |

### 3.3 Agent Service ↔ External APIs

| Flow | Protocol | Details |
|---|---|---|
| LLM inference | HTTPS / REST | Agent → Groq API |
| Embeddings | HTTPS / REST | Agent → HuggingFace |
| Web search | HTTPS / REST | Agent → Tavily |
| MCP tool calls | HTTP / MCP Protocol | Agent → MCP servers (dynamically registered) |

### 3.4 WebRTC (Peer-to-Peer)

| Flow | Protocol | Details |
|---|---|---|
| Audio/video media | WebRTC (P2P) | Streams flow directly between clients (web ↔ web, web ↔ mobile, mobile ↔ mobile) |
| Signaling | WebSocket (STOMP) via Backend | Offer, answer, ICE candidates relayed through backend WebSocket |

---

## 4. Key Data Flows

### 4.1 Chat Message Flow

```
User (Web/Mobile)
  → WebSocket: /app/chat.send
  → Backend (ChatMessageController)
  → MessageService → MongoDB (save message)
  → NotificationService → WebSocket: /topic/conversation/{id}
  → All conversation participants receive message
```

### 4.2 AI Assistant Flow

```
User (Web/Mobile)
  → REST: POST /api/agent/chat
  → Backend (AgentChatController)
  → AgentProxyClient (WebClient)
  → Agent Service (FastAPI router)
  → LangGraph agent pipeline
    → Groq LLM (inference)
    → Qdrant (RAG retrieval, if needed)
    → MCP servers (tool execution, if needed)
  → Response returned to backend
  → Backend delivers to client
```

### 4.3 File Upload Flow

```
User (Web/Mobile)
  → REST: POST /api/upload (multipart)
  → Backend (FileUploadController)
  → FileUploadService → StorageProvider (Local / S3)
  → UploadResult (URL, metadata) returned to client
  → URL embedded in chat message or profile
```

### 4.4 Video/Audio Call Flow

```
Caller (Web/Mobile)
  → WebSocket: call signaling (offer)
  → Backend (CallWebSocketController)
  → WebSocket: forward to callee
Callee
  → WebSocket: call signaling (answer + ICE)
  → Backend → forward to caller
Both clients
  → WebRTC peer-to-peer media streams (audio/video)
```

### 4.5 Presence Flow

```
User connects via WebSocket
  → Backend (PresenceEventListener) detects STOMP CONNECT
  → PresenceService → Redis (set online)
  → Broadcast to /topic/presence
User disconnects
  → PresenceEventListener detects STOMP DISCONNECT
  → PresenceService → Redis (set offline)
  → Broadcast to /topic/presence
```

---

## 5. Infrastructure Notes

- **No external message broker** (Kafka, RabbitMQ): The backend uses Spring's built-in simple STOMP broker, not an external relay.
- **Dual MongoDB instances**: Backend and Agent each have their own MongoDB instance (different ports: 27017 and 27018).
- **Redis is single-purpose for backend**: No pub/sub for cross-instance scaling detected. If horizontal scaling is needed, Redis pub/sub or an external broker would be required.
- **Scheduler**: Backend has `@EnableScheduling` with `ReminderScheduler` for background tasks.
- **MCP servers are optional**: Only used in development/testing. Dockerized separately via `docker-compose-mcp.yml`.

---

## 6. Output Files

| File | Format | Tool |
|---|---|---|
| `structurizr/workspace.dsl` | Structurizr DSL | Render at [structurizr.com/dsl](https://structurizr.com/dsl) or via `structurizr-cli` |
| `keadex-mina/c4-system-context.mmd` | Mermaid C4 (System Context) | Render in Keadex Mina or any Mermaid renderer with C4 plugin |
| `keadex-mina/c4-container.mmd` | Mermaid C4 (Container) | Render in Keadex Mina or any Mermaid renderer with C4 plugin |
