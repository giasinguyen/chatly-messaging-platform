<div align="center">
  <img src="_resources/images/chatly-logo.png" alt="Chatly Logo" width="320"/>

  <h1>Chatly Messaging Platform</h1>

  <p>
    <strong>A modern, full-stack social messaging platform — chat, social feed, stories, reels, an AI assistant, video calls, and an admin console in one place.</strong>
  </p>

  <p>
    <a href="https://openjdk.org/"><img src="https://img.shields.io/badge/Java-21-ED8B00?style=flat-square&logo=openjdk&logoColor=white" alt="Java 21"/></a>
    <a href="https://spring.io/projects/spring-boot"><img src="https://img.shields.io/badge/Spring_Boot-4.0.3-6DB33F?style=flat-square&logo=springboot&logoColor=white" alt="Spring Boot"/></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-18_·_19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 18 / 19"/></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5"/></a>
    <a href="https://expo.dev/"><img src="https://img.shields.io/badge/Expo-54-000020?style=flat-square&logo=expo&logoColor=white" alt="Expo 54"/></a>
    <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI"/></a>
    <a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL 16"/></a>
    <a href="https://www.mongodb.com/"><img src="https://img.shields.io/badge/MongoDB-7-47A248?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB 7"/></a>
    <a href="https://redis.io/"><img src="https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis 7"/></a>
    <a href="https://qdrant.tech/"><img src="https://img.shields.io/badge/Qdrant-Vector_DB-DC244C?style=flat-square&logo=qdrant&logoColor=white" alt="Qdrant"/></a>
    <img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="MIT License"/>
  </p>

  <p>
    <a href="#-features">Features</a> •
    <a href="#️-architecture">Architecture</a> •
    <a href="#-tech-stack">Tech Stack</a> •
    <a href="#️-project-structure">Structure</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#-rest-api-reference">API Reference</a>
  </p>
</div>

---

Chatly is a full-stack real-time messaging platform built for educational purposes. It combines the instant-messaging experience of Messenger/Zalo with the social feed of Instagram — plus short-form **Reels**, an **LLM-powered AI assistant**, **Agora-backed video calls**, personal **cloud file storage**, and a full **admin & moderation console**.

The platform spans **four applications** sharing one backend:

- 🌐 **Web client** — React 18 + Vite
- 📱 **Mobile client** — Expo 54 / React Native (React 19)
- ⚙️ **Backend API** — Spring Boot 4 (Java 21)
- 🤖 **AI microservice** — FastAPI + LangGraph (Python 3.12)

---

## 👥 Team

<div align="center">

| Name                   | Role               |
| ---------------------- | ------------------ |
| Nguyễn Trần Gia Sĩ 🐍  | Backend Developer  |
| Nguyễn Văn Minh ☁      | Frontend Developer |
| Nguyễn Trung Nguyên 🗿 | Backend Developer  |
| Đào Quốc Tuấn 🐶       | Frontend Developer |

</div>

---

## 📌 Features

### 💬 Messaging

- **Real-time 1-on-1 and group chat** via STOMP/SockJS WebSocket
- **Typing indicators** — live feedback when participants are composing
- **Delivery & read receipts** — per-message status (`SENT → DELIVERED → READ`)
- **Message reactions** — emoji reactions on individual messages
- **Reply, forward, edit, recall** — full message lifecycle with edit history
- **Polls** — create interactive polls inside a conversation
- **Location sharing** — share a live/pin location in chat
- **Priority tagging** — mark messages as `IMPORTANT` or `URGENT`
- **Pinned messages** — pin key messages inside a conversation
- **Message search** — full-text search across conversation history
- **Per-conversation settings** — mute, nickname, theme and notification preferences

### 🏘️ Groups

- **Group management** — create, rename, update avatar, add/remove members
- **Role-based permissions** — `OWNER / ADMIN / MEMBER` hierarchy
- **Join requests** — request-and-approve flow, plus invite links / QR join
- **Group notes** — shared notes visible to all members
- **Group reminders** — schedule reminders inside a group

