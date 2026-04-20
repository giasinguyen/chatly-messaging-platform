<div align="center">
  <img src="_resources/images/chatly-logo-transparent.png" alt="Chatly Logo" width="180"/>

# Chatly Messaging Platform

[![Java](https://img.shields.io/badge/Java-21-ED8B00?logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-4.0.3-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6+-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-7+-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**A modern real-time messaging platform inspired by Zalo and Messenger**

[Features](#-features) • [Architecture](#️-system-architecture) • [Tech Stack](#-tech-stack) • [Project Structure](#️-project-structure) • [Getting Started](#-getting-started)

</div>

---

Chatly is a full-stack real-time messaging platform built for educational purposes, focusing on scalable architecture, real-time communication over WebSocket, and cloud-native deployment on AWS.

---

## 👥 Team


| Name                      | Role               |
| ------------------------- | ------------------ |
| Nguyễn Trần Gia Sĩ 🐍 | Backend Developer  |
| Nguyễn Văn Minh ☁      | Frontend Developer |
| Nguyễn Trung Nguyên 🗿  | Backend Developer  |
| Đào Quốc Tuấn 🐶     | Frontend Developer |

---

## 📌 Features

- **Real-time messaging** — 1-on-1 and group chat via STOMP/SockJS WebSocket
- **User presence** — Online / Offline status with last-seen timestamp
- **Typing indicators** — Live feedback when participants are composing
- **Delivery & read receipts** — Per-message status tracking
- **Group management** — Add/remove members, role-based permissions (OWNER / ADMIN / MEMBER)
- **JWT authentication** — Access token + Refresh token with Redis-backed blacklist
- **Contact management** — Send, accept, and block friend requests
- **User profiles** — Profile updates with privacy settings
- **i18n ready** — Internationalization support (vi / en)
- **Theming** — Dark / Light mode, fully responsive UI

---

## 🏗️ System Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│   chatly-frontend   │     │   chatly-mobile      │
│  React 19 + Vite 7  │     │  Expo 54 + RN        │
└────────┬────────────┘     └──────────┬───────────┘
         │  REST / WebSocket           │
         ▼                             ▼
┌─────────────────────────────────────────────────┐
│              chatly-backend                      │
│         Spring Boot 4.0.3 · Java 21              │
│                                                  │
│  REST API          WebSocket (STOMP/SockJS)      │
│  /api/**           /ws  (SockJS)                 │
│                    /ws-raw  (native WS)          │
└───────┬──────────────────────────────────────────┘
        │
   ┌────┴─────────────────────────────┐
   │                                  │
   ▼                                  ▼
┌──────────┐  ┌──────────┐  ┌──────────────────┐
│PostgreSQL│  │ MongoDB  │  │     Redis         │
│ Users    │  │ Messages │  │ JWT Blacklist     │
│ Contacts │  │ Convs    │  │ Presence Cache    │
│ Groups   │  │          │  │                   │
└──────────┘  └──────────┘  └──────────────────┘
```

### WebSocket Channels


| Destination / Topic        | Description                         |
| -------------------------- | ----------------------------------- |
| `/app/chat.send`           | Send a new message                  |
| `/app/chat.typing`         | Broadcast typing status             |
| `/app/chat.seen`           | Mark a message as seen              |
| `/topic/conversation/{id}` | Receive messages for a conversation |
| `/topic/presence`          | Broadcast online / offline status   |
| `/queue/errors`            | Private error delivery to a user    |

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
| Mapping          | MapStruct 1.6.3 + Lombok            |
| SQL Database     | PostgreSQL 15                       |
| NoSQL Database   | MongoDB 6                           |
| Cache / Presence | Redis 7                             |

### Frontend (`chatly-frontend`)


| Component        | Technology                               |
| ---------------- | ---------------------------------------- |
| Framework        | React 19 + TypeScript 5                  |
| Build Tool       | Vite 7.3 (SWC)                           |
| Routing          | React Router v7                          |
| State Management | Zustand                                  |
| UI Components    | shadcn/ui + Tailwind CSS v4              |
| Forms            | React Hook Form + Zod                    |
| HTTP Client      | Axios (with interceptors & auto-refresh) |
| WebSocket Client | STOMP.js + SockJS                        |
| Animations       | Framer Motion                            |
| Notifications    | Sonner                                   |

### Mobile (`chatly-mobile`)


| Component        | Technology                   |
| ---------------- | ---------------------------- |
| Framework        | Expo 54 + React Native       |
| Routing          | Expo Router v6               |
| Styling          | NativeWind (Tailwind for RN) |
| State Management | Zustand                      |

---

## 🗂️ Project Structure

```text
chatly-messaging-platform/
│
├── chatly-backend/                     # Spring Boot API Server
│   ├── src/main/java/com/chatly/
│   │   ├── controller/                 # REST Controllers
│   │   │   ├── AuthController.java
│   │   │   ├── UserController.java
│   │   │   ├── ContactController.java
│   │   │   ├── ConversationController.java
│   │   │   ├── MessageController.java
│   │   │   ├── GroupController.java
│   │   │   └── HealthController.java
│   │   ├── service/                    # Business Logic
│   │   │   ├── AuthService.java
│   │   │   ├── UserService.java
│   │   │   ├── ContactService.java
│   │   │   ├── ConversationService.java
│   │   │   ├── MessageService.java
│   │   │   ├── GroupService.java
│   │   │   ├── PresenceService.java
│   │   │   └── TokenBlacklistService.java
│   │   ├── model/
│   │   │   ├── postgres/               # JPA Entities (PostgreSQL)
│   │   │   │   ├── User.java
│   │   │   │   ├── Contact.java
│   │   │   │   └── GroupMember.java
│   │   │   └── mongo/                  # MongoDB Documents
│   │   │       ├── Conversation.java
│   │   │       ├── Message.java
│   │   │       ├── Attachment.java
│   │   │       ├── LastMessage.java
│   │   │       └── ReadReceipt.java
│   │   ├── websocket/                  # WebSocket Layer
│   │   │   ├── WebSocketConfig.java
│   │   │   ├── ChatMessageController.java
│   │   │   ├── PresenceEventListener.java
│   │   │   ├── JwtHandshakeHandler.java
│   │   │   └── WebSocketAuthInterceptor.java
│   │   ├── security/                   # JWT + Spring Security
│   │   │   ├── WebSecurityConfig.java
│   │   │   ├── JwtProvider.java
│   │   │   └── JwtAuthenticationFilter.java
│   │   ├── dto/                        # Request / Response DTOs
│   │   ├── repository/                 # JPA & Mongo Repositories
│   │   ├── mapper/                     # MapStruct Mappers
│   │   └── exception/                  # Global Error Handling
│   └── src/main/resources/
│       ├── application.yml
│       ├── application-dev.yml
│       └── application-prod.yml
│
├── chatly-frontend/                    # React 19 Web Client
│   └── src/
│       ├── pages/
│       │   ├── public/                 # Landing page
│       │   ├── auth/                   # Login / Register
│       │   ├── app/                    # Chat, Profile, Settings, Cloud
│       │   ├── admin/                  # Admin panel
│       │   └── fallback/               # 404
│       ├── services/                   # Axios API service layer
│       ├── hooks/                      # useChatSocket, usePresenceSocket
│       ├── store/                      # Zustand global stores
│       ├── types/                      # TypeScript type definitions
│       ├── components/                 # Shared UI components
│       ├── layouts/                    # App & Public layout wrappers
│       └── routes/                     # Route configuration
│
├── chatly-mobile/                      # Expo React Native Client
│   └── app/
│       ├── index.tsx                   # Home screen
│       ├── details.tsx                 # Detail screen
│       └── _layout.tsx                 # Root layout
│
├── _resources/                         # Shared assets and documentation
│   └── images/
│       └── chatly-logo-transparent.png
│
└── README.md
```

---

## 🔐 Authentication & Security


| Mechanism         | Details                                            |
| ----------------- | -------------------------------------------------- |
| JWT Access Token  | 1-day TTL, HMAC-SHA256 signed                      |
| JWT Refresh Token | 7-day TTL, single-use rotation                     |
| Token Blacklist   | Stored in Redis on logout                          |
| Password Hashing  | BCrypt                                             |
| WebSocket Auth    | JWT validated at handshake via channel interceptor |
| CORS              | Configurable per environment (dev / prod)          |
| Session Policy    | Stateless (`SessionCreationPolicy.STATELESS`)      |

---

## 🚀 Getting Started

### Prerequisites

- **JDK 21+**
- **Node.js 20+**
- **PostgreSQL 15+** — create a database named `chatly`
- **MongoDB 6+**
- **Redis 7+**

### 1. Backend

```bash
cd chatly-backend

# Default connection settings (see application-dev.yml):
#   PostgreSQL : localhost:5432/chatly  (user: chatly / password: chatly123)
#   MongoDB    : localhost:27017/chatly
#   Redis      : localhost:6379

# Linux / macOS
./mvnw spring-boot:run

# Windows
.\mvnw.cmd spring-boot:run
```

API server starts at `http://localhost:8080`

### 2. Frontend Web

```bash
cd chatly-frontend

# Copy the environment template
cp .env.example .env
# Set: VITE_BACKEND_BASE_URL=http://localhost:8080

npm install
npm run dev
```

Dev server starts at `http://localhost:3000`

### 3. Mobile (optional)

```bash
cd chatly-mobile

npm install
npx expo start
```

### Infrastructure via Docker Compose

```bash
# Spin up PostgreSQL, MongoDB, and Redis in containers
docker-compose -f chatly-backend/docker-compose.yml up -d
```

---

## 🌐 REST API Reference

Base URL: `http://localhost:8080`


| Module        | Endpoints                                                                                                                                                                           |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth          | `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/logout` · `POST /api/auth/refresh`                                                                          |
| Users         | `GET /api/users/me` · `GET /api/users/{id}` · `PUT /api/users/{id}`                                                                                                               |
| Contacts      | `GET /api/contacts` · `POST /api/contacts` · `PUT /api/contacts/{id}/accept` · `PUT /api/contacts/{id}/block`                                                                    |
| Conversations | `GET /api/conversations` · `POST /api/conversations` · `GET /api/conversations/{id}`                                                                                              |
| Messages      | `POST /api/messages` · `GET /api/messages/conversation/{id}` · `PUT /api/messages/{id}/seen`                                                                                      |
| Groups        | `GET /api/groups/{id}/members` · `POST /api/groups/{id}/members` · `PUT /api/groups/{id}/members/{uid}/role` · `DELETE /api/groups/{id}/members/{uid}` · `PUT /api/groups/{id}` |
| Health        | `GET /api/health`                                                                                                                                                                   |

> Full request/response examples are available in `chatly-backend/docs/Chatly API.postman_collection.json`.

---

## 📦 Environment Variables

### Backend (`application-dev.yml`)


| Key                        | Default                                   | Description                            |
| -------------------------- | ----------------------------------------- | -------------------------------------- |
| `spring.datasource.url`    | `jdbc:postgresql://localhost:5432/chatly` | PostgreSQL connection URL              |
| `spring.data.mongodb.uri`  | `mongodb://localhost:27017/chatly`        | MongoDB connection URI                 |
| `spring.data.redis.host`   | `localhost`                               | Redis host                             |
| `app.jwt.secret`           | _(base64 key)_                            | HMAC signing key for JWT               |
| `app.jwt.expiration-ms`    | `86400000`                                | Access token TTL (1 day)               |
| `app.cors.allowed-origins` | `http://localhost:3000`                   | Allowed CORS origins (comma-separated) |

### Frontend (`.env`)


| Key                     | Example                 | Description          |
| ----------------------- | ----------------------- | -------------------- |
| `VITE_BACKEND_BASE_URL` | `http://localhost:8080` | Backend API base URL |

---

## ☁️ Deployment

The system is designed for production deployment on **AWS**:


| AWS Service     | Purpose                          |
| --------------- | -------------------------------- |
| EC2 / ECS       | Spring Boot backend              |
| RDS             | PostgreSQL (managed)             |
| MongoDB Atlas   | MongoDB (managed)                |
| ElastiCache     | Redis (managed)                  |
| S3 + CloudFront | Frontend static hosting & CDN    |
| ACM + ALB       | TLS termination & load balancing |

```bash
# Build the backend JAR
./mvnw clean package -Pprod -DskipTests

# Build the frontend for production
cd chatly-frontend && npm run build
# Output in dist/ — ready to deploy to S3 / CloudFront
```

---

## 🔭 Roadmap

- [ ]  Media sharing — image and file uploads via Amazon S3
- [ ]  Push notifications — FCM / APNs integration
- [ ]  End-to-End Encryption (E2EE)
- [ ]  Full-text message search with Elasticsearch
- [ ]  Voice & video calling via WebRTC
- [ ]  CI/CD pipeline with GitHub Actions
- [ ]  Kubernetes-based deployment

---

## 📖 Disclaimer

This project is developed **for learning and academic purposes only**.
Chatly is **not affiliated with or endorsed by Zalo, Messenger, or any other commercial messaging platform**.

---
