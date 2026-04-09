# PROMPT.md — Chatly: Backend ↔ Agent Integration Guide

> **Mục tiêu:** Biến `chatly-agent` (FastAPI) từ standalone backend thành internal AI service,
> xác thực qua API Key thay vì JWT, nhận user context từ `chatly-backend` (Spring Boot) qua headers.
>
> **Thứ tự ưu tiên:** Agent trước → Backend sau.
> **Không thay đổi:** AI logic, LangGraph graphs, RAG pipeline, MCP integration, SSE streaming.

---

## Context

| Service | Stack | Role sau khi tích hợp |
|---|---|---|
| `chatly-agent` | FastAPI + LangGraph + MongoDB | Internal AI service — chỉ nhận request từ backend |
| `chatly-backend` | Spring Boot (đã có sẵn) | Gateway duy nhất — auth user, forward xuống agent |

**Luồng sau khi tích hợp:**

```
Frontend/Mobile
    │  JWT (Bearer token)
    ▼
chatly-backend (Spring Boot)
    ├─ Verify JWT
    ├─ Business logic (rate limit, session ownership)
    │
    │  X-API-Key: <internal_key>
    │  X-User-Id: <user_id>
    │  X-User-Role: <role>
    ▼
chatly-agent (FastAPI)  ← không expose ra ngoài
    └─ AI / RAG / Tool logic
```

---

## Env & Config mới

### chatly-agent — thêm vào `.env`

```bash
# Xóa các biến JWT cũ
# JWT_SECRET_KEY=...        ← XÓA
# JWT_ALGORITHM=...         ← XÓA
# ACCESS_TOKEN_EXPIRE_MINUTES=... ← XÓA

# Thêm mới
INTERNAL_API_KEY=change-me-use-a-long-random-string-min-32-chars

# Giữ nguyên tất cả biến còn lại (GROQ, MongoDB, Qdrant, MinIO, HuggingFace, Tavily)
```

### chatly-backend — thêm vào `application.yml` / `application.properties`

```yaml
agent:
  base-url: http://chatly-agent:8000   # internal Docker service name
  api-key: ${AGENT_API_KEY}            # phải khớp với INTERNAL_API_KEY bên agent
  timeout-seconds: 60                  # LLM call có thể chậm
  stream-timeout-seconds: 120          # SSE stream timeout
```

```bash
# .env hoặc secret manager
AGENT_API_KEY=change-me-use-a-long-random-string-min-32-chars
```

### docker-compose — network isolation

```yaml
# chatly-agent KHÔNG có ports mapping ra host
services:
  chatly-agent:
    networks:
      - internal          # chỉ backend mới gọi được
    # KHÔNG thêm ports: - "8000:8000"

  chatly-backend:
    networks:
      - internal          # gọi được agent
      - public            # expose ra ngoài
    ports:
      - "8080:8080"

networks:
  internal:
    driver: bridge
  public:
    driver: bridge
```

---

## Phase 1 — Agent: Thay auth layer

> Không động vào AI logic. Chỉ sửa boundary layer.

### 1.1 — Xóa dependencies JWT

**File:** `pyproject.toml`

Xóa khỏi dependencies:
- `python-jose[cryptography]`
- `passlib[bcrypt]`
- `bcrypt<4`  ← pin version chỉ dùng cho passlib, xóa luôn

Chạy sau khi xóa:
```bash
uv sync
```

### 1.2 — Rút gọn `app/config.py`

Xóa các field sau trong class `Settings` (tên field lowercase theo chuẩn Pydantic):
```python
# XÓA
jwt_secret_key: str = "change-me"
jwt_algorithm: str = "HS256"
access_token_expire_minutes: int = 60
cors_origins: list[str] = ["http://localhost:3000"]   # không còn browser CORS
```

Thêm field mới và `get_settings` factory (cần thiết cho FastAPI DI):
```python
# THÊM vào class Settings
internal_api_key: str  # required, không có default

# THÊM sau dòng settings = Settings()
def get_settings() -> Settings:
    """FastAPI dependency — trả về singleton settings."""
    return settings
```

### 1.3 — Viết lại `app/utils/security.py`

Thay toàn bộ nội dung file bằng:

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader

from app.config import settings

_API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=True)


async def verify_api_key(
    api_key: str = Depends(_API_KEY_HEADER),
) -> None:
    """Xác thực request đến từ chatly-backend."""
    if api_key != settings.internal_api_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or missing API key",
        )