### 🌐 Social

- **Social feed** — home feed from followed users, explore feed sorted by engagement score, and per-user profile feed
- **Posts** — create, edit, delete text/media posts with hashtag support
- **Post reactions** — like / love / laugh / etc. on posts
- **Comments** — threaded comments on posts
- **Save posts** — bookmark posts for later
- **Share posts into chat** — share a post as a rich-preview message to any conversation
- **Follow / Unfollow** — asymmetric social graph (followers / following)
- **Close Friends** — curated list for restricted-audience content
- **Explore page** — discover trending public posts and hashtags

### 🎬 Reels

- **Short-form video** — create, browse, and view vertical video reels
- **Reactions & comments** — react to reels and to individual comments
- **Share to chat** — forward a reel into any conversation
- **View tracking** — per-reel view counts
- **Upload guardrails** — configurable maximum video size

### 📸 Stories

- **Create stories** — text, photo, and video stories with custom background, font size, and music
- **24-hour expiry** — stories auto-expire after one day via MongoDB TTL index
- **Story reactions** — floating emoji reactions on stories
- **Story replies as DMs** — replies open a direct conversation, Instagram-style
- **View tracking** — track who viewed your story
- **Privacy controls** — `EVERYONE / FOLLOWERS_ONLY / CLOSE_FRIENDS / ONLY_ME`

### 🤖 AI Assistant (`chatly-agent`)

- **LLM-powered chatbot** — Groq (LLaMA 3.3-70B Versatile) via a LangGraph agent graph
- **Streaming responses** — Server-Sent Events (SSE) for token-by-token output
- **Session management** — multi-turn conversation sessions, persisted with LangGraph MongoDB checkpoints
- **File understanding** — upload PDF/DOCX/images to the agent for analysis (MinIO/S3 backed)
- **Vector search (RAG)** — Qdrant vector DB with HuggingFace `bge` embeddings
- **Web search** — Tavily search tool for up-to-date answers
- **MCP tool integration** — register external tools via Model Context Protocol; backend also exposes its own MCP server
- **"Chat about this post"** — start an AI session seeded from a social post
- **Observability** — optional LangSmith tracing

### 📞 Calls

- **Voice & video calls** — powered by the **Agora RTC** SDK with a server-issued token
- **WebSocket signaling** — call invite / accept / reject / end events over STOMP
- **Call history** — per-conversation call session records

### 🔔 Notifications

- **Real-time push** — notifications delivered over WebSocket to the user's feed channel
- **Mobile push** — Expo push notifications on the mobile client
- **Notification types** — new message, story reaction, story reply, follow, post/reel reaction, comment, mention, join request
- **Unread count badge** — live unread notification counter
- **Mark all as read** — batch-clear all notifications

### 👤 User & Account

- **JWT authentication** — access token (1-day) + refresh token (7-day) with a Redis blacklist
- **Email verification** — OTP-based verification on registration (Thymeleaf email templates)
- **Forgot / change password** — self-service password recovery and rotation
- **QR-code login** — log in on the web by scanning a QR code from the mobile app
- **Multi-device sessions** — list, purge, and revoke active login sessions per device
- **User presence** — online/offline status with last-seen timestamp
- **Contact management** — send, accept, and block friend requests
- **Granular settings** — privacy, notification, and message-section preferences
- **Cloud storage** — personal file vault backed by S3/MinIO
- **Reporting** — report abusive users and posts
- **Multi-language** — English / Vietnamese (i18next) on web and mobile

### 🛡️ Admin & Moderation Console

- **Dashboard & analytics** — platform stats, engagement, trending content, top creators, hashtags
- **User management** — browse, inspect, and change user status (suspend / ban)
- **Content moderation** — review reported posts and users, resolve report status
- **Conversation & message inspection** — moderation views over chat data
- **AI-agent oversight** — monitor agent usage
- **Audit log** — record of administrative actions (`AdminAuditLog`)
- **System & platform settings** — runtime-configurable admin settings

