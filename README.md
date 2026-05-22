<div align="center">
  <img src="_resources/images/chatly-logo.png" alt="Chatly Logo" width="320"/>

  <h1>Chatly Messaging Platform</h1>

  <p>
    <strong>A modern, full-stack social messaging platform — chat, social feed, stories, AI assistant, and video calls in one place.</strong>
  </p>

  <p>
    <a href="https://openjdk.org/"><img src="https://img.shields.io/badge/Java-21-ED8B00?style=flat-square&logo=openjdk&logoColor=white" alt="Java 21"/></a>
    <a href="https://spring.io/projects/spring-boot"><img src="https://img.shields.io/badge/Spring_Boot-4.0.3-6DB33F?style=flat-square&logo=springboot&logoColor=white" alt="Spring Boot"/></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19"/></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5"/></a>
    <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI"/></a>
    <a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/PostgreSQL-15+-336791?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL"/></a>
    <a href="https://www.mongodb.com/"><img src="https://img.shields.io/badge/MongoDB-6+-47A248?style=flat-square&logo=mongodb&logoColor=white" alt="MongoDB"/></a>
    <a href="https://redis.io/"><img src="https://img.shields.io/badge/Redis-7+-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis"/></a>
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

Chatly is a full-stack real-time messaging platform built for educational purposes. It combines the instant messaging experience of Messenger/Zalo with the social feed of Instagram — plus a built-in AI assistant, WebRTC video calls, and personal file storage.

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
- **Reply, forward, edit, recall** — full message lifecycle management
- **Polls** — create interactive polls inside a conversation
- **Priority tagging** — mark messages as `IMPORTANT` or `URGENT`
- **Pinned messages** — pin key messages inside a conversation
- **Message search** — full-text search across conversation history

### 🏘️ Groups

- **Group management** — create, rename, update avatar, add/remove members
- **Role-based permissions** — `OWNER / ADMIN / MEMBER` hierarchy
- **Join requests** — request-and-approve flow for joining groups
- **Group notes** — shared notes visible to all members
- **Group reminders** — schedule reminders inside a group

### 🌐 Social

- **Social feed** — home feed from followed users, explore feed sorted by engagement score, user profile feed
- **Posts** — create, edit, delete text/media posts with hashtag support
- **Post reactions** — like / love / laugh / etc. on posts
- **Comments** — threaded comments on posts
- **Save posts** — bookmark posts for later
- **Share posts into chat** — share a post as a rich-preview message to any conversation
- **Follow / Unfollow** — asymmetric social graph (followers / following)
- **Explore page** — discover trending public posts

### 📸 Stories

- **Create stories** — text, photo, and video stories with custom background, font size, and music
- **24-hour expiry** — stories auto-expire after one day via MongoDB TTL index
- **Story reactions** — floating emoji reactions on stories
- **Story replies as DMs** — replies open a direct conversation, Instagram-style
- **View tracking** — track who viewed your story
- **Privacy controls** — `EVERYONE / FOLLOWERS_ONLY / ONLY_ME`

### 🤖 AI Assistant (`chatly-agent`)

- **LLM-powered chatbot** — powered by Groq (LLaMA 3.3-70B) via LangGraph agent graph
- **Streaming responses** — Server-Sent Events (SSE) for token-by-token output
- **Session management** — multi-turn conversation sessions per user
- **File understanding** — upload files to the agent for analysis (MinIO/S3 backed)
- **MCP tool integration** — connect external tools via Model Context Protocol
- **Vector search (RAG)** — Qdrant vector database for knowledge retrieval

### 📞 Calls

- **Voice & video calls** — WebRTC peer-to-peer calls
- **Call history** — per-conversation call session records

### 🔔 Notifications

- **Real-time push** — notifications delivered over WebSocket to the user feed channel
- **Notification types** — new message, story reaction, story reply, follow, post reaction, mention
- **Unread count badge** — live unread notification counter
- **Mark all as read** — batch-clear all notifications