```

> **Lưu ý:** Dùng `settings` singleton trực tiếp thay vì `Depends(get_settings)` để đơn giản hơn.
> `settings.internal_api_key` — lowercase theo Pydantic convention.

### 1.4 — Thêm `app/models/context.py`

Tạo file mới:

```python
from pydantic import BaseModel


class RequestContext(BaseModel):
    """User context được inject từ X-User-* headers của chatly-backend."""
    user_id: str
    user_role: str = "user"
```

### 1.5 — Viết lại `app/dependencies.py`

**Xóa** các functions liên quan đến auth (sẽ gây `ImportError` khi các file bị xóa ở bước 1.6):
```python
# XÓA khỏi dependencies.py
get_user_repository()
get_auth_service()
```

**Thêm** `get_request_context` vào cuối file:

```python
from fastapi import Depends, Header
from app.utils.security import verify_api_key
from app.models.context import RequestContext


async def get_request_context(
    _: None = Depends(verify_api_key),
    x_user_id: str = Header(..., alias="X-User-Id"),
    x_user_role: str = Header("user", alias="X-User-Role"),
) -> RequestContext:
    """
    Dependency chính cho mọi protected endpoint.
    Thay thế hoàn toàn get_current_user() cũ.
    """
    return RequestContext(user_id=x_user_id, user_role=x_user_role)
```

> **Lưu ý cho Copilot:** Tìm tất cả chỗ import `get_current_user` trong `routers/` và thay bằng
> `get_request_context`. Type hint `current_user: dict` → `ctx: RequestContext`.

### 1.6 — Xóa auth router và user router

**Xóa file:** `app/routers/auth.py`

**Xóa file:** `app/routers/users.py` ← quản lý user là trách nhiệm của backend, agent không cần

**Xóa file:** `app/middleware/auth.py` ← chứa `get_current_user` (JWT-based), không còn dùng

**Xóa file:** `app/services/auth_service.py`

**Xóa file:** `app/repositories/user_repo.py`

**Sửa `app/main.py`** — xóa các dòng:
```python
# XÓA
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
...
app.include_router(auth_router)
app.include_router(users_router)
```

### 1.7 — Sửa CORS trong `app/main.py`

Agent không expose ra browser trực tiếp, nên xóa luôn `CORSMiddleware` để gọn. Chỉ giữ lại cho môi trường dev nếu cần test bằng tool:

```python
# Xóa hoàn toàn:
# app.add_middleware(CORSMiddleware, ...)
# Xóa field cors_origins khỏi config.py (đã xử lý ở bước 1.2)