---

## 🏗️ Architecture

```
┌──────────────────────────┐      ┌──────────────────────────┐
│     chatly-frontend      │      │      chatly-mobile        │
│   React 18 · Vite · TS   │      │  Expo 54 · React Native 19│
└───────────┬──────────────┘      └────────────┬─────────────┘
            │   REST + WebSocket (STOMP/SockJS) │
            └──────────────┬────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────┐
│                     chatly-backend                        │
│              Spring Boot 4.0.3 · Java 21                  │
│                                                           │
│   REST API (/api/**)          WebSocket (/ws, /ws-raw)   │
│                                                           │
│   Auth · Users · Contacts     STOMP Broker               │
│   Conversations · Messages    Presence Events            │
│   Groups · Posts · Reels      Notification Push          │
│   Stories · Feed · Follows    Call Signaling             │
│   Calls · Notifications       AI Proxy (SSE)             │
│   Files · Reports · Admin     MCP Server                 │
└─┬───────────────┬──────────────────┬──────────┬──────────┘
  │ internal REST │ X-Internal-API-Key│          │
  ▼               ▼                   ▼          ▼
┌───────────────┐ ┌──────────┐ ┌──────────────┐ ┌─────────┐
│ chatly-agent  │ │PostgreSQL│ │   MongoDB     │ │  Redis  │
│ FastAPI·Python│ │ Users    │ │ Conversations │ │ JWT     │
│ LangGraph·RAG │ │ Contacts │ │ Messages·Posts│ │ blacklist│
│ Groq LLaMA    │ │ Follows  │ │ Reels·Stories │ │ Presence│
│ Qdrant·MinIO  │ │ Sessions │ │ Notifications │ │ QR/OTP  │
│ Tavily·MCP    │ │ Groups   │ │ Admin·Reports │ └─────────┘
└──────┬────────┘ └──────────┘ └──────────────┘
       │ vectors
       ▼
┌──────────────┐        ┌──────────────────┐
│    Qdrant    │        │   Agora RTC      │
│  embeddings  │        │  voice / video   │
└──────────────┘        └──────────────────┘
```

### WebSocket Channels

| Destination / Topic        | Direction       | Description                          |
| -------------------------- | --------------- | ------------------------------------ |
| `/app/chat.send`           | client → server | Send a new message                   |
| `/app/chat.typing`         | client → server | Broadcast typing status              |
| `/app/chat.seen`           | client → server | Mark message as seen                 |
| `/app/call.*`              | client → server | Call signaling (invite/accept/end)   |
| `/topic/conversation/{id}` | server → client | Incoming messages for a conversation |
| `/topic/presence`          | server → client | Online/offline broadcast             |
| `/topic/feed/{userId}`     | server → client | Real-time notifications for the user |
| `/queue/errors`            | server → client | Private error delivery               |

---

## 🧱 Tech Stack

### Backend (`chatly-backend`)

| Component         | Technology                              |
| ----------------- | --------------------------------------- |
| Framework         | Spring Boot 4.0.3 (Java 21)             |
| REST API          | Spring Web MVC                          |
| WebSocket         | Spring WebSocket + STOMP + SockJS       |
| Security          | Spring Security + JWT (JJWT 0.12.6)     |
| ORM (SQL)         | Spring Data JPA + Hibernate             |
| ODM (NoSQL)       | Spring Data MongoDB                     |
| Cache / Presence  | Spring Data Redis                       |
| HTTP Client       | Spring WebFlux WebClient (reactive)     |
| AI / MCP          | Spring AI — MCP server (WebMVC)         |
| Object Storage    | AWS SDK v2 — S3 / MinIO                 |
| Real-time A/V     | Agora RTC token service                 |
| Email             | Spring Mail + Thymeleaf templates       |
| Monitoring        | Spring Boot Actuator                    |
| Mapping           | MapStruct 1.6.3 + Lombok                |
| SQL Database      | PostgreSQL 16                           |
| NoSQL Database    | MongoDB 7                               |
| Cache             | Redis 7                                 |

