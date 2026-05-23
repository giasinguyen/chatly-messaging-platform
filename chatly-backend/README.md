# Chatly Backend — Spring Boot 4 / Java 21 API Server

> **The core messaging platform backend.**  
> Handles authentication, real-time messaging via WebSocket, user management, group conversations, and AI agent integration through MCP (Model Context Protocol).

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Database Setup](#database-setup)
4. [Running the Server](#running-the-server)
5. [API Endpoints](#api-endpoints)
6. [WebSocket / Real-Time Channels](#websocket--real-time-channels)
7. [Authentication & Security](#authentication--security)
8. [MCP Server Integration](#mcp-server-integration)
9. [Environment Configuration](#environment-configuration)
10. [Development Workflow](#development-workflow)
11. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- **Java**: OpenJDK 21 or later
- **Maven**: 3.8+ (included via `mvnw`)
- **Docker**: For PostgreSQL, MongoDB, Redis
- **Git**: For version control

### 1. Start Local Infrastructure

```bash
cd chatly-backend
docker-compose up -d
```

This starts:
- **PostgreSQL** (port 5432): User accounts, contacts, groups
- **MongoDB** (port 27017): Messages, conversations, notifications
- **Redis** (port 6379): Caching, presence tracking

**Verify containers are running:**
```bash
docker-compose ps
```

### 2. Create PostgreSQL Database

```bash
docker-compose exec postgres psql -U chatly -c "CREATE DATABASE chatly;"
```

Or via Postman/curl after server starts (API will auto-create schema via JPA).

### 3. Run Backend Server

```bash
# Development mode (auto-reload with live Java compilation)
./mvnw spring-boot:run

# Or with Maven directly
mvn clean spring-boot:run

# On Windows PowerShell
.\mvnw.cmd spring-boot:run
```

**Expected Output:**
```
┌─────────────────────────────────────────────────────────────┐
│ Chatly Backend Application initialized                        │
│ Listening on: http://localhost:8080                          │
│ Swagger UI: http://localhost:8080/swagger-ui.html            │
│ H2 Console: http://localhost:8080/h2-console (if enabled)    │
└─────────────────────────────────────────────────────────────┘
```

### 4. Seed Sample Data

Use the [Postman Collection](docs/Chatly%20API.postman_collection.json):

```bash
# Register a user
POST /api/auth/register
{
  "email": "user@example.com",
  "username": "john_doe",
  "password": "Password123!",
  "fullName": "John Doe"
}

# Login
POST /api/auth/login
{
  "identifier": "user@example.com",
  "password": "Password123!"
}
```

Or run SQL seed directly:

```bash
docker-compose exec postgres psql -U chatly -d chatly -f /docker-entrypoint-initdb.d/seed-data.sql
```

---

## Architecture Overview

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Web Framework** | Spring Boot 4.0.3 | REST API, WebSocket, dependency injection |
| **Language** | Java 21 | Type-safe, compiled, high performance |
| **Primary DB** | PostgreSQL 15 | User accounts, contacts, authentication, relational integrity |
| **Message Store** | MongoDB 7 | Chat messages, conversations, reactions, call history |
| **Cache** | Redis 7 | Session tokens, presence, rate limiting |
| **Async** | Spring WebFlux | Non-blocking HTTP calls to agent service |
| **Real-Time** | STOMP + SockJS | WebSocket sub-protocol for bidirectional messaging |
| **File Storage** | AWS S3 / Local FS | Avatar, media file hosting |
| **AI Integration** | Spring AI + MCP | Agent toolkit exposure to LLM |
| **Build Tool** | Maven 3 | Dependency management, packaging |

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Web/Mobile)                      │
└────────────────┬──────────────────────────────┬──────────────┘
                 │                              │
          (REST + JWT)                   (STOMP WebSocket)
                 │                              │
         ┌───────▼──────────────────────────────▼───────────────┐
         │         Chatly Backend (Spring Boot 4)               │
         │                                                       │
         │  ┌─────────────────────────────────────────────────┐ │
         │  │         REST Controllers                        │ │
         │  │  (Auth, Users, Messages, Groups, Contacts)    │ │
         │  └────────┬─────────────────────────┬────────────┘ │
         │           │                         │               │
         │     ┌─────▼──────┐          ┌──────▼──────┐        │
         │     │  Services  │          │  WebSocket  │        │
         │     │  (Business │          │  Handlers   │        │
         │     │   Logic)   │          │             │        │
         │     └─────┬──────┘          └──────┬──────┘        │
         │           │                        │                │
         │     ┌─────▼────────────────────────▼──────┐         │
         │     │    MCP Server (AI Tooling)         │         │
         │     │    - User Tools                    │         │
         │     │    - Conversation Tools            │         │
         │     │    - Message Tools                 │         │
         │     │    - Group/Reminder Tools          │         │
         │     └─────┬────────────────────────┬─────┘         │
         │           │                        │                │
         │     ┌─────▼───────┐        ┌──────▼──────┐         │
         │     │ Repositories│        │ Proxy Client│         │
         │     │ (Data Access)        │ (to Agent)  │         │
         │     └─────┬───────┘        └──────┬──────┘         │
         │           │                        │                │
         └───────────┼────────────────────────┼────────────────┘
                     │                        │
         ┌───────────┼────────────────────────┼──────────────────┐
         │           │                        │                  │
    ┌────▼───┐  ┌────▼────┐  ┌─────▼──┐  ┌──▼───────────┐      │
    │PostgreSQL  │ MongoDB  │  │ Redis  │  │ Agent API   │      │
    │ (Users,  │  │Messages, │  │Caching │  │(localhost  │      │
    │ Contacts)  │Reactions)  │(Tokens)│  │:8000)      │      │
    └──────────┘  └──────────┘  └────────┘  └────────────┘      │
    Docker Compose Network                                       │
    └──────────────────────────────────────────────────────────┘
```

---

## Database Setup

### PostgreSQL Schema (JPA/Hibernate)

| Table | Purpose | Key Columns |
|-------|---------|------------|
| `user` | User accounts | id, email, username, password_hash, full_name, avatar_url, created_at |
| `contact` | Friend relationships | id, user_id, contact_id, status, blocked_by, created_at |
| `group_member` | Group membership | id, group_id, user_id, role, joined_at |
| `user_login_session` | Login tracking | id, user_id, device_id, ip_address, platform, expires_at |
| `email_verification_otp` | Email verification tokens | id, user_id, otp_code, expires_at, verified_at |

**Migration Strategy:**
- JPA auto-generates schema on startup (`ddl-auto: update`)
- No Flyway/Liquibase integration yet
- For production, use `ddl-auto: validate` + manual migration scripts

### MongoDB Collections (NoSQL/Transactional)

| Collection | Purpose | Key Fields |
|-----------|---------|-----------|
| `message` | Chat messages | id, conversation_id, sender_id, content, attachments, reactions, created_at, edited_at, recalled_at |
| `conversation` | Chat metadata | id, type (PRIVATE/GROUP), participants, last_message_at, created_at |
| `notification` | In-app notifications | id, user_id, type, content, read_at, created_at |
| `read_receipt` | Delivery status | id, message_id, user_id, read_at |
| `reaction` | Message reactions | id, message_id, user_id, emoji, created_at |
| `attachment` | File metadata | id, message_id, file_url, file_type, size |
| `call_session` | VoIP records | id, participants, start_time, duration, status |
| `poll` | Group polls | id, conversation_id, creator_id, question, options, votes |
| `edit_history` | Message edits | id, message_id, content_before, content_after, edited_at |

### Redis Cache Keys

| Key Pattern | Purpose | TTL |
|------------|---------|-----|
| `user:{userId}:presence` | User online status | ~session duration |
| `user:{userId}:token:*` | JWT token blacklist | Token expiration + 5min |
| `conversation:{convId}:online` | Active users in conversation | ~session |
| `rate_limit:{userId}` | API rate limiting | 60s |

---

## Running the Server

### Local Development

```bash
# Start all services
docker-compose up -d

# Build and run backend
./mvnw clean spring-boot:run

# In another terminal, tail logs
docker-compose logs -f backend
```

### With Environment Variables

```bash
# Create .env file in project root
cat > .env <<EOF
SERVER_PORT=8080
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/chatly
SPRING_DATASOURCE_USERNAME=chatly
SPRING_DATASOURCE_PASSWORD=chatly123
SPRING_DATA_MONGODB_URI=mongodb://localhost:27017/chatly
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=admin
APP_JWT_SECRET=your-base64-encoded-secret
AGENT_API_KEY=your-agent-key
AWS_S3_BUCKET=chatly-dev
AWS_REGION=us-east-1
EOF

./mvnw spring-boot:run
```

### Production Deployment

```bash
# Build JAR
./mvnw clean package -DskipTests

# Run with profile
java -Dspring.profiles.active=prod \
     -DSERVER_PORT=8080 \
     -DSPRING_DATASOURCE_URL=jdbc:postgresql://prod-db:5432/chatly \
     -DAPP_JWT_SECRET=$JWT_SECRET \
     -jar target/chatly-backend-1.0.0.jar
```

### Docker Build

```bash
docker build -t chatly-backend:1.0.0 .
docker run -p 8080:8080 \
           -e SPRING_PROFILES_ACTIVE=prod \
           -e SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/chatly \
           chatly-backend:1.0.0
```

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Authenticate, return JWT + refresh token |
| POST | `/api/auth/logout` | Invalidate JWT token |
| POST | `/api/auth/refresh` | Refresh expired JWT |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/verify-email` | Verify email via OTP |
| POST | `/api/auth/resend-verification` | Resend OTP |
| GET | `/api/auth/introspect` | Check token validity |

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/{id}` | Get user profile |
| PUT | `/api/users/{id}` | Update user profile |
| GET | `/api/users/search` | Search users by username/email |
| GET | `/api/users/suggested` | Get suggested users to add |
| PUT | `/api/users/settings` | Update user settings |
| POST | `/api/users/device-token` | Register push notification token |

### Contacts (Friends)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contacts` | List user contacts |
| POST | `/api/contacts/request` | Send friend request |
| POST | `/api/contacts/{id}/accept` | Accept friend request |
| POST | `/api/contacts/{id}/reject` | Reject friend request |
| POST | `/api/contacts/{id}/block` | Block user |
| DELETE | `/api/contacts/{id}` | Remove contact |

### Conversations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conversations` | List user conversations |
| POST | `/api/conversations` | Create private conversation |
| GET | `/api/conversations/{id}` | Get conversation details |
| PUT | `/api/conversations/{id}` | Update conversation settings |
| DELETE | `/api/conversations/{id}` | Archive conversation |

### Messages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/messages?conversationId={id}&limit=20` | Fetch messages (paginated) |
| POST | `/api/messages` | Send new message |
| PUT | `/api/messages/{id}` | Edit message |
| DELETE | `/api/messages/{id}` | Recall message |
| POST | `/api/messages/{id}/forward` | Forward message to another conversation |
| POST | `/api/messages/{id}/reactions` | Add reaction to message |

### Groups

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/groups` | List user groups |
| POST | `/api/groups` | Create group |
| GET | `/api/groups/{id}` | Get group details |
| PUT | `/api/groups/{id}` | Update group info |
| POST | `/api/groups/{id}/members` | Add members to group |
| DELETE | `/api/groups/{id}/members/{userId}` | Remove member |
| DELETE | `/api/groups/{id}` | Delete group |

### File Upload

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/files/upload` | Upload file to S3/local storage |
| GET | `/api/files/{fileId}` | Get file metadata |
| DELETE | `/api/files/{fileId}` | Delete file |

### Agent Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agent-sessions` | Start new agent conversation |
| GET | `/api/agent-sessions/{id}` | Get session details |
| POST | `/api/agent-sessions/{id}/message` | Send message to agent |

### MCP / AI Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ai/mcp/sse` | Server-Sent Events for MCP (internal) |
| POST | `/api/ai/mcp/message` | MCP message handling (internal) |

### Health & Monitoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check (no auth required) |
| GET | `/actuator` | Spring Actuator endpoint index |
| GET | `/actuator/metrics` | Performance metrics |

---

## WebSocket / Real-Time Channels

### Connection

```javascript
// Client connects via SockJS + STOMP
const socket = new SockJS('http://localhost:8080/ws');
const client = Stomp.over(socket);

client.connect(
  { 'Authorization': `Bearer ${jwtToken}` },
  (frame) => {
    console.log('Connected:', frame);
    // Subscribe to channels...
  },
  (error) => {
    console.error('Connection error:', error);
  }
);
```

### Publishing Channels (Client → Server)

| Channel | Payload | Description |
|---------|---------|-------------|
| `/app/chat.send` | `{ conversationId, content, attachments? }` | Send message |
| `/app/chat.typing` | `{ conversationId, isTyping }` | Broadcast typing status |
| `/app/chat.seen` | `{ messageId }` | Mark message as seen |

### Subscription Channels (Server → Client)

| Channel | Purpose |
|---------|---------|
| `/topic/conversation/{conversationId}` | Receive incoming messages for a conversation |
| `/topic/presence` | Receive online/offline status updates |
| `/queue/errors` | Private error notifications |

### Example WebSocket Flow

```javascript
// Connect
const socket = new SockJS('http://localhost:8080/ws');
const stompClient = Stomp.over(socket);

stompClient.connect(
  { 'Authorization': `Bearer ${token}` },
  (frame) => {
    // Subscribe to conversation messages
    stompClient.subscribe(`/topic/conversation/${conversationId}`, (message) => {
      const msg = JSON.parse(message.body);
      console.log('New message:', msg);
    });

    // Subscribe to presence updates
    stompClient.subscribe('/topic/presence', (message) => {
      const presence = JSON.parse(message.body);
      console.log('User status:', presence);
    });

    // Send a message
    stompClient.send('/app/chat.send', {}, JSON.stringify({
      conversationId,
      content: 'Hello, world!'
    }));

    // Broadcast typing
    stompClient.send('/app/chat.typing', {}, JSON.stringify({
      conversationId,
      isTyping: true
    }));
  }
);
```

---

## Authentication & Security

### JWT Token Structure

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user-id-uuid",
    "email": "user@example.com",
    "username": "john_doe",
    "fullName": "John Doe",
    "iat": 1704067200,
    "exp": 1704153600
  },
  "signature": "..."
}
```

### Token Lifecycle

1. **Login**: User provides credentials → Backend issues JWT (expiry: 1 day) + refresh token
2. **Usage**: Client includes `Authorization: Bearer <JWT>` in every request
3. **Validation**: `JwtAuthenticationFilter` intercepts, validates signature + expiry
4. **Refresh**: Before JWT expires, call `/api/auth/refresh` to get new token
5. **Logout**: Token added to Redis blacklist; can be revoked early

### Security Configuration

**Public Endpoints** (no auth required):
- `/api/auth/**` (register, login, verify)
- `/health`
- `/actuator/**`
- `/api/ai/mcp/**` (validated via API key header)
- `/ws/**` (validated via JWT in WebSocket handshake)

**Protected Endpoints** (require valid JWT):
- All `/api/users/**`, `/api/conversations/**`, `/api/messages/**`, etc.

### CORS Configuration

```yaml
# From application-dev.yml
app:
  cors:
    allowed-origins:
      - "http://localhost:3000"         # Web frontend
      - "http://localhost:5174"          # Vite dev server
      - "http://localhost:8081"          # Mobile web preview
      - "http://192.168.*:*"             # Local mobile/tablet
    allowed-methods: GET, POST, PUT, DELETE, OPTIONS
    allowed-headers: "*"
    allow-credentials: true
    max-age: 3600
```

---

## MCP Server Integration

### Overview

Chatly Backend exposes an **MCP (Model Context Protocol) Server** that provides AI agents with tools to query and manipulate chatly data. This enables the `chatly-agent` to access user information, conversations, and message history in a structured, type-safe manner.

See [MCP.md](MCP.md) for detailed documentation.

### Quick Facts

- **Endpoint**: `/api/ai/mcp/sse` (Server-Sent Events) + `/api/ai/mcp/message`
- **Authentication**: `X-Internal-API-Key` header (required for agent calls)
- **Tools Available**: User, Conversation, Message, Group, Reminder, Poll operations
- **Capabilities**: read-only tools (no direct write operations from agent)

---

## Environment Configuration

### Configuration Files

| File | Purpose | Scope |
|------|---------|-------|
| `application.yml` | Base config, applied first | All profiles |
| `application-dev.yml` | Development overrides | When `spring.profiles.active=dev` |
| `application-prod.yml` | Production overrides | When `spring.profiles.active=prod` |
| `.env` | Local secrets (git-ignored) | Development only |

### Required Environment Variables

```bash
# Server
SERVER_PORT=8080

# PostgreSQL
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/chatly
SPRING_DATASOURCE_USERNAME=chatly
SPRING_DATASOURCE_PASSWORD=chatly123

# MongoDB
SPRING_DATA_MONGODB_URI=mongodb://localhost:27017/chatly

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=admin

# JWT
APP_JWT_SECRET=base64-encoded-secret-key-min-32-chars

# MCP Security
APP_MCP_INTERNAL_API_KEY=your-secret-key-min-32-chars

# Email (Gmail SMTP)
SPRING_MAIL_HOST=smtp.gmail.com
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=your-email@gmail.com
SPRING_MAIL_PASSWORD=your-app-password

# AWS S3 (optional, falls back to local storage)
AWS_S3_BUCKET=chatly-uploads
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1

# Agent Integration
AGENT_BASE_URL=http://localhost:8000
AGENT_API_KEY=your-agent-key
AGENT_TIMEOUT_SECONDS=60

# Reels
REEL_MAX_VIDEO_SIZE_MB=20
REEL_MULTIPART_MAX_FILE_SIZE=20MB
REEL_MULTIPART_MAX_REQUEST_SIZE=25MB

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5174
```

### Production Configuration

For production, use **separate** `application-prod.yml` with NO default values:

```yaml
# application-prod.yml
spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL}        # Must be set
    username: ${SPRING_DATASOURCE_USERNAME}
    password: ${SPRING_DATASOURCE_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate                  # No schema auto-creation
  data:
    mongodb:
      uri: ${SPRING_DATA_MONGODB_URI}
    redis:
      host: ${REDIS_HOST}
      password: ${REDIS_PASSWORD}

app:
  jwt:
    secret: ${APP_JWT_SECRET}            # Must be securely injected
    expiration-ms: 86400000
```

---

## Development Workflow

### Code Structure

```
src/main/java/com/chatly/
├── ChatlyBackendApplication.java
├── ai/mcp/                     # MCP tools & server integration
│   ├── UserTools.java
│   ├── ConversationTools.java
│   ├── MessageTools.java
│   └── ...
├── config/                     # Spring configurations
│   ├── WebMvcConfig.java
│   ├── SecurityConfig.java
│   ├── MongoConfig.java
│   └── WebSocketConfig.java
├── controller/                 # REST endpoints
├── dto/request/                # Request DTOs
├── dto/response/               # Response DTOs (ApiResponse<T>)
├── exception/                  # Error handling, ErrorCode enum
├── mapper/                     # MapStruct entity-to-DTO mapping
├── model/postgres/             # JPA entities
├── model/mongo/                # MongoDB documents
├── proxy/                      # HTTP clients (Agent API)
├── repository/postgres/        # JPA repositories
├── repository/mongo/           # MongoDB repositories
├── security/                   # JWT, Spring Security
├── service/                    # Business logic
├── storage/                    # S3 / Local file handling
├── util/                       # Helper utilities
└── websocket/                  # STOMP configuration & handlers
```

### Coding Standards

Per [root AGENTS.md](../AGENTS.md):

1. **Size Limits**: Service methods ≤ 50 lines, controllers ≤ 50 lines
2. **No Magic Numbers**: Define `static final` constants
3. **No Dead Code**: Use version control, not comments
4. **DTOs Only**: Never expose entities in API responses (use MapStruct)
5. **Error Handling**: All endpoints return `ApiResponse<T>` with error codes
6. **Naming**:
   - Classes: `PascalCase`
   - Methods: `camelCase`
   - Constants: `UPPER_SNAKE_CASE`
   - Files: `PascalCase.java`

### Adding a New Endpoint

**Example: Add `/api/users/{id}/avatar` (upload avatar)**

1. **Create Request DTO** → `src/main/java/com/chatly/dto/request/AvatarUploadRequest.java`
   ```java
   @Data
   public class AvatarUploadRequest {
       @NotNull(message = "File is required")
       private MultipartFile file;
   }
   ```

2. **Add to Service** → `UserService.java`
   ```java
   public void updateUserAvatar(String userId, MultipartFile file) {
       User user = userRepository.findById(userId)
           .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
       String fileUrl = storageProvider.upload(file);
       user.setAvatarUrl(fileUrl);
       userRepository.save(user);
   }
   ```

3. **Add Controller Method** → `UserController.java`
   ```java
   @PostMapping("/{id}/avatar")
   public ApiResponse<UserResponse> uploadAvatar(
       @PathVariable String id,
       @RequestParam MultipartFile file) {
       userService.updateUserAvatar(id, file);
       User user = userService.getUserById(id);
       return ApiResponse.success(userMapper.toResponse(user));
   }
   ```

4. **Test via Curl**
   ```bash
   curl -X POST http://localhost:8080/api/users/user-id/avatar \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -F "file=@avatar.jpg"
   ```

### Running Tests

```bash
# Unit tests
./mvnw test

# Integration tests
./mvnw verify

# Specific test class
./mvnw test -Dtest=UserServiceTest

# With code coverage
./mvnw clean test jacoco:report
# Report: target/site/jacoco/index.html
```

### Building & Packaging

```bash
# Development build (with debug symbols)
./mvnw clean package

# Production build (optimized)
./mvnw clean package -DskipTests -Dspring.profiles.active=prod

# Create fat JAR for Docker
./mvnw clean package spring-boot:repackage
```

---

## Troubleshooting

### Backend fails to start: `Connection refused to PostgreSQL`

**Cause**: Docker containers not running.

```bash
# Verify containers
docker-compose ps

# If containers are down, restart
docker-compose up -d

# Check logs
docker-compose logs postgres
```

### WebSocket connection fails with 401 Unauthorized

**Cause**: JWT token not included or invalid in WebSocket handshake.

**Fix**:
```javascript
const socket = new SockJS('http://localhost:8080/ws');
const stompClient = Stomp.over(socket);

// Include Authorization header
stompClient.connect(
  { 'Authorization': `Bearer ${validJwtToken}` },
  onConnect,
  onError
);
```

### Slow message queries / database timeouts

**Cause**: MongoDB or PostgreSQL connection pool exhausted, or missing indexes.

**Solution**:
1. Check connection pool settings in `MongoConfig.java` / `application.yml`
2. Monitor active connections:
   ```bash
   docker-compose exec postgres psql -U chatly -c "SELECT count(*) FROM pg_stat_activity;"
   ```
3. Add indexes on frequently queried fields (e.g., `conversation_id`, `sender_id`)

### MCP server not responding

**Cause**: Agent API key missing or invalid, or agent service down.

**Debug**:
```bash
# Check MCP endpoint is responding
curl -v http://localhost:8080/api/ai/mcp/sse \
     -H "X-Internal-API-Key: your-api-key"

# Verify agent service is running
curl http://localhost:8000/health

# Check logs
docker-compose logs backend | grep -i mcp
```

### Out of memory in local Docker

**Cause**: Default memory limits too low for all three services.

**Solution**:
```yaml
# docker-compose.yml
services:
  postgres:
    mem_limit: 512m
  mongodb:
    mem_limit: 512m
  redis:
    mem_limit: 256m
  backend:
    mem_limit: 1g
```

Then restart:
```bash
docker-compose down && docker-compose up -d
```

---

## Performance Tuning

### Caching Strategy

**Use Redis for:**
- User presence (online/offline status)
- JWT token blacklist (revoked tokens)
- Conversation participant counts
- Rate limit counters

**Example:**
```java
@Cacheable(value = "users", key = "#id")
public User getUserById(String id) {
    return userRepository.findById(id)
        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_FOUND));
}

@CacheEvict(value = "users", key = "#user.id")
public void updateUser(User user) {
    userRepository.save(user);
}
```

### Database Indexing

**PostgreSQL indexes to add:**
```sql
CREATE INDEX idx_user_email ON "user"(email);
CREATE INDEX idx_contact_user_id ON contact(user_id);
CREATE INDEX idx_group_member_group_id ON group_member(group_id);
```

**MongoDB indexes to add:**
```javascript
db.message.createIndex({ "conversationId": 1, "createdAt": -1 });
db.message.createIndex({ "senderId": 1 });
db.conversation.createIndex({ "participants": 1 });
```

### Connection Pool Tuning

```yaml
# application.yml
spring:
  jpa:
    properties:
      hibernate:
        jdbc:
          batch_size: 20
          fetch_size: 50
        order_inserts: true
        order_updates: true
  datasource:
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      connection-timeout: 20000
      idle-timeout: 300000
```

---

## Additional Resources

- [API Documentation](docs/api.md) — Detailed endpoint reference
- [Postman Collection](docs/Chatly%20API.postman_collection.json) — Pre-configured API requests
- [MCP Server Guide](MCP.md) — AI agent integration details
- [Root AGENTS.md](../AGENTS.md) — Project-wide conventions
- [Backend AGENTS.md](AGENTS.md) — Backend-specific rules

---

## Support & Issues

- **Bug Reports**: Create issue on GitHub with logs from `docker-compose logs backend`
- **Questions**: Refer to Postman collection examples or check existing integration tests
- **Contribution**: Follow the code standards in [AGENTS.md](AGENTS.md) before submitting PR

---

**Last Updated**: April 2026  
**Status**: Production-Ready