### 👤 User & Account

- **JWT authentication** — access token (1-day) + refresh token (7-day) with Redis blacklist
- **Email verification** — OTP-based verification on registration
- **User presence** — online/offline status with last-seen timestamp
- **Contact management** — send, accept, and block friend requests
- **User settings** — notification preferences and privacy configuration
- **Cloud storage** — personal file vault backed by S3/MinIO
- **Multi-device sessions** — manage active login sessions across devices

---

## 🏗️ Architecture

```
┌──────────────────────────┐      ┌──────────────────────────┐
│     chatly-frontend      │      │      chatly-mobile        │
│   React 19 · Vite · TS   │      │    Expo 54 · React Native │
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
│   Groups · Posts · Stories    Notification Push          │
│   Feed · Follows · Calls      AI Proxy (SSE)             │
│   Notifications · Files                                   │
└──────┬──────────────────────────────────────┬────────────┘
       │ internal REST (X-Internal-API-Key)   │
       ▼                                      ▼
┌─────────────────┐     ┌──────────┐  ┌──────────────────┐
│  chatly-agent   │     │PostgreSQL│  │     MongoDB       │
│ FastAPI · Python│     │ Users    │  │ Conversations     │
│ LangGraph · RAG │     │ Contacts │  │ Messages · Posts  │
│ Groq LLaMA 3.3B │     │ Groups   │  │ Stories · Feed    │
│ Qdrant · MinIO  │     │ Follows  │  │ Notifications     │
└─────────────────┘     └──────────┘  └──────────────────┘
                                              ▲
                                       ┌──────┴──────┐
                                       │    Redis     │
                                       │ JWT Blacklist│
                                       │ Presence     │
                                       └─────────────┘
```

### WebSocket Channels

| Destination / Topic        | Direction       | Description                          |
| -------------------------- | --------------- | ------------------------------------ |
| `/app/chat.send`           | client → server | Send a new message                   |
| `/app/chat.typing`         | client → server | Broadcast typing status              |
| `/app/chat.seen`           | client → server | Mark message as seen                 |
| `/topic/conversation/{id}` | server → client | Incoming messages for a conversation |
| `/topic/presence`          | server → client | Online/offline broadcast             |
| `/topic/feed/{userId}`     | server → client | Real-time notifications for the user |
| `/queue/errors`            | server → client | Private error delivery               |

---

## 🧱 Tech Stack

### Backend (`chatly-backend`)

| Component        | Technology                          |
| ---------------- | ----------------------------------- |
| Framework        | Spring Boot 4.0.3 (Java 21)         |
| REST API         | Spring Web MVC                      |
| WebSocket        | Spring WebSocket + STOMP + SockJS   |
| Security         | Spring Security + JWT (JJWT 0.12.6) |
| ORM (SQL)        | Spring Data JPA + Hibernate         |
| ODM (NoSQL)      | Spring Data MongoDB                 |
| Cache            | Spring Data Redis                   |
| HTTP Client      | Spring WebFlux WebClient            |
| Mapping          | MapStruct 1.6.3 + Lombok            |
| SQL Database     | PostgreSQL 15                       |
| NoSQL Database   | MongoDB 6                           |
| Cache / Presence | Redis 7                             |

### AI Agent (`chatly-agent`)

| Component      | Technology                        |
| -------------- | --------------------------------- |
| Framework      | FastAPI 0.115 (Python 3.12)       |
| Agent Runtime  | LangGraph                         |
| LLM            | Groq — LLaMA 3.3-70B Versatile    |
| Vector DB      | Qdrant                            |
| Embeddings     | HuggingFace BAAI/bge-base-en-v1.5 |
| Object Storage | MinIO (dev) / AWS S3 (prod)       |
| Tool Protocol  | Model Context Protocol (MCP)      |
| Config         | Pydantic BaseSettings             |

### Frontend (`chatly-frontend`)