### AI Agent (`chatly-agent`)

| Component        | Technology                                  |
| ---------------- | ------------------------------------------- |
| Framework        | FastAPI (Python 3.12)                       |
| Agent Runtime    | LangGraph + LangChain                       |
| LLM              | Groq — LLaMA 3.3-70B Versatile              |
| Checkpointing    | LangGraph MongoDB checkpointer              |
| Vector DB        | Qdrant                                      |
| Embeddings       | HuggingFace `BAAI/bge-base-en-v1.5`         |
| Web Search       | Tavily                                      |
| Object Storage   | MinIO (dev) / AWS S3 (prod)                 |
| Document parsing | pypdf, python-docx, Pillow                  |
| Tool Protocol    | Model Context Protocol (MCP)                |
| Observability    | LangSmith (optional)                        |
| Config           | Pydantic Settings                           |

### Frontend (`chatly-frontend`)

| Component        | Technology                          |
| ---------------- | ----------------------------------- |
| Framework        | React 18 + TypeScript 5             |
| Build Tool       | Vite 7 (SWC)                        |
| Routing          | React Router v7                     |
| State Management | Zustand                             |
| UI Components    | shadcn/ui (Radix UI) + Tailwind CSS v4 |
| Rich Text        | Lexical editor                      |
| Forms            | React Hook Form + Zod               |
| HTTP Client      | Axios (interceptors + auto-refresh) |
| WebSocket Client | STOMP.js + SockJS                   |
| Real-time A/V    | Agora RTC SDK NG                    |
| i18n             | i18next (EN / VI)                   |
| Animations       | Framer Motion                       |
| Notifications    | Sonner                              |

### Mobile (`chatly-mobile`)

| Component        | Technology                       |
| ---------------- | -------------------------------- |
| Framework        | Expo 54 + React Native (React 19)|
| Routing          | Expo Router v6                   |
| Styling          | NativeWind (Tailwind for RN)     |
| State Management | Zustand                          |
| WebSocket Client | STOMP.js                         |
| Push             | Expo Notifications               |
| Media            | expo-camera / image / video / audio |
| i18n             | i18next (EN / VI)                |

---

## 🗂️ Project Structure

