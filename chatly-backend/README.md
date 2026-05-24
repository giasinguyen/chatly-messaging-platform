# Chatly Backend

Spring Boot 4 / Java 21 API server for the Chatly messaging platform. It owns authentication, users, contacts, conversations, messages, groups, calls, notifications, social posts, stories, reels, reports, file uploads, WebSocket delivery, and the backend MCP server used by `chatly-agent`.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Technology Stack](#technology-stack)
3. [Runtime Architecture](#runtime-architecture)
4. [Configuration](#configuration)
5. [API Surface](#api-surface)
6. [WebSocket Channels](#websocket-channels)
7. [AI and Agent Integration](#ai-and-agent-integration)
8. [Storage and Databases](#storage-and-databases)
9. [Schedulers](#schedulers)
10. [Development Commands](#development-commands)
11. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- Java 21+
- Docker and Docker Compose
- Maven through the included wrapper, `./mvnw`

### Start Infrastructure

```bash
cd chatly-backend
docker compose up -d
```

This starts:

| Service | Port | Purpose |
|---|---:|---|
| PostgreSQL 16 | `5432` | Users, auth/session tables, contacts, follows, group members |
| MongoDB 7 | `27017` | Conversations, messages, notifications, posts, stories, reels, files |
| Redis 7 | `6379` | Token blacklist and presence/cache data |
| pgAdmin | `5050` | PostgreSQL admin UI |
| RedisInsight | `5540` | Redis admin UI |

### Run the App

```bash
./mvnw spring-boot:run
```

The default profile is `dev`, configured by `src/main/resources/application.yml`.

Useful local URLs:

| URL | Description |
|---|---|
| `http://localhost:8080/` | Health page view |
| `http://localhost:8080/api/health` | JSON health check |
| `http://localhost:8080/ws` | SockJS STOMP endpoint |
| `ws://localhost:8080/ws-raw` | Raw WebSocket endpoint |
| `http://localhost:8080/actuator/health` | Actuator health |

### Register and Login

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "john_doe",
  "password": "Password123!",
  "displayName": "John Doe"
}
```

```http
POST /api/auth/login
Content-Type: application/json

{
  "identifier": "user@example.com",
  "password": "Password123!"
}
```

Successful auth responses follow the platform envelope:

```json
{
  "code": 1000,
  "message": null,
  "result": {
    "token": "...",
    "refreshToken": "...",
    "user": {}
  }
}
```

---

## Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Java 21 |
| Framework | Spring Boot 4.0.3 |
| HTTP | Spring Web MVC on Tomcat |
| Agent HTTP client | Spring WebFlux `WebClient` with Reactor Netty client |
| Security | Spring Security, JJWT 0.12.6 |
| WebSocket | Spring WebSocket, STOMP, SockJS |
| MCP | Spring AI MCP Server WebMVC 1.0.0 |
| SQL | PostgreSQL, Spring Data JPA, Hibernate |
| NoSQL | MongoDB, Spring Data MongoDB |
| Cache | Redis, Spring Data Redis |
| Mapping | MapStruct 1.6.3 |
| Boilerplate | Lombok |
| File storage | Local filesystem or AWS S3 |
| Mail | Spring Mail with HTML templates |

---

## Runtime Architecture

```text
Web / Mobile clients
        |
        | REST + JWT
        | STOMP over /ws or /ws-raw
        v
chatly-backend
  - REST controllers return ApiResponse<T>
  - STOMP controllers publish chat, presence, feed, and call events
  - Services enforce business rules and ownership
  - Repositories access PostgreSQL and MongoDB
  - Storage providers write local files or S3 objects
  - AgentProxyClient forwards user-facing AI endpoints to chatly-agent
  - Spring AI MCP server exposes backend tools to chatly-agent
        |
        +--> PostgreSQL
        +--> MongoDB
        +--> Redis
        +--> Local storage or AWS S3
        +--> chatly-agent
```

Layer rules:

- Controllers call services or proxy clients.
- Services call repositories and other services.
- Repositories are the only layer that query databases directly.
- API responses must use `ApiResponse<T>` except current known exceptions such as the health controller and byte/SSE proxy endpoints.

---

## Configuration

Base config lives in:

| File | Purpose |
|---|---|
| `application.yml` | Enables the `dev` profile and imports optional `.env` properties |
| `application-dev.yml` | Local defaults for infrastructure, JWT, MCP, agent proxy, storage |
| `application-prod.yml` | Production profile with environment-driven values |

### Important Environment Variables

| Variable | Default in dev | Description |
|---|---|---|
| `SERVER_PORT` | `8080` | HTTP server port |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/chatly` | PostgreSQL JDBC URL |
| `SPRING_DATASOURCE_USERNAME` | `chatly` | PostgreSQL user |
| `SPRING_DATASOURCE_PASSWORD` | `chatly123` | PostgreSQL password |
| `SPRING_DATA_MONGODB_URI` | `mongodb://localhost:27017/chatly` | MongoDB URI |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | `admin` | Redis password |
| `APP_JWT_SECRET` | dev placeholder | JWT signing secret |
| `APP_JWT_EXPIRATION_MS` | `86400000` | Access token lifetime |
| `APP_JWT_REFRESH_EXPIRATION_MS` | `86400000` | Refresh token lifetime in dev |
| `APP_CORS_ALLOWED_ORIGINS` | local web/mobile origins | Comma-separated CORS origin patterns |
| `APP_MCP_INTERNAL_API_KEY` | falls back to `AGENT_API_KEY` | Shared secret for Spring AI MCP protocol endpoints |
| `AGENT_BASE_URL` | `http://localhost:8000` | `chatly-agent` base URL |
| `AGENT_API_KEY` | dev placeholder | Shared secret sent as `X-API-Key` to `chatly-agent` |
| `AGENT_TIMEOUT_SECONDS` | `60` | Blocking agent proxy timeout |
| `AGENT_STREAM_TIMEOUT_SECONDS` | `120` | Streaming agent proxy timeout |
| `STORAGE_PROVIDER` | `local` | `local` or `s3` |
| `STORAGE_MAX_FILE_SIZE_MB` | `20` | Upload size limit |
| `STORAGE_LOCAL_UPLOAD_DIR` | `./uploads` | Local file directory |
| `STORAGE_LOCAL_BASE_URL` | `http://localhost:8080/uploads` | Public local file base URL |
| `AWS_S3_BUCKET` | empty | S3 bucket when `STORAGE_PROVIDER=s3` |
| `AWS_REGION` | empty | S3 region |
| `AWS_ACCESS_KEY` | empty | S3 access key |
| `AWS_SECRET_KEY` | empty | S3 secret key |
| `SPRING_AI_MCP_ENABLED` | `true` | Enable Spring AI MCP server |
| `SPRING_AI_MCP_SSE_ENDPOINT` | `/api/ai/mcp/sse` | MCP SSE endpoint |
| `SPRING_AI_MCP_SSE_MESSAGE_ENDPOINT` | `/api/ai/mcp/message` | MCP message endpoint |
| `SOCIAL_AI_ENABLED` | `true` | Enable social AI triggers |
| `SOCIAL_AI_MENTION_RATE_LIMIT_PER_HOUR` | `10` | Social AI mention throttle |
| `REEL_MAX_VIDEO_SIZE_MB` | `20` | Reel video validation limit |
| `JAMENDO_CLIENT_ID` | dev value | Music search integration |

For production, prefer the `prod` profile and inject secrets through the environment or secret manager. Do not commit real secrets.

---

## API Surface

All normal API responses use:

```json
{
  "code": 1000,
  "message": null,
  "result": {}
}
```

### Auth and Sessions

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register a user |
| `POST` | `/api/auth/login` | Login and return token pair |
| `POST` | `/api/auth/resend-verification` | Resend email verification |
| `GET` | `/api/auth/verify-email` | Email verification view endpoint |
| `POST` | `/api/auth/forgot-password` | Send password reset flow |
| `POST` | `/api/auth/change-password` | Change password for an authenticated user |
| `POST` | `/api/auth/refresh` | Refresh access token |
| `POST` | `/api/auth/logout` | Logout and blacklist token |
| `POST` | `/api/auth/introspect` | Validate token |
| `POST` | `/api/auth/qr/generate` | Generate QR login token |
| `GET` | `/api/auth/qr/status/{token}` | Check QR login status |
| `POST` | `/api/auth/qr/confirm` | Confirm QR login |
| `GET` | `/api/auth/sessions` | List login sessions |
| `POST` | `/api/auth/sessions/purge` | Purge sessions |
| `DELETE` | `/api/auth/sessions/{sessionId}` | Revoke one session |

### Users, Contacts, Follows, Settings

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/users/me` | Current user profile |
| `GET` | `/api/users` | List users |
| `GET` | `/api/users/search` | Search users |
| `GET` | `/api/users/{id}` | Get user |
| `GET` | `/api/users/{id}/stats` | Social stats |
| `PUT` | `/api/users/{id}` | Update user |
| `DELETE` | `/api/users/{id}` | Delete user |
| `POST` | `/api/users/device-token` | Register device token |
| `DELETE` | `/api/users/device-token` | Remove device token |
| `GET` | `/api/users/me/settings` | Get settings |
| `PUT` | `/api/users/me/settings` | Replace settings |
| `PATCH` | `/api/users/me/settings/{section}` | Update `privacy`, `notifications`, or `messages` section |
| `POST` | `/api/contacts` | Send contact request |
| `PUT` | `/api/contacts/{id}/accept` | Accept contact request |
| `PUT` | `/api/contacts/{id}/block` | Block a contact relation |
| `PUT` | `/api/contacts/{id}/unblock` | Unblock a contact relation |
| `GET` | `/api/contacts` | List contacts |
| `GET` | `/api/contacts/suggestions` | Contact suggestions |
| `GET` | `/api/contacts/status/{status}` | List by status |
| `GET` | `/api/contacts/block-status/{userId}` | Check block status |
| `DELETE` | `/api/contacts/{id}` | Delete contact relation |
| `POST` | `/api/follows/{userId}` | Follow user |
| `DELETE` | `/api/follows/{userId}` | Unfollow user |
| `GET` | `/api/users/{userId}/followers` | Followers |
| `GET` | `/api/users/{userId}/following` | Following |

### Conversations, Messages, Groups, Calls

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/conversations` | Create conversation |
| `GET` | `/api/conversations` | List conversations |
| `GET` | `/api/conversations/search` | Search conversations |
| `GET` | `/api/conversations/{id}` | Get conversation |
| `DELETE` | `/api/conversations/{id}` | Delete/archive conversation |
| `DELETE` | `/api/conversations/{id}/dissolve` | Dissolve group conversation |
| `PUT` | `/api/conversations/{id}/pin` | Pin conversation |
| `PUT` | `/api/conversations/{id}/unpin` | Unpin conversation |
| `PUT` | `/api/conversations/{id}/mute` | Mute conversation |
| `PUT` | `/api/conversations/{id}/unmute` | Unmute conversation |
| `POST` | `/api/messages` | Send message |
| `POST` | `/api/messages/forward` | Forward message |
| `GET` | `/api/messages/conversation/{conversationId}` | List messages |
| `GET` | `/api/messages/conversation/{conversationId}/search` | Search messages |
| `PUT` | `/api/messages/{messageId}/seen` | Mark seen |
| `PUT` | `/api/messages/{messageId}/recall` | Recall message |
| `PUT` | `/api/messages/{messageId}/edit` | Edit message |
| `DELETE` | `/api/messages/{messageId}` | Delete message |
| `PUT` | `/api/messages/{messageId}/react` | React to message |
| `PUT` | `/api/messages/{messageId}/vote` | Vote in poll message |
| `PUT` | `/api/messages/{messageId}/close-poll` | Close poll |
| `PUT` | `/api/messages/{messageId}/pin` | Pin message |
| `GET` | `/api/messages/conversation/{conversationId}/pinned` | List pinned messages |
| `PUT` | `/api/messages/{messageId}/priority` | Update priority tag |
| `POST` | `/api/groups/{conversationId}/members` | Add group member |
| `DELETE` | `/api/groups/{conversationId}/members/{userId}` | Remove group member |
| `PUT` | `/api/groups/{conversationId}/members/{userId}/role` | Update group role |
| `PUT` | `/api/groups/{conversationId}` | Update group settings |
| `GET` | `/api/groups/{conversationId}/members` | List group members |
| `POST` | `/api/groups/{conversationId}/invite-link` | Create invite link |
| `POST` | `/api/groups/{conversationId}/invite-link/reset` | Reset invite link |
| `POST` | `/api/groups/join/{inviteToken}` | Join by invite |
| `GET` | `/api/groups/invite/{inviteToken}/info` | Invite metadata |
| `GET` | `/api/groups/{conversationId}/pending` | Pending join requests |
| `POST` | `/api/groups/{conversationId}/pending/{userId}/approve` | Approve join request |
| `DELETE` | `/api/groups/{conversationId}/pending/{userId}` | Reject join request |
| `GET` | `/api/groups/{conversationId}/reminders` | List reminders |
| `POST` | `/api/groups/{conversationId}/reminders` | Create reminder |
| `PATCH` | `/api/groups/reminders/{reminderId}/toggle` | Complete/uncomplete reminder |
| `PUT` | `/api/groups/reminders/{reminderId}` | Update reminder |
| `DELETE` | `/api/groups/reminders/{reminderId}` | Delete reminder |
| `GET` | `/api/groups/{conversationId}/notes` | List group notes |
| `POST` | `/api/groups/{conversationId}/notes` | Create note |
| `PUT` | `/api/groups/notes/{noteId}` | Update note |
| `DELETE` | `/api/groups/notes/{noteId}` | Delete note |
| `GET` | `/api/calls/history` | List call history |
| `GET` | `/api/calls/{callId}` | Get call |

### Social, Stories, Reels, Reports

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/feed/home` | Home feed |
| `GET` | `/api/feed/user/{userId}` | User feed |
| `GET` | `/api/feed/explore` | Explore feed |
| `POST` | `/api/posts` | Create post |
| `GET` | `/api/posts/feed` | Post feed |
| `GET` | `/api/posts/search` | Search posts |
| `GET` | `/api/posts/hashtags/trending` | Trending hashtags |
| `GET` | `/api/posts/saved` | Saved posts |
| `GET` | `/api/posts/users/{authorId}` | Posts by author |
| `GET` | `/api/posts/{postId}` | Get post |
| `PATCH` | `/api/posts/{postId}` | Update post |
| `DELETE` | `/api/posts/{postId}` | Delete post |
| `PUT` | `/api/posts/{postId}/save` | Save post |
| `DELETE` | `/api/posts/{postId}/save` | Unsave post |
| `POST` | `/api/posts/{postId}/share` | Increment share count |
| `GET` | `/api/posts/{postId}/comments` | List comments |
| `POST` | `/api/posts/{postId}/comments` | Create comment |
| `PATCH` | `/api/posts/{postId}/comments/{commentId}` | Update comment |
| `DELETE` | `/api/posts/{postId}/comments/{commentId}` | Delete comment |
| `PUT` | `/api/posts/{postId}/reactions` | React to post |
| `DELETE` | `/api/posts/{postId}/reactions` | Remove post reaction |
| `PUT` | `/api/posts/{postId}/comments/{commentId}/reactions` | React to comment |
| `DELETE` | `/api/posts/{postId}/comments/{commentId}/reactions` | Remove comment reaction |
| `POST` | `/api/stories` | Create story |
| `GET` | `/api/stories/feed` | Story feed |
| `GET` | `/api/stories/me` | Current user's stories |
| `GET` | `/api/stories/users/{userId}` | User stories |
| `POST` | `/api/stories/{storyId}/view` | Mark story viewed |
| `GET` | `/api/stories/{storyId}/viewers` | Story viewers |
| `DELETE` | `/api/stories/{storyId}` | Delete story |
| `POST` | `/api/stories/{storyId}/react` | React to story |
| `DELETE` | `/api/stories/{storyId}/react` | Remove story reaction |
| `GET` | `/api/stories/{storyId}/reactions` | Story reactions |
| `POST` | `/api/stories/{storyId}/reply` | Reply to story |
| `GET` | `/api/stories/{storyId}/replies` | Story replies |
| `POST` | `/api/reels` | Create reel |
| `GET` | `/api/reels/feed` | Reel feed |
| `GET` | `/api/reels/users/{authorId}` | Reels by author |
| `GET` | `/api/reels/{reelId}` | Get reel |
| `POST` | `/api/reels/{reelId}/view` | Mark reel viewed |
| `PUT` | `/api/reels/{reelId}/reactions` | React to reel |
| `DELETE` | `/api/reels/{reelId}/reactions` | Remove reel reaction |
| `POST` | `/api/reels/{reelId}/share` | Increment reel share count |
| `GET` | `/api/reels/{reelId}/comments` | List reel comments |
| `POST` | `/api/reels/{reelId}/comments` | Create reel comment |
| `POST` | `/api/reports` | Report post/content |
| `GET` | `/api/reports` | List post reports |
| `PUT` | `/api/reports/{id}/status` | Update report status |
| `POST` | `/api/reports/users` | Report user |
| `GET` | `/api/reports/users` | List user reports |
| `PUT` | `/api/reports/users/{id}/status` | Update user report status |

### Files, Music, Notifications, Admin

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/files/upload` | Upload file to local storage or S3 |
| `DELETE` | `/api/files/{fileId}` | Delete uploaded file |
| `GET` | `/api/files/conversation/{conversationId}` | List conversation files |
| `GET` | `/api/files/my` | List current user's files |
| `GET` | `/api/files/{fileId}/download` | Download file |
| `GET` | `/api/music/search` | Search Jamendo music |
| `GET` | `/api/notifications` | List notifications |
| `GET` | `/api/notifications/unread-count` | Unread count |
| `PUT` | `/api/notifications/{notificationId}/read` | Mark read |
| `PUT` | `/api/notifications/read-all` | Mark all read |
| `GET` | `/api/admin/**` | Admin stats, users, posts, conversations, messages, notifications, audit logs, settings |

### AI Proxy Endpoints

These endpoints are JWT-protected for clients. Backend forwards to `chatly-agent` with `X-API-Key` and `X-User-Id`.

| Method | Endpoint | Agent target |
|---|---|---|
| `POST` | `/api/ai/sessions` | `POST /sessions` |
| `GET` | `/api/ai/sessions` | `GET /sessions` |
| `GET` | `/api/ai/sessions/{sessionId}` | `GET /sessions/{sessionId}` |
| `PATCH` | `/api/ai/sessions/{sessionId}` | `PATCH /sessions/{sessionId}` |
| `DELETE` | `/api/ai/sessions/{sessionId}` | `DELETE /sessions/{sessionId}` |
| `GET` | `/api/ai/sessions/{sessionId}/messages` | `GET /sessions/{sessionId}/messages` |
| `POST` | `/api/ai/sessions/{sessionId}/chat` | `POST /sessions/{sessionId}/chat` |
| `POST` | `/api/ai/sessions/{sessionId}/chat/stream` | `POST /sessions/{sessionId}/chat/stream` |
| `POST` | `/api/ai/sessions/{sessionId}/files` | `POST /sessions/{sessionId}/files` |
| `GET` | `/api/ai/sessions/{sessionId}/files` | `GET /sessions/{sessionId}/files` |
| `GET` | `/api/ai/sessions/{sessionId}/files/{fileId}/content` | `GET /sessions/{sessionId}/files/{fileId}/content` |
| `DELETE` | `/api/ai/sessions/{sessionId}/files/{fileId}` | `DELETE /sessions/{sessionId}/files/{fileId}` |
| `POST` | `/api/ai/mcp/servers` | `POST /mcp/servers` |
| `GET` | `/api/ai/mcp/servers` | `GET /mcp/servers` |
| `GET` | `/api/ai/mcp/servers/{serverId}` | `GET /mcp/servers/{serverId}` |
| `PATCH` | `/api/ai/mcp/servers/{serverId}/toggle` | `PATCH /mcp/servers/{serverId}/toggle` |
| `DELETE` | `/api/ai/mcp/servers/{serverId}` | `DELETE /mcp/servers/{serverId}` |
| `GET` | `/api/ai/mcp/servers/{serverId}/tools` | `GET /mcp/servers/{serverId}/tools` |
| `POST` | `/api/ai/social/start-from-post` | Creates/reuses an agent session bound to a social post |

---

## WebSocket Channels

Clients connect with JWT during the WebSocket handshake.

| Endpoint | Purpose |
|---|---|
| `/ws` | SockJS STOMP endpoint |
| `/ws-raw` | Raw WebSocket endpoint for mobile/testing |

Application destinations:

| Destination | Direction | Description |
|---|---|---|
| `/app/chat.send` | client to server | Send message |
| `/app/chat.seen` | client to server | Mark message seen |
| `/app/chat.typing` | client to server | Send typing status |
| `/app/call.initiate` | client to server | Start one-to-one call |
| `/app/call.answer` | client to server | Accept/reject call |
| `/app/call.ice-candidate` | client to server | Relay ICE candidate |
| `/app/call.renegotiate` | client to server | Relay renegotiation |
| `/app/call.end` | client to server | End call |
| `/app/call.group.initiate` | client to server | Start group call |
| `/app/call.group.join` | client to server | Join group call |
| `/app/call.group.signal` | client to server | Relay group call signal |

Broker destinations:

| Destination | Description |
|---|---|
| `/topic/conversation/{conversationId}` | Conversation messages/events |
| `/topic/presence` | Presence events |
| `/topic/feed/{userId}` | Feed updates |
| `/user/queue/errors` | User-specific errors |
| `/user/queue/calls` | User-specific call signaling |
| `/queue/errors` | Private STOMP errors |

---

## AI and Agent Integration

There are two separate AI integration paths:

1. **Client-facing proxy endpoints** under `/api/ai/**`.
   Backend authenticates the JWT user, forwards requests to `chatly-agent`, and adds:
   - `X-API-Key: ${agent.api-key}`
   - `X-User-Id: <authenticated user id>`

2. **Backend MCP protocol endpoints** used by `chatly-agent`.
   Spring AI exposes:
   - `GET /api/ai/mcp/sse`
   - `POST /api/ai/mcp/message`

   These endpoints require:
   - `X-Internal-API-Key: ${app.mcp.internal-api-key}`
   - `X-User-Id: <user id>`

Backend also triggers asynchronous agent workflows:

| Trigger | Agent endpoint | Source |
|---|---|---|
| Group `@AI` mention | `/internal/assist` | `AgentProxyClient.triggerAssistAsync` |
| Daily briefing | `/internal/briefing` | `DailyBriefingScheduler` |
| Conversation file indexing | `/internal/index-file` | `FileUploadService` for indexable files |
| Social mention in comment | `/internal/social/mention-comment` | Social post/comment workflow |
| Social post command | `/internal/social/post-command` | Social post workflow |

Detailed MCP documentation is in [docs/mcp-server.md](docs/mcp-server.md).

---

## Storage and Databases

### PostgreSQL

Used for relational identity and relationship data:

- `User`
- `Contact`
- `Follow`
- `GroupMember`
- `UserLoginSession`
- `EmailVerificationOtp`
- `QrLoginToken`

### MongoDB

Used for high-volume or document-shaped data:

- Conversations, messages, reactions, read receipts, polls, call sessions
- Notifications
- File metadata
- Group reminders and notes
- Posts, comments, saved posts, reports
- Stories, story reactions, story replies
- Reels
- User settings and admin audit/settings documents

### Redis

Used for token blacklist and runtime cache/presence data. Redis keys must have TTLs.

### File Storage

`FileUploadService` validates MIME type and size, stores the file through `StorageProvider`, saves `FileMetadata` in MongoDB, and triggers agent indexing for indexable conversation documents.

Supported storage providers:

- `LocalStorageProvider` when `storage.provider=local`
- `S3StorageProvider` when `storage.provider=s3`

Indexable MIME types for agent RAG:

- `application/pdf`
- Microsoft Word and Excel MIME types
- `text/plain`

---

## Schedulers

| Scheduler | Frequency | Behavior |
|---|---|---|
| `ReminderScheduler.checkDueReminders` | every 30 seconds | Sends a system message for due group reminders and marks them notified |
| `ReminderScheduler.cleanupExpiredReminders` | hourly | Deletes completed reminders that have passed |
| `DailyBriefingScheduler.triggerDailyBriefings` | 07:00 Asia/Ho_Chi_Minh daily | Triggers `chatly-agent` daily briefing for users active in the last 7 days |

---

## Development Commands

```bash
./mvnw spring-boot:run
./mvnw test
./mvnw verify
./mvnw clean package
./mvnw test -Dtest=UserServiceTest
```

Build a container:

```bash
docker build -t chatly-backend:local .
```

---

## Troubleshooting

### PostgreSQL Connection Refused

```bash
docker compose ps
docker compose logs postgres
```

Confirm `SPRING_DATASOURCE_URL` points at `localhost:5432` for local runs.

### Redis Authentication Errors

The Compose Redis service does not define a password, while dev config defaults `REDIS_PASSWORD=admin`. Set an empty password locally if your Redis instance does not require one:

```bash
REDIS_PASSWORD= ./mvnw spring-boot:run
```

### Agent Proxy Returns 502 or Stream Error Events

Check:

- `chatly-agent` is running at `AGENT_BASE_URL`.
- `AGENT_API_KEY` in backend matches `INTERNAL_API_KEY` in agent.
- Backend sends `X-User-Id`, which `AgentProxyClient` does automatically for authenticated proxy calls.

### MCP Connection Fails From Agent

Check:

- `SPRING_AI_MCP_ENABLED=true`
- `CHATLY_BACKEND_MCP_URL` in `chatly-agent` points to backend `/api/ai/mcp/sse`
- `APP_MCP_INTERNAL_API_KEY` in backend matches `INTERNAL_API_KEY` or the configured agent MCP key
- Agent includes `X-User-Id`; backend rejects MCP protocol requests without it