| Component        | Technology                          |
| ---------------- | ----------------------------------- |
| Framework        | React 19 + TypeScript 5             |
| Build Tool       | Vite 7 (SWC)                        |
| Routing          | React Router v7                     |
| State Management | Zustand                             |
| UI Components    | shadcn/ui + Tailwind CSS v4         |
| Forms            | React Hook Form + Zod               |
| HTTP Client      | Axios (interceptors + auto-refresh) |
| WebSocket Client | STOMP.js + SockJS                   |
| Animations       | Framer Motion                       |
| Notifications    | Sonner                              |

### Mobile (`chatly-mobile`)

| Component        | Technology                   |
| ---------------- | ---------------------------- |
| Framework        | Expo 54 + React Native       |
| Routing          | Expo Router v6               |
| Styling          | NativeWind (Tailwind for RN) |
| State Management | Zustand                      |

---

## 🗂️ Project Structure

```
chatly-messaging-platform/
│
├── chatly-backend/                       # Spring Boot API server
│   ├── src/main/java/com/chatly/
│   │   ├── controller/                   # REST controllers (22 total)
│   │   │   ├── Auth · User · Contact
│   │   │   ├── Conversation · Message · Group
│   │   │   ├── Post · Feed · Story
│   │   │   ├── Follow · Notification
│   │   │   ├── FileUpload · Music · Call
│   │   │   └── AgentChat · AgentSession · Health
│   │   ├── service/                      # Business logic layer
│   │   ├── websocket/                    # STOMP message handlers
│   │   ├── security/                     # JWT + Spring Security
│   │   ├── model/
│   │   │   ├── postgres/                 # JPA entities
│   │   │   │   ├── User.java
│   │   │   │   ├── Contact.java
│   │   │   │   ├── Follow.java
│   │   │   │   └── GroupMember.java
│   │   │   └── mongo/                    # MongoDB documents
│   │   │       ├── Conversation · Message · Attachment
│   │   │       ├── Post · PostComment · PostReaction
│   │   │       ├── Story · StoryReaction · StoryReply
│   │   │       ├── Notification · CallSession
│   │   │       └── FileMetadata · UserSettings
│   │   ├── dto/                          # Request / Response DTOs
│   │   ├── repository/                   # JPA & Mongo repositories
│   │   ├── mapper/                       # MapStruct mappers
│   │   └── exception/                    # Global exception handler
│   └── src/main/resources/
│       ├── application.yml
│       ├── application-dev.yml
│       └── application-prod.yml
│
├── chatly-agent/                         # Python AI microservice
│   └── app/
│       ├── agents/                       # LangGraph agent definitions
│       ├── graphs/                       # Agent computation graphs
│       ├── routers/                      # FastAPI route handlers
│       ├── services/                     # Business logic
│       ├── repositories/                 # DB access (MongoDB, Qdrant)
│       ├── models/                       # Pydantic models
│       ├── prompts/                      # LLM prompt templates
│       ├── tools/                        # MCP-compatible agent tools
│       ├── storage/                      # MinIO/S3 integration
│       └── config.py                     # Pydantic settings
│
├── chatly-frontend/                      # React 19 web client
│   └── src/
│       ├── pages/app/
│       │   ├── chat/                     # Chat window, message list
│       │   ├── feed/                     # Home feed + Explore
│       │   ├── post/                     # Post detail
│       │   ├── profile/                  # User profiles
│       │   ├── contact/                  # Contacts & requests
│       │   ├── chatbot/                  # AI assistant UI
│       │   ├── cloud/                    # File vault
│       │   └── settings/                 # User settings
│       ├── components/app/               # Shared app components
│       ├── services/                     # Axios service layer
│       ├── store/                        # Zustand stores
│       ├── hooks/                        # useChatSocket, usePresence…
│       └── types/                        # TypeScript type definitions
│
├── chatly-mobile/                        # Expo React Native client
│   └── app/
│       ├── (auth)/                       # Auth screens
│       └── (tabs)/                       # Tab navigation
│
└── _resources/                           # Architecture docs & diagrams
    ├── architecture/
    └── diagram/
```