```
chatly-messaging-platform/
│
├── chatly-backend/                       # Spring Boot API server
│   ├── src/main/java/com/chatly/
│   │   ├── controller/                   # REST controllers (29 total)
│   │   │   ├── Auth · AuthSession · User · UserSettings · Contact
│   │   │   ├── Conversation · Message · ChatMessage(WS) · Group
│   │   │   ├── Post · Feed · Reel · Story · Follow
│   │   │   ├── Notification · FileUpload · Music
│   │   │   ├── Call: AgoraCall · CallHistory · CallWebSocket
│   │   │   ├── Agent: AgentChat · AgentSession · AgentFile
│   │   │   │          AgentMcp · AgentSocialSession
│   │   │   ├── Report · Admin · Health
│   │   │   └── EmailVerificationView
│   │   ├── service/                      # Business logic layer
│   │   ├── websocket/                    # STOMP message handlers
│   │   ├── security/                     # JWT + Spring Security
│   │   ├── model/
│   │   │   ├── postgres/                 # JPA entities
│   │   │   │   ├── User · Contact · Follow · GroupMember
│   │   │   │   ├── EmailVerificationOtp · QrLoginToken
│   │   │   │   └── UserLoginSession
│   │   │   └── mongo/                    # MongoDB documents
│   │   │       ├── Conversation · Message · Attachment · Poll
│   │   │       ├── Post · PostComment · PostReaction · SavedPost
│   │   │       ├── Reel · Story · StoryReaction · StoryReply
│   │   │       ├── CallSession · CloseFriend · GroupNote/Reminder
│   │   │       ├── Notification · FileMetadata · *Settings
│   │   │       └── Admin: AdminAuditLog · AdminSettings · *Report
│   │   ├── dto/ · repository/ · mapper/  # DTOs, repos, MapStruct
│   │   └── exception/                    # Global exception handler
│   └── src/main/resources/
│       ├── application.yml · application-dev.yml · application-prod.yml
│       └── docker-compose.yml            # Local infra (DBs + admin UIs)
│
├── chatly-agent/                         # Python AI microservice
│   └── app/
│       ├── agents/ · graphs/ (+ nodes/)  # LangGraph agent definitions
│       ├── routers/                      # chat · sessions · files · mcp · internal · health
│       ├── services/ · repositories/     # Business logic & DB access
│       ├── models/ · prompts/ · tools/   # Pydantic models, prompts, MCP tools
│       ├── storage/ · db/ · middleware/  # MinIO/S3, Mongo, auth
│       └── config.py                     # Pydantic settings
│
├── chatly-frontend/                      # React 18 web client
│   └── src/
│       ├── pages/
│       │   ├── app/                      # chat · feed · home · explore · post
│       │   │   reels · profile · contact · chatbot · cloud
│       │   │   saved · create · join · settings
│       │   ├── admin/                    # dashboard · users · posts · reports
│       │   │   conversations · messages · audit · engagement
│       │   │   trending · hashtags · creators · ai-agent · system
│       │   ├── auth/ (login · register)  # Auth screens
│       │   └── public/ (landing·privacy·terms) · fallback/
│       ├── components/ · services/       # Shared components, Axios layer
│       ├── store/ · hooks/ · locales/    # Zustand, hooks, i18n (en/vi)
│       └── types/                        # TypeScript type definitions
│
├── chatly-mobile/                        # Expo React Native client
│   └── app/
│       ├── (auth)/                       # login · register
│       └── (tabs)/                       # home · chats · contacts · assistant · cloud · settings
│           + chat · reels · post · profile · notifications · qr-scan · sessions
│
├── docker-compose.yml                    # Full stack (DBs + agent + backend)
└── _resources/                           # Architecture docs & diagrams
```

---

## 🚀 Getting Started

### Prerequisites

| Tool       | Version | Notes                       |
| ---------- | ------- | --------------------------- |
| JDK        | 21+     | Backend                     |
| Node.js    | 20+     | Web & mobile                |
| Python     | 3.12+   | AI agent                    |
| PostgreSQL | 16+     | or via Docker               |
| MongoDB    | 7+      | or via Docker               |
| Redis      | 7+      | or via Docker               |
| Qdrant     | latest  | AI agent vector store (Docker) |
| Docker     | 24+     | Recommended for infra       |

### Option A — Full stack with Docker (fastest)

```bash
# From repo root: starts PostgreSQL 16, MongoDB 7, Redis 7, Qdrant,
# the AI agent, and the backend.
docker-compose up -d
```

> The root `docker-compose.yml` pulls pre-built `chatly-backend` / `chatly-agent`
> images (set `DOCKERHUB_USERNAME`). For local development, run the infra only and
> start the apps yourself (Option B).

### Option B — Local development

#### 1. Infrastructure only

```bash
# Databases + admin UIs (pgAdmin, RedisInsight)
docker-compose -f chatly-backend/docker-compose.yml up -d
```

#### 2. Backend

```bash
cd chatly-backend

# Linux / macOS
./mvnw spring-boot:run

# Windows
.\mvnw.cmd spring-boot:run
```

API server starts at `http://localhost:8080`

#### 3. AI Agent (optional)

```bash
cd chatly-agent

cp .env.example .env
# Fill in at minimum: GROQ_API_KEY, MONGODB_URI, QDRANT_URL, INTERNAL_API_KEY

pip install uv
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

Agent service starts at `http://localhost:8000`