# Nếu muốn giữ CORS cho dev/testing local, thêm condition:
if settings.app_env == "development":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
```

> Trong production, agent nằm trong Docker internal network, không có browser nào gọi trực tiếp.

### 1.8 — Xóa SlowAPI rate limiting

**Xóa** import và config SlowAPI trong `app/main.py` và bất kỳ file nào dùng `@limiter.limit(...)`.

Xóa khỏi `pyproject.toml`:
- `slowapi`

---

## Phase 2 — Agent: Cập nhật routers dùng context mới

> Thay thế toàn bộ tham số `current_user` sang `ctx: RequestContext` trong các router.

### 2.1 — `app/routers/chat.py`

```python
# Trước
@router.post("/{session_id}/chat")
async def chat(
    session_id: str,
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    return await chat_service.send(session_id, body, current_user.id)

# Sau
@router.post("/{session_id}/chat")
async def chat(
    session_id: str,
    body: ChatRequest,
    ctx: RequestContext = Depends(get_request_context),
):
    return await chat_service.send(session_id, body, ctx.user_id)
```

Áp dụng tương tự cho endpoint `stream`.

### 2.2 — `app/routers/sessions.py`

```python
# Thay current_user.id → ctx.user_id trong tất cả handlers
# CRUD session: create, list, get, delete đều dùng ctx.user_id
```

### 2.3 — `app/routers/files.py`

```python
# Thay current_user.id → ctx.user_id
# Flow vẫn giữ nguyên: nhận multipart từ Spring Boot, lưu MinIO, embed, lưu Qdrant
```

### 2.4 — `app/routers/mcp.py`

```python
# Thay current_user.id → ctx.user_id trong register/list/delete MCP servers
```

---

## Phase 3 — Agent: Tests

### 3.1 — Cập nhật `tests/conftest.py`

Sửa `_set_required_env()`:

```python
# Xóa dòng:
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key")

# Thêm dòng:
os.environ.setdefault("INTERNAL_API_KEY", "test-internal-api-key")
```

Thêm fixture `auth_headers`:

```python
# Trước — tạo JWT token thật
@pytest.fixture
def auth_headers(test_user):
    token = create_access_token({"sub": test_user.id})
    return {"Authorization": f"Bearer {token}"}

# Sau — dùng API Key + user headers
@pytest.fixture
def auth_headers():
    return {
        "X-API-Key": "test-internal-api-key",
        "X-User-Id": "test-user-123",
        "X-User-Role": "user",
    }
```

### 3.2 — Cập nhật `app/config.py` cho test

```python
# Trong Settings, thêm default cho test environment
INTERNAL_API_KEY: str = "test-internal-api-key"  # chỉ dùng trong test
```

Hoặc set trong `tests/conftest.py`:
```python
os.environ["INTERNAL_API_KEY"] = "test-internal-api-key"
```

### 3.3 — Xóa test files không còn liên quan

- `tests/unit/services/test_auth_service.py`
- `tests/integration/test_auth_api.py`

### 3.4 — Chạy test suite

```bash
uv run pytest tests/unit -v
uv run pytest tests/integration -v
```

Tất cả test phải pass trước khi chuyển sang Phase 4.

---

## Phase 4 — Backend: AgentClient

> Spring Boot gọi xuống agent. Tạo client wrapper để các service dùng.

### 4.1 — Thêm dependency `WebClient`

**`pom.xml`** (nếu chưa có):
```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webflux</artifactId>
</dependency>
```

### 4.2 — Tạo `AgentClient.java`

```java
// com/chatly/backend/agent/AgentClient.java
@Component
public class AgentClient {

    private final WebClient webClient;
    private final int timeoutSeconds;
    private final int streamTimeoutSeconds;   // ← phải khai báo field để dùng trong stream()

    public AgentClient(
        @Value("${agent.base-url}") String baseUrl,
        @Value("${agent.api-key}") String apiKey,
        @Value("${agent.timeout-seconds:60}") int timeoutSeconds,
        @Value("${agent.stream-timeout-seconds:120}") int streamTimeoutSeconds  // ← inject riêng
    ) {
        this.timeoutSeconds = timeoutSeconds;
        this.streamTimeoutSeconds = streamTimeoutSeconds;
        this.webClient = WebClient.builder()
            .baseUrl(baseUrl)
            .defaultHeader("X-API-Key", apiKey)
            .codecs(c -> c.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
            .build();
    }

    /** Blocking chat — dùng cho non-streaming response */
    public AgentChatResponse chat(AgentChatRequest request, String userId, String userRole) {
        return webClient.post()
            .uri("/sessions/{id}/chat", request.sessionId())
            .header("X-User-Id", userId)
            .header("X-User-Role", userRole)
            .bodyValue(request)
            .retrieve()
            .onStatus(HttpStatusCode::isError, this::handleError)
            .bodyToMono(AgentChatResponse.class)
            .timeout(Duration.ofSeconds(timeoutSeconds))
            .block();
    }

    /** SSE streaming — trả về Flux để pipe thẳng về client */
    public Flux<String> stream(AgentChatRequest request, String userId, String userRole) {
        return webClient.post()
            .uri("/sessions/{id}/chat/stream", request.sessionId())
            .header("X-User-Id", userId)
            .header("X-User-Role", userRole)
            .accept(MediaType.TEXT_EVENT_STREAM)
            .bodyValue(request)
            .retrieve()
            .onStatus(HttpStatusCode::isError, this::handleError)
            .bodyToFlux(String.class)
            .timeout(Duration.ofSeconds(streamTimeoutSeconds));
    }

    /**
     * Multipart file forward — Spring Boot nhận file rồi forward multipart xuống agent.
     * Dùng ByteArrayResource thay vì MultipartInputStreamFileResource
     * (class đó không có sẵn trong Spring standard library).
     */
    public AgentFileResponse uploadFile(
        String sessionId, MultipartFile file, String userId, String userRole
    ) throws IOException {
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        byte[] bytes = file.getBytes();   // đọc vào memory, tránh stream-twice issue
        body.add("file", new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return file.getOriginalFilename();
            }
        });

        return webClient.post()
            .uri("/sessions/{id}/files", sessionId)
            .header("X-User-Id", userId)
            .header("X-User-Role", userRole)
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .bodyValue(body)
            .retrieve()
            .onStatus(HttpStatusCode::isError, this::handleError)
            .bodyToMono(AgentFileResponse.class)
            .block();
    }

    private Mono<? extends Throwable> handleError(ClientResponse response) {
        return response.bodyToMono(String.class)
            .map(body -> new AgentServiceException(response.statusCode(), body));
    }
}
```

### 4.3 — Tạo DTOs

```java
// AgentChatRequest.java
public record AgentChatRequest(
    @JsonProperty("session_id") String sessionId,
    String message,
    @JsonProperty("agent_type") String agentType,      // "chatbot" | "rag" | "tool"
    @JsonProperty("use_web_search") boolean useWebSearch,
    @JsonProperty("mcp_server_ids") List<String> mcpServerIds
) {}