---

## 🚀 Getting Started

### Prerequisites

| Tool       | Version |
| ---------- | ------- |
| JDK        | 21+     |
| Node.js    | 20+     |
| Python     | 3.12+   |
| PostgreSQL | 15+     |
| MongoDB    | 6+      |
| Redis      | 7+      |

### 1. Infrastructure (Docker — fastest start)

```bash
docker-compose -f chatly-backend/docker-compose.yml up -d
# Starts: PostgreSQL 15, MongoDB 6, Redis 7
```

### 2. Backend

```bash
cd chatly-backend

# Linux / macOS
./mvnw spring-boot:run

# Windows
.\mvnw.cmd spring-boot:run
```

API server starts at `http://localhost:8080`

### 3. AI Agent (optional)

```bash
cd chatly-agent

cp .env.example .env
# Fill in: GROQ_API_KEY, MONGODB_URI, QDRANT_URL

pip install uv
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

Agent service starts at `http://localhost:8000`

### 4. Frontend Web

```bash
cd chatly-frontend

cp .env.example .env
# Set: VITE_BACKEND_BASE_URL=http://localhost:8080

npm install
npm run dev
```

Dev server starts at `http://localhost:3000`

### 5. Mobile (optional)

```bash
cd chatly-mobile
npm install
npx expo start
```

---

## 🌐 REST API Reference

Base URL: `http://localhost:8080`

| Module            | Key Endpoints                                                                                                                                                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**          | `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/logout` · `POST /api/auth/refresh`                                                                                                                                        |
| **Users**         | `GET /api/users/me` · `GET /api/users/{id}` · `PUT /api/users/{id}`                                                                                                                                                                            |
| **Contacts**      | `GET /api/contacts` · `POST /api/contacts` · `PUT /api/contacts/{id}/accept` · `PUT /api/contacts/{id}/block`                                                                                                                                  |
| **Follows**       | `POST /api/follows/{userId}` · `DELETE /api/follows/{userId}` · `GET /api/users/{id}/followers` · `GET /api/users/{id}/following`                                                                                                              |
| **Conversations** | `GET /api/conversations` · `POST /api/conversations` · `GET /api/conversations/{id}`                                                                                                                                                           |
| **Messages**      | `POST /api/messages` · `GET /api/messages/conversation/{id}` · `PUT /api/messages/{id}/seen` · `POST /api/messages/forward` · `PUT /api/messages/{id}/react` · `PUT /api/messages/{id}/edit` · `DELETE /api/messages/{id}/recall`              |
| **Groups**        | `GET /api/groups/{id}/members` · `POST /api/groups/{id}/members` · `PUT /api/groups/{id}/members/{uid}/role` · `DELETE /api/groups/{id}/members/{uid}` · `PUT /api/groups/{id}`                                                                |
| **Posts**         | `POST /api/posts` · `GET /api/posts/feed` · `GET /api/posts/{id}` · `PATCH /api/posts/{id}` · `DELETE /api/posts/{id}` · `GET /api/posts/search` · `PUT /api/posts/{id}/save` · `POST /api/posts/{id}/react` · `POST /api/posts/{id}/comments` |
| **Feed**          | `GET /api/feed/home` · `GET /api/feed/explore` · `GET /api/feed/user/{userId}`                                                                                                                                                                 |
| **Stories**       | `POST /api/stories` · `GET /api/stories/feed` · `GET /api/stories/me` · `POST /api/stories/{id}/view` · `POST /api/stories/{id}/react` · `POST /api/stories/{id}/reply` · `GET /api/stories/{id}/viewers`                                      |
| **Reels**         | `POST /api/reels` · `GET /api/reels/feed` · `GET /api/reels/{id}` · `GET /api/reels/users/{userId}` · `POST /api/reels/{id}/view`                                                                                                               |
| **Notifications** | `GET /api/notifications` · `GET /api/notifications/unread-count` · `PUT /api/notifications/{id}/read` · `PUT /api/notifications/read-all`                                                                                                      |
| **Files**         | `POST /api/files/upload` · `GET /api/files/{id}`                                                                                                                                                                                               |
| **Music**         | `GET /api/music/search`                                                                                                                                                                                                                        |
| **AI Agent**      | `POST /api/ai/sessions` · `POST /api/ai/sessions/{id}/chat` · `POST /api/ai/sessions/{id}/chat/stream` (SSE)                                                                                                                                   |
| **Calls**         | `GET /api/calls/history` · `GET /api/calls/{callId}`                                                                                                                                                                                           |
| **Health**        | `GET /api/health`                                                                                                                                                                                                                              |