#### 4. Frontend Web

```bash
cd chatly-frontend

cp .env.example .env
# Set: VITE_BACKEND_BASE_URL=http://localhost:8080

npm install
npm run dev
```

Dev server starts at `http://localhost:3000`

#### 5. Mobile (optional)

```bash
cd chatly-mobile
npm install
npx expo start
```

---

## 🌐 REST API Reference

Base URL: `http://localhost:8080`

| Module             | Key Endpoints                                                                                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Auth**           | `POST /api/auth/register` · `login` · `logout` · `refresh` · `introspect` · `resend-verification` · `forgot-password` · `change-password`                                                                                                       |
| **QR Login**       | `POST /api/auth/qr/generate` · `GET /api/auth/qr/status/{token}` · `POST /api/auth/qr/confirm`                                                                                                                                                  |
| **Sessions**       | `GET /api/auth/sessions` · `POST /api/auth/sessions/purge` · `DELETE /api/auth/sessions/{sessionId}`                                                                                                                                            |
| **Users**          | `GET /api/users/me` · `GET /api/users/{id}` · `PUT /api/users/{id}`                                                                                                                                                                             |
| **User Settings**  | `GET /api/users/me/settings` · `PUT /api/users/me/settings` · `PATCH /api/users/me/settings/{section}`                                                                                                                                          |
| **Contacts**       | `GET /api/contacts` · `POST /api/contacts` · `PUT /api/contacts/{id}/accept` · `PUT /api/contacts/{id}/block`                                                                                                                                   |
| **Follows**        | `POST /api/follows/{userId}` · `DELETE /api/follows/{userId}` · `GET /api/users/{id}/followers` · `GET /api/users/{id}/following`                                                                                                               |
| **Conversations**  | `GET /api/conversations` · `POST /api/conversations` · `GET /api/conversations/{id}`                                                                                                                                                            |
| **Messages**       | `POST /api/messages` · `GET /api/messages/conversation/{id}` · `PUT /api/messages/{id}/seen` · `POST /api/messages/forward` · `PUT /api/messages/{id}/react` · `PUT /api/messages/{id}/edit` · `DELETE /api/messages/{id}/recall`               |
| **Groups**         | `GET /api/groups/{id}/members` · `POST /api/groups/{id}/members` · `PUT /api/groups/{id}/members/{uid}/role` · `DELETE /api/groups/{id}/members/{uid}` · `PUT /api/groups/{id}`                                                                  |
| **Posts**          | `POST /api/posts` · `GET /api/posts/feed` · `GET /api/posts/{id}` · `PATCH /api/posts/{id}` · `DELETE /api/posts/{id}` · `GET /api/posts/search` · `PUT /api/posts/{id}/save` · `POST /api/posts/{id}/react` · `POST /api/posts/{id}/comments`   |
| **Feed**           | `GET /api/feed/home` · `GET /api/feed/explore` · `GET /api/feed/user/{userId}`                                                                                                                                                                  |
| **Reels**          | `POST /api/reels` · `GET /api/reels/feed` · `GET /api/reels/{id}` · `GET /api/reels/users/{userId}` · `POST /api/reels/{id}/view` · `PUT /api/reels/{id}/reactions` · `POST /api/reels/{id}/comments` · `POST /api/reels/{id}/share`             |
| **Stories**        | `POST /api/stories` · `GET /api/stories/feed` · `GET /api/stories/me` · `POST /api/stories/{id}/view` · `POST /api/stories/{id}/react` · `POST /api/stories/{id}/reply` · `GET /api/stories/{id}/viewers`                                        |
| **Notifications**  | `GET /api/notifications` · `GET /api/notifications/unread-count` · `PUT /api/notifications/{id}/read` · `PUT /api/notifications/read-all`                                                                                                        |
| **Files**          | `POST /api/files/upload` · `GET /api/files/{id}`                                                                                                                                                                                                |
| **Music**          | `GET /api/music/search`                                                                                                                                                                                                                         |
| **Calls**          | `POST /api/calls/agora-token` · `GET /api/calls/history` · `GET /api/calls/{callId}`                                                                                                                                                            |
| **AI Agent**       | `POST /api/ai/sessions` · `GET /api/ai/sessions` · `PATCH/DELETE /api/ai/sessions/{id}` · `GET /api/ai/sessions/{id}/messages` · `POST /api/ai/sessions/{id}/chat` · `POST /api/ai/sessions/{id}/chat/stream` (SSE)                              |
| **AI Files**       | `POST/GET /api/ai/sessions/{id}/files` · `GET /api/ai/sessions/{id}/files/{fileId}/content` · `DELETE …/{fileId}`                                                                                                                               |
| **AI MCP**         | `POST/GET /api/ai/mcp/servers` · `GET /api/ai/mcp/servers/{id}` · `PATCH …/{id}/toggle` · `GET …/{id}/tools` · `DELETE …/{id}`                                                                                                                  |
| **AI Social**      | `POST /api/ai/social/start-from-post`                                                                                                                                                                                                           |
| **Reports**        | `POST /api/reports` · `POST/GET /api/reports/users` · `PUT /api/reports/users/{id}/status` · `GET /api/reports` · `PUT /api/reports/{id}/status`                                                                                                |
| **Admin**          | `GET /api/admin/stats` · `GET/POST /api/admin/users` · `GET /api/admin/posts` · `GET /api/admin/conversations` · `GET /api/admin/messages` · …                                                                                                  |
| **Health**         | `GET /api/health` · `GET /actuator/**`                                                                                                                                                                                                          |