// AgentChatResponse.java
public record AgentChatResponse(
    String message,
    @JsonProperty("agent_type") String agentType,
    @JsonProperty("session_id") String sessionId
) {}

// AgentServiceException.java
public class AgentServiceException extends RuntimeException {
    private final HttpStatusCode statusCode;
    public AgentServiceException(HttpStatusCode statusCode, String body) {
        super("Agent error " + statusCode + ": " + body);
        this.statusCode = statusCode;
    }
}
```

---

## Phase 5 — Backend: Kết nối vào ChatService

### 5.1 — Inject `AgentClient` vào `ChatService`

```java
@Service
public class ChatService {

    private final AgentClient agentClient;
    private final SessionRepository sessionRepo;

    public ChatResponse sendMessage(
        String sessionId, ChatRequest req, UserDetails user
    ) {
        // 1. Verify session ownership — Spring Boot lo, agent không cần check
        Session session = sessionRepo.findByIdAndUserId(sessionId, user.getId())
            .orElseThrow(() -> new SessionNotFoundException(sessionId));

        // 2. Forward xuống agent
        AgentChatRequest agentReq = new AgentChatRequest(
            sessionId,
            req.getMessage(),
            req.getAgentType(),
            req.isUseWebSearch(),
            req.getMcpServerIds()
        );

        AgentChatResponse agentRes = agentClient.chat(agentReq, user.getId(), user.getRole());

        // 3. Return về client
        return ChatResponse.from(agentRes);
    }

    /** SSE streaming — pipe Flux thẳng về controller */
    public Flux<String> streamMessage(
        String sessionId, ChatRequest req, UserDetails user
    ) {
        sessionRepo.findByIdAndUserId(sessionId, user.getId())
            .orElseThrow(() -> new SessionNotFoundException(sessionId));

        AgentChatRequest agentReq = new AgentChatRequest(
            sessionId, req.getMessage(), req.getAgentType(),
            req.isUseWebSearch(), req.getMcpServerIds()
        );

        return agentClient.stream(agentReq, user.getId(), user.getRole());
    }
}
```

### 5.2 — Sửa `ChatController` để expose SSE

```java
@RestController
@RequestMapping("/api/sessions/{sessionId}/chat")
public class ChatController {

    @PostMapping
    public ResponseEntity<ChatResponse> send(
        @PathVariable String sessionId,
        @RequestBody ChatRequest req,
        @AuthenticationPrincipal UserDetails user
    ) {
        return ResponseEntity.ok(chatService.sendMessage(sessionId, req, user));
    }

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> stream(
        @PathVariable String sessionId,
        @RequestBody ChatRequest req,
        @AuthenticationPrincipal UserDetails user
    ) {
        return chatService.streamMessage(sessionId, req, user)
            .map(token -> ServerSentEvent.builder(token).build());
    }
}
```

### 5.3 — Xử lý lỗi từ agent

Thêm `@ExceptionHandler` trong `GlobalExceptionHandler`:

```java
@ExceptionHandler(AgentServiceException.class)
public ResponseEntity<ErrorResponse> handleAgentError(AgentServiceException ex) {
    // Agent 403 → backend trả 500 (không lộ internal detail ra client)
    // Agent 422 → backend trả 400
    // Agent 5xx → backend trả 502 Bad Gateway
    HttpStatus status = ex.getStatusCode().is4xxClientError()
        ? HttpStatus.BAD_REQUEST
        : HttpStatus.BAD_GATEWAY;
    return ResponseEntity.status(status)
        .body(new ErrorResponse("AI service error", ex.getMessage()));
}
```

---

## Phase 6 — Integration test & Smoke test

### 6.1 — Smoke test thủ công (curl)

```bash
# 1. Login lấy JWT từ backend
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@chatly.com","password":"password"}' \
  | jq -r '.accessToken')