> Full request/response examples: `chatly-backend/docs/Chatly API.postman_collection.json`

---

## 🔐 Authentication & Security

| Mechanism          | Details                                            |
| ------------------ | -------------------------------------------------- |
| JWT Access Token   | 1-day TTL, HMAC-SHA256 signed                      |
| JWT Refresh Token  | 7-day TTL, single-use rotation                     |
| Token Blacklist    | Stored in Redis on logout                          |
| Password Hashing   | BCrypt                                             |
| Email Verification | OTP-based verification on registration             |
| WebSocket Auth     | JWT validated at handshake via channel interceptor |
| Agent Auth         | `X-Internal-API-Key` header (backend → agent)      |
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
| `app.music.jamendo.client-id` | —                                         | Jamendo API client ID (optional) |
| `app.reels.max-video-size-mb` | `20`                                      | Maximum Reel upload size in MB   |

### AI Agent (`.env`)

| Key                | Description                                     |
| ------------------ | ----------------------------------------------- |
| `GROQ_API_KEY`     | Groq LLM API key                                |
| `GROQ_MODEL`       | Model name (default: `llama-3.3-70b-versatile`) |
| `MONGODB_URI`      | MongoDB connection URI                          |
| `QDRANT_URL`       | Qdrant vector DB URL                            |
| `MINIO_ENDPOINT`   | MinIO endpoint (dev)                            |
| `STORAGE_PROVIDER` | `minio` or `s3`                                 |

### Frontend (`.env`)

| Key                     | Example                 | Description          |
| ----------------------- | ----------------------- | -------------------- |
| `VITE_BACKEND_BASE_URL` | `http://localhost:8080` | Backend API base URL |
| `VITE_REEL_MAX_VIDEO_SIZE_MB` | `20`              | Client-side Reel upload size guard |

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
| S3              | File storage (agent uploads)       |
| ACM + ALB       | TLS termination & load balancing   |

```bash
# Build backend JAR
./mvnw clean package -Pprod -DskipTests

# Build frontend for production
cd chatly-frontend && npm run build
# Output in dist/ — deploy to S3 / CloudFront

# Build agent Docker image
cd chatly-agent && docker build -t chatly-agent .
```

---

## 🔭 Roadmap

- [x] Real-time 1-on-1 and group messaging
- [x] Social feed (posts, reactions, comments, hashtags)
- [x] Stories (text, photo, video, music, reactions, DM replies)
- [x] Follow / Unfollow social graph
- [x] AI chatbot with streaming (LangGraph + Groq)
- [x] File uploads and personal cloud storage
- [x] WebRTC call history
- [x] Notifications (real-time push + inbox)
- [ ] End-to-End Encryption (E2EE)
- [ ] Full-text message search with Elasticsearch
- [ ] CI/CD pipeline with GitHub Actions
- [ ] Kubernetes-based deployment

---

## 📖 Disclaimer

This project is developed **for learning and academic purposes only**.
Chatly is **not affiliated with or endorsed by Zalo, Messenger, Instagram, or any other commercial messaging platform**.