> Full request/response examples: `chatly-backend/docs/Chatly API.postman_collection.json`

---

## 🔐 Authentication & Security

| Mechanism          | Details                                            |
| ------------------ | -------------------------------------------------- |
| JWT Access Token   | 1-day TTL, HMAC-SHA256 signed                      |
| JWT Refresh Token  | 7-day TTL, single-use rotation                     |
| Token Blacklist    | Stored in Redis on logout                          |
| QR Login           | Short-lived QR token, confirmed from a logged-in device |
| Multi-device       | Per-device login sessions, revocable individually  |
| Password Hashing   | BCrypt                                             |
| Email Verification | OTP-based verification on registration             |
| WebSocket Auth     | JWT validated at handshake via channel interceptor |
| Agent Auth         | `X-Internal-API-Key` header (backend ↔ agent)      |
| RTC Auth           | Server-issued Agora RTC token (App ID + Certificate) |
| CORS               | Configurable per environment (dev / prod)          |
| Session Policy     | Stateless (`SessionCreationPolicy.STATELESS`)      |

---

## 📦 Environment Variables

### Backend (`application-dev.yml`)

| Key                           | Default                                   | Description                      |
| ----------------------------- | ----------------------------------------- | -------------------------------- |
| `spring.datasource.url`       | `jdbc:postgresql://localhost:5432/chatly` | PostgreSQL connection URL        |
| `spring.data.mongodb.uri`     | `mongodb://localhost:27017/chatly`        | MongoDB connection URI           |
| `spring.data.redis.host`      | `localhost`                               | Redis host                       |
| `app.jwt.secret`              | _(base64 key)_                            | HMAC signing key for JWT         |
| `app.jwt.expiration-ms`       | `86400000`                                | Access token TTL (1 day)         |
| `app.cors.allowed-origins`    | `http://localhost:3000`                   | Allowed CORS origins             |
| `app.agent.base-url`          | `http://localhost:8000`                   | AI agent service URL             |
| `app.agent.internal-api-key`  | —                                         | Shared internal API key          |
| `app.music.jamendo.client-id` | —                                         | Jamendo API client ID (optional) |
| `app.reels.max-video-size-mb` | `20`                                      | Maximum Reel upload size in MB   |
| `app.agora.app-id`            | —                                         | Agora RTC App ID                 |
| `app.agora.app-certificate`   | —                                         | Agora RTC App Certificate        |
| `app.agora.token-ttl-seconds` | `3600`                                    | Agora RTC token TTL              |