# 2. Tạo session
SESSION_ID=$(curl -s -X POST http://localhost:8080/api/sessions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test session"}' \
  | jq -r '.id')

# 3. Gửi chat message
curl -X POST http://localhost:8080/api/sessions/$SESSION_ID/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","agentType":"chatbot","useWebSearch":false,"mcpServerIds":[]}'

# 4. Test SSE stream
curl -N http://localhost:8080/api/sessions/$SESSION_ID/chat/stream \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Tell me a joke","agentType":"chatbot"}'

# 5. Verify agent KHÔNG thể gọi trực tiếp từ ngoài
curl http://localhost:8000/health/  # phải timeout hoặc connection refused
```

### 6.2 — Checklist trước khi merge

- [ ] `uv run pytest tests/ -v` — tất cả pass
- [ ] Agent không còn `/auth/register`, `/auth/login` endpoints
- [ ] Agent trả `403` khi gọi không có `X-API-Key`
- [ ] Agent trả `422` khi gọi có API Key nhưng thiếu `X-User-Id`
- [ ] Backend forward chat thành công, nhận response từ agent
- [ ] SSE stream hoạt động end-to-end qua backend
- [ ] File upload forward multipart thành công
- [ ] Agent port không expose ra ngoài Docker network
- [ ] Không có `JWT_SECRET_KEY` nào còn trong agent config

---

## Tóm tắt thay đổi file

### chatly-agent

| File | Hành động |
|---|---|
| `app/routers/auth.py` | **Xóa** |
| `app/routers/users.py` | **Xóa** ← bổ sung |
| `app/middleware/auth.py` | **Xóa** ← bổ sung |
| `app/services/auth_service.py` | **Xóa** |
| `app/repositories/user_repo.py` | **Xóa** |
| `app/utils/security.py` | **Viết lại** — chỉ còn `verify_api_key()` |
| `app/dependencies.py` | **Sửa** — xóa `get_auth_service`, `get_user_repository`; thêm `get_request_context` |
| `app/models/context.py` | **Tạo mới** — `RequestContext` |
| `app/config.py` | **Sửa** — xóa JWT fields + `cors_origins`, thêm `internal_api_key` + `get_settings()` |
| `app/main.py` | **Sửa** — xóa auth/users routers, SlowAPI, sửa CORS |
| `app/routers/chat.py` | **Sửa** — dùng `ctx: RequestContext` |
| `app/routers/sessions.py` | **Sửa** — dùng `ctx.user_id` |
| `app/routers/files.py` | **Sửa** — dùng `ctx.user_id` |
| `app/routers/mcp.py` | **Sửa** — dùng `ctx.user_id` |
| `tests/conftest.py` | **Sửa** — xóa `JWT_SECRET_KEY`, thêm `INTERNAL_API_KEY`; fixture dùng API Key headers |
| `.env` / `.env.example` | **Sửa** — xóa JWT vars, thêm `INTERNAL_API_KEY` |
| `pyproject.toml` | **Sửa** — xóa `python-jose`, `passlib`, `bcrypt<4`, `slowapi` |

### chatly-backend

| File | Hành động |
|---|---|
| `agent/AgentClient.java` | **Tạo mới** |
| `agent/AgentChatRequest.java` | **Tạo mới** |
| `agent/AgentChatResponse.java` | **Tạo mới** |
| `agent/AgentServiceException.java` | **Tạo mới** |
| `service/ChatService.java` | **Sửa** — inject `AgentClient` |
| `controller/ChatController.java` | **Sửa** — thêm SSE stream endpoint |
| `exception/GlobalExceptionHandler.java` | **Sửa** — handle `AgentServiceException` |
| `application.yml` | **Sửa** — thêm `agent.*` config block |
| `docker-compose.yml` | **Sửa** — network isolation |