### AI Agent (`.env`)

| Key                       | Description                                       |
| ------------------------- | ------------------------------------------------- |
| `GROQ_API_KEY`            | Groq LLM API key                                  |
| `GROQ_MODEL`              | Model name (default: `llama-3.3-70b-versatile`)   |
| `MONGODB_URI` · `MONGODB_DB_NAME` | MongoDB connection & database              |
| `QDRANT_URL` · `QDRANT_API_KEY` · `QDRANT_COLLECTION_NAME` | Qdrant vector DB config    |
| `HUGGINGFACE_API_KEY` · `HF_EMBEDDING_MODEL` | Embedding model config         |
| `STORAGE_PROVIDER`        | `minio` or `s3`                                   |
| `MINIO_ENDPOINT` · `MINIO_ACCESS_KEY` · `MINIO_SECRET_KEY` · `MINIO_BUCKET_NAME` | Object storage |
| `INTERNAL_API_KEY`        | Shared internal API key (matches backend)         |
| `TAVILY_API_KEY`          | Tavily web-search tool key                        |
| `CHATLY_BACKEND_MCP_URL`  | Backend MCP server URL                            |
| `LANGSMITH_*`             | Optional LangSmith tracing                        |

### Frontend (`.env`)

| Key                           | Example                 | Description                        |
| ----------------------------- | ----------------------- | ---------------------------------- |
| `VITE_BACKEND_BASE_URL`       | `http://localhost:8080` | Backend API base URL               |
| `VITE_REEL_MAX_VIDEO_SIZE_MB` | `20`                    | Client-side Reel upload size guard |

---

## ☁️ Deployment

Designed for production on **AWS**:

| AWS Service     | Purpose                            |
| --------------- | ---------------------------------- |
| EC2 / ECS       | Spring Boot backend + Python agent |
| RDS             | PostgreSQL (managed)               |
| MongoDB Atlas   | MongoDB (managed)                  |
| ElastiCache     | Redis (managed)                    |
| S3 + CloudFront | Frontend static hosting & CDN      |
| S3              | File storage (chat & agent uploads) |
| ACM + ALB       | TLS termination & load balancing   |

```bash
# Build backend JAR
cd chatly-backend && ./mvnw clean package -Pprod -DskipTests

# Build frontend for production
cd chatly-frontend && npm run build       # output in dist/ → S3 / CloudFront

# Build agent Docker image
cd chatly-agent && docker build -t chatly-agent .

# Or build & ship the whole stack
docker-compose build && docker-compose push
```

---

## 🔭 Roadmap

- [x] Real-time 1-on-1 and group messaging
- [x] Social feed (posts, reactions, comments, hashtags)
- [x] Short-form Reels
- [x] Stories (text, photo, video, music, reactions, DM replies)
- [x] Follow / Unfollow social graph + Close Friends
- [x] AI chatbot with streaming, RAG, web search, and MCP tools
- [x] File uploads and personal cloud storage
- [x] Agora-backed voice & video calls + call history
- [x] Notifications (real-time push + mobile push + inbox)
- [x] QR login & multi-device session management
- [x] Admin & moderation console (analytics, reports, audit)
- [x] Multi-language UI (EN / VI) on web & mobile
- [ ] End-to-End Encryption (E2EE)
- [ ] Full-text message search with Elasticsearch
- [x] CI/CD pipeline with GitHub Actions
- [ ] Kubernetes-based deployment

---

## 📖 Disclaimer

This project is developed **for learning and academic purposes only**.
Chatly is **not affiliated with or endorsed by Zalo, Messenger, Instagram, or any other commercial messaging platform**.
