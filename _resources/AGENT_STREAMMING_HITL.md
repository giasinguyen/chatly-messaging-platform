# Implementation Plan — Agent Streaming & Human-in-the-Loop

**Dự án:** agent-server  
**Mục tiêu:** Bổ sung streaming có thể hiện tool calls / thinking steps, và HITL (Human-in-the-Loop) với interrupt cho UnifiedAgent  
**Stream mode:** `astream_events(version="v2")`  
**Ưu tiên:** Dễ maintain, không làm hỏng tính năng hiện có

---

## Quyết định thiết kế đã thống nhất

| Vấn đề | Quyết định |
|---|---|
| Stream mode | `astream_events(version="v2")` — metadata rõ ràng, dễ maintain |
| Agent interface | `BaseAgent` abstract class — service layer gọi thống nhất, không phân nhánh |
| HITL scope | Chỉ `UnifiedAgent`, `ChatbotAgent` không thay đổi logic HITL |
| Tool classification | `search_documents`, `web_search_tool` (tên thực tế cần verify) → safe; `generate_image`, `generate_sticker`, `mcp_tool` → sensitive |
| Tool reconstruction on resume | Option A — lưu `tool_config` vào `interrupt_states`, server tự reconstruct khi resume |
| Resume code path | Hoàn toàn tách biệt khỏi `stream_chat()`, không inject history |
| Interrupt TTL | 24 giờ trên `interrupt_states` collection (do ta kiểm soát schema) |
| Checkpoint TTL | 7 ngày trên `checkpoints` collection — field cần verify schema thực tế |
| Checkpointer | `AsyncMongoDBSaver` thay thế `MemorySaver` trong `UnifiedAgent` |
| ChatbotAgent MemorySaver bug | Known issue — out of scope, tạo issue riêng |
| Frontend | ReactJS và React Native viết riêng, share qua API contract |

---

## Known Issues (out of scope)

### ISSUE-001 — ChatbotAgent MemorySaver double-history bug

`chatbot_graph.py` compile với `MemorySaver()` và dùng `thread_id`. Đồng thời `ChatbotAgent.ainvoke()` inject đầy đủ history từ DB vào mỗi lần gọi. Kết quả: MemorySaver tích lũy history song song với history đã inject → message doubling sau nhiều turns.

**Tác động hiện tại:** Bug tồn tại trước plan này, không bị làm nặng thêm bởi các thay đổi trong plan.  
**Hướng fix:** Bỏ `thread_id` khỏi ChatbotAgent config (dùng MemorySaver như stateless) hoặc bỏ explicit history inject, để MemorySaver quản lý hoàn toàn.  
**Ưu tiên:** Fix sau khi plan này hoàn thành.

---

## Tổng quan các phase

```
Phase 0 — Chuẩn bị & dependency
Phase 1 — BaseAgent interface + Stream events
Phase 2 — MongoDB Checkpointer
Phase 3 — HITL Interrupt core
Phase 4 — Resume & Status endpoints
Phase 5 — Frontend ReactJS
Phase 6 — Frontend React Native
Phase 7 — Testing & hardening
```

---

## Phase 0 — Chuẩn bị & dependency

**Mục tiêu:** Thêm package, tạo các file skeleton mà chưa đụng vào logic hiện có.

### 0.1 Thêm dependency

```toml
# pyproject.toml
"langgraph-checkpoint-mongodb>=0.1.0"
```

### 0.2 Tạo file mới (chưa wire vào bất kỳ đâu)

```
app/agents/base.py               # BaseAgent abstract class
app/models/stream.py             # StreamEvent + helper functions
app/db/checkpointer.py           # AsyncMongoDBSaver singleton
app/tools/tool_config.py         # SAFE_TOOLS, SENSITIVE_TOOLS, is_sensitive()
app/repositories/interrupt_repository.py
```

### 0.3 `app/agents/base.py` — Abstract interface

Service layer chỉ biết đến `BaseAgent`. Không còn phân nhánh theo agent type trong service.

```python
from abc import ABC, abstractmethod
from typing import AsyncGenerator, Any

class BaseAgent(ABC):

    @abstractmethod
    async def ainvoke(self, input: dict, config: dict) -> ChatOutput:
        """Blocking invocation — dùng cho /chat endpoint."""
        ...

    @abstractmethod
    async def astream_events(
        self, input: dict, config: dict
    ) -> AsyncGenerator[dict[str, Any], None]:
        """
        Stream events theo format astream_events v2.
        UnifiedAgent: wrap graph.astream_events()
        ChatbotAgent: wrap llm.astream() và emit events theo cùng format
        """
        ...
```

### 0.4 `app/models/stream.py` — SSE event types

```
Event types:
  token          — LLM đang sinh text            {content: str}
  tool_start     — agent bắt đầu gọi tool        {tool: str, input: dict}
  tool_end       — tool trả về kết quả           {tool: str, output: str}
  interrupt      — agent pause, chờ user         {type, tool_name, tool_input, message, thread_id}
  error          — lỗi xảy ra                    {message: str}
  done           — stream kết thúc               {agent_type: str, message_id: str}

SSE wire format:
  data: {"type": "<event_type>", "data": {...}}\n\n
```

Helper functions: `token_event()`, `tool_start_event()`, `tool_end_event()`,
`interrupt_event()`, `error_event()`, `done_event()` — mỗi hàm trả về `str` đã format sẵn.

### 0.5 `app/tools/tool_config.py` — Skeleton

```python
# Tên thực tế sẽ được verify ở Phase 3, bước 3.0
SAFE_TOOLS: set[str] = set()       # điền sau khi verify
SENSITIVE_TOOLS: set[str] = set()  # điền sau khi verify

def is_sensitive(tool_name: str) -> bool:
    if tool_name in SENSITIVE_TOOLS:
        return True
    return tool_name not in SAFE_TOOLS
```

### Kiểm tra phase 0

- [ ] `uv sync` không lỗi
- [ ] Import tất cả file mới không lỗi
- [ ] Tất cả test hiện có vẫn pass (chưa thay đổi logic gì)

---

## Phase 1 — BaseAgent interface + Stream events

**Mục tiêu:** Implement `BaseAgent`, đổi stream sang `astream_events`, frontend thấy được token + tool steps. Chưa có HITL.

> ⚠️ **Atomic commit:** Phase 1 là một breaking change SSE format. Tất cả files liệt kê ở mục 1.5 phải được commit cùng lúc. Không deploy một phần.

### 1.1 Implement `ChatbotAgent(BaseAgent)`

`ChatbotAgent` wrap `self._llm.astream()` thành `astream_events()` interface — emit events theo format chuẩn. Không bao giờ emit `tool_start`/`tool_end` (không có tools), chỉ emit `token` và để service emit `done`.

```python
# app/agents/chatbot_agent.py

class ChatbotAgent(BaseAgent):

    async def astream_events(self, input: dict, config: dict):
        # Wrap llm.astream() thành event format chuẩn
        async for chunk in self._graph.astream(
            input, config, stream_mode="messages"
        ):
            message_chunk, metadata = chunk
            if hasattr(message_chunk, "content") and message_chunk.content:
                yield {
                    "event": "on_chat_model_stream",
                    "data": {"chunk": message_chunk},
                    "metadata": metadata,
                }
```

**Lưu ý:** `ainvoke()` giữ nguyên, không thay đổi.

### 1.2 Implement `UnifiedAgent(BaseAgent)`

`UnifiedAgent.astream_events()` delegate trực tiếp sang `self._graph.astream_events()`.

```python
# app/agents/unified_agent.py

class UnifiedAgent(BaseAgent):

    async def astream_events(self, input: dict, config: dict):
        async for event in self._graph.astream_events(
            input, config, version="v2"
        ):
            yield event
```

### 1.3 Cập nhật `ChatService.stream_chat()`

Service layer dùng `agent.astream_events()` — không biết agent type bên trong.

```python
# app/services/chat_service.py

async def stream_chat(self, user_id, session_id, request):
    # ... setup: verify session, load history, select agent (không đổi) ...

    full_content = ""
    config = {"configurable": {"thread_id": session_id}}

    try:
        async for event in agent.astream_events(
            {"messages": [*history, HumanMessage(content=request.message)]},
            config,
        ):
            kind = event["event"]

            if kind == "on_chat_model_stream":
                chunk = event["data"]["chunk"]
                if chunk.content:
                    full_content += chunk.content
                    yield token_event(chunk.content)

            elif kind == "on_tool_start":
                yield tool_start_event(
                    event["name"],
                    event["data"].get("input", {})
                )

            elif kind == "on_tool_end":
                yield tool_end_event(
                    event["name"],
                    str(event["data"].get("output", ""))
                )

    except Exception as e:
        yield error_event(str(e))
        return

    msg = await self._message_repo.create_message(
        session_id=session_id, role="assistant", content=full_content
    )
    agent_type = "unified" if isinstance(agent, UnifiedAgent) else "chatbot"
    yield done_event(agent_type, str(msg.id))
```

### 1.4 Cập nhật router — thêm SSE headers

```python
# app/routers/chat.py

return StreamingResponse(
    chat_service.stream_chat(user_id, session_id, request),
    media_type="text/event-stream",
    headers={
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",    # tắt nginx buffer — quan trọng cho SSE
        "Connection": "keep-alive",
    },
)
```

### 1.5 Files thay đổi đồng thời (atomic commit)

Backend:
- `app/agents/base.py` — implement (Phase 0 tạo skeleton)
- `app/agents/chatbot_agent.py` — implement `BaseAgent`
- `app/agents/unified_agent.py` — implement `BaseAgent`
- `app/services/chat_service.py` — đổi stream loop
- `app/routers/chat.py` — thêm headers
- `app/models/stream.py` — implement (Phase 0 tạo skeleton)

Frontend (phối hợp với team):
- `chatly-frontend`: cập nhật SSE parser theo format mới
- `chatly-mobile`: cập nhật SSE parser theo format mới
- Tests: `tests/` — cập nhật mock SSE format

### 1.6 SSE format migration

**Cũ:**
```
data: {"token": "..."}\n\n
data: {"done": true, "agent_type": "..."}\n\n
```

**Mới:**
```
data: {"type": "token",      "data": {"content": "..."}}\n\n
data: {"type": "tool_start", "data": {"tool": "web_search", "input": {...}}}\n\n
data: {"type": "tool_end",   "data": {"tool": "web_search", "output": "..."}}\n\n
data: {"type": "error",      "data": {"message": "..."}}\n\n
data: {"type": "done",       "data": {"agent_type": "unified", "message_id": "..."}}\n\n
```

### Kiểm tra phase 1

- [ ] Blocking `/chat` vẫn trả về response bình thường (không đổi)
- [ ] SSE `/chat/stream` emit token từng chữ
- [ ] `tool_start` event xuất hiện trước khi tool chạy
- [ ] `tool_end` event xuất hiện sau khi tool xong, có output
- [ ] `done` event luôn là event cuối cùng
- [ ] ChatbotAgent stream chỉ emit `token` + `done`, không có `tool_*`
- [ ] UnifiedAgent stream emit đủ `token` + `tool_start` + `tool_end` + `done`
- [ ] Header `X-Accel-Buffering: no` có trong response
- [ ] Test `test_stream_chat` pass với format mới

---

## Phase 2 — MongoDB Checkpointer

**Mục tiêu:** Thay `MemorySaver` bằng `AsyncMongoDBSaver` trong `UnifiedAgent`. State tồn tại qua restart và disconnect.

### 2.0 Verify checkpoint schema (bắt buộc trước khi tạo index)

Trước khi tạo bất kỳ TTL index nào, chạy đoạn script để inspect schema thực tế:

```python
# scripts/inspect_checkpoint_schema.py
from langgraph.checkpoint.mongodb.aio import AsyncMongoDBSaver
# Tạo 1 checkpoint test, print document structure
# Xác định field nào dùng để tạo TTL index
```

Nếu field timestamp tồn tại (vd: `checkpoint.ts`, `created_at`, `metadata.created_at`):
→ Tạo TTL index trực tiếp trên `checkpoints` collection.

Nếu không có field timestamp phù hợp:
→ TTL chỉ áp dụng trên `interrupt_states` collection (do ta kiểm soát hoàn toàn).
→ Checkpoint cũ sẽ được cleanup bằng cron job hoặc manual purge.

### 2.1 Implement `app/db/checkpointer.py`

```python
# app/db/checkpointer.py

from langgraph.checkpoint.mongodb.aio import AsyncMongoDBSaver
from app.db.mongo import get_mongo_client
from app.config import settings

_checkpointer: AsyncMongoDBSaver | None = None

async def get_checkpointer() -> AsyncMongoDBSaver:
    global _checkpointer
    if _checkpointer is None:
        client = get_mongo_client()
        _checkpointer = AsyncMongoDBSaver(
            client,
            db_name=settings.mongodb_db_name,
        )
        await _checkpointer.setup()
    return _checkpointer
```

### 2.2 Wire vào FastAPI lifespan

```python
# app/main.py

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ... existing startup ...
    checkpointer = await get_checkpointer()
    await checkpointer.setup()    # idempotent — tạo indexes nếu chưa có
    # ... tạo TTL index sau khi verify schema (bước 2.0) ...
    yield
    # ... existing shutdown ...
```

### 2.3 Cập nhật `UnifiedAgent.build()`

```python
# app/agents/unified_agent.py

async def build(self, tools: list, session_id: str) -> "UnifiedAgent":
    checkpointer = await get_checkpointer()
    self._graph = create_react_agent(
        self._llm,
        tools=tools,
        checkpointer=checkpointer,
        # interrupt_before sẽ thêm ở Phase 3
    )
    return self
```

Config pattern — `session_id` là `thread_id`:
```python
config = {"configurable": {"thread_id": session_id}}
```

### 2.4 `ChatbotAgent` — giữ nguyên `MemorySaver`

`ChatbotAgent` không cần persist HITL state → giữ `MemorySaver`.
Bug double-history (ISSUE-001) được ghi nhận riêng, không fix trong scope này.

### Kiểm tra phase 2

- [ ] `UnifiedAgent` trả lời bình thường sau khi đổi checkpointer
- [ ] Restart server → session vẫn nhớ context (checkpoint persisted)
- [ ] Collection `checkpoints` xuất hiện trong MongoDB với đúng schema
- [ ] TTL index được tạo đúng field (hoặc ghi nhận fallback plan nếu field không có)
- [ ] `ChatbotAgent` không bị ảnh hưởng

---

## Phase 3 — HITL Interrupt core

**Mục tiêu:** Implement interrupt mechanism, phân loại tool safe/sensitive, agent pause đúng chỗ.

### 3.0 Verify tên thực tế của các tools (bắt buộc đầu phase)

Chạy đoạn script để print `.name` của tất cả tools trước khi hardcode whitelist:

```python
# scripts/verify_tool_names.py
from app.tools.web_search_tool import create_web_search_tool
from app.tools.retriever_tool import create_retriever_tool
from app.tools.image_gen_tool import create_image_gen_tools
from app.tools.mcp_tool import create_mcp_tool

# Print .name của từng tool instance
# Expected: TavilySearch có thể là "tavily_search_results_json" thay vì "web_search_tool"
```

Sau khi có kết quả thực tế, điền vào `tool_config.py`:

```python
# app/tools/tool_config.py — điền tên chính xác sau khi verify

SAFE_TOOLS: set[str] = {
    "search_documents",
    "<tên thực tế của TavilySearch>",    # verify ở bước 3.0
}

SENSITIVE_TOOLS: set[str] = {
    "generate_image",
    "generate_sticker",    # có side effect tương tự generate_image
    "mcp_tool",            # cover tất cả external MCP tools
    # MCP tool names động (gmail_send, notion_create...) → is_sensitive() fallback
}

def is_sensitive(tool_name: str) -> bool:
    """
    Tool sensitive nếu:
    1. Explicitly trong SENSITIVE_TOOLS, hoặc
    2. Không explicitly trong SAFE_TOOLS (unknown tools = sensitive by default)
    """
    if tool_name in SENSITIVE_TOOLS:
        return True
    return tool_name not in SAFE_TOOLS
```

### 3.1 Cập nhật `UnifiedAgent` — thêm `interrupt_before`

```python
# app/agents/unified_agent.py

self._graph = create_react_agent(
    self._llm,
    tools=tools,
    checkpointer=checkpointer,
    interrupt_before=["tools"],    # pause trước MỌI tools node
)
```

Lý do dùng `interrupt_before=["tools"]` thay vì custom node: đơn giản hơn, dễ maintain. Filter safe/sensitive được xử lý ở service layer (bước 3.2).

### 3.2 Service layer — auto-resume cho safe tools

```python
# app/services/chat_service.py

async def _handle_tools_interrupt(
    self,
    graph,
    config: dict,
    session_id: str,
    user_id: str,
) -> AsyncGenerator[str, None]:
    """
    Gọi sau khi graph pause tại interrupt_before=["tools"].
    - Nếu TẤT CẢ tool calls đều safe → auto-resume, tiếp tục stream
    - Nếu có BẤT KỲ sensitive tool → lưu interrupt state, emit interrupt event, dừng
    """
    state = await graph.aget_state(config)
    last_message = state.values["messages"][-1]
    pending_tool_calls = last_message.tool_calls

    all_safe = all(not is_sensitive(tc["name"]) for tc in pending_tool_calls)

    if all_safe:
        # Auto-resume — user không thấy gì, stream tiếp tục liền mạch
        async for event in graph.astream_events(
            Command(resume=True), config, version="v2"
        ):
            yield event
    else:
        # Sensitive tool — pause, notify frontend
        sensitive_calls = [
            tc for tc in pending_tool_calls if is_sensitive(tc["name"])
        ]
        interrupt_payload = {
            "type": "confirm_tool",
            "tool_name": sensitive_calls[0]["name"],
            "tool_input": sensitive_calls[0]["args"],
            "message": f"Agent muốn chạy `{sensitive_calls[0]['name']}`. Cho phép?",
            "all_pending": [
                {"tool": tc["name"], "input": tc["args"]}
                for tc in sensitive_calls
            ],
            "thread_id": session_id,
        }

        # Lưu vào interrupt_states (bao gồm tool_config để reconstruct khi resume)
        await self._interrupt_repo.create(
            session_id=session_id,
            user_id=user_id,
            interrupt_data=interrupt_payload,
            tool_config=self._extract_tool_config(config),  # Option A
        )

        yield interrupt_event(interrupt_payload)
        # Stream dừng — chờ POST /resume
```

### 3.3 Detect interrupt trong stream loop

```python
# app/services/chat_service.py — trong stream_chat()

# Thêm vào loop astream_events:
elif kind == "on_chain_end":
    output = event["data"].get("output", {})
    if "__interrupt__" in output:
        # Graph đã pause tại interrupt_before=["tools"]
        async for evt in self._handle_tools_interrupt(
            graph, config, session_id, user_id
        ):
            if isinstance(evt, str):
                # Đây là SSE string (interrupt_event) → yield trực tiếp
                yield evt
                return   # dừng stream_chat, chờ resume
            else:
                # Đây là graph event từ auto-resume → process bình thường
                # (token, tool_start, tool_end...)
                # xử lý như event thường trong loop
                ...
```

### 3.4 `InterruptRepository`

```python
# app/repositories/interrupt_repository.py

# Collection: interrupt_states
# Schema:
# {
#   "_id": ObjectId,
#   "session_id": str,          # unique index
#   "user_id": str,
#   "interrupt_data": dict,     # payload gửi cho frontend
#   "tool_config": {            # Option A — để reconstruct agent khi resume
#       "mcp_server_ids": list[str],
#       "use_web_search": bool,
#       "file_ids": list[str],
#   },
#   "status": "pending" | "resolved",
#   "created_at": datetime,     # TTL index 24h
# }

class InterruptRepository:
    async def create(
        self,
        session_id: str,
        user_id: str,
        interrupt_data: dict,
        tool_config: dict,
    ) -> InterruptDoc: ...

    async def get_pending(self, session_id: str) -> InterruptDoc | None: ...

    async def resolve(self, session_id: str) -> None: ...
```

TTL index 24h trên `created_at` — field này do ta kiểm soát, không phụ thuộc LangGraph schema.

### 3.5 `_extract_tool_config()` helper

```python
# app/services/chat_service.py

def _extract_tool_config(self, request: ChatRequest) -> dict:
    """Lưu lại tool config để reconstruct agent khi resume (Option A)."""
    return {
        "mcp_server_ids": request.mcp_server_ids,
        "use_web_search": request.use_web_search,
        "file_ids": request.file_ids,
    }
```

### Kiểm tra phase 3

- [ ] Safe tool (`search_documents`, Tavily) chạy KHÔNG bị interrupt
- [ ] Sensitive tool (`generate_image`) emit `interrupt` event và pause
- [ ] `generate_sticker` emit `interrupt` event và pause
- [ ] `mcp_tool` emit `interrupt` event và pause
- [ ] Auto-resume safe tools không emit `interrupt` event
- [ ] `interrupt_states` collection có document với đúng schema sau khi pause
- [ ] `tool_config` được lưu đúng vào `interrupt_states`
- [ ] TTL index 24h tồn tại trên `interrupt_states.created_at`
- [ ] Script verify tool names đã chạy, `tool_config.py` dùng tên chính xác

---

## Phase 4 — Resume & Status endpoints

**Mục tiêu:** Thêm 2 endpoint để frontend resume sau interrupt và check trạng thái khi reconnect.

### 4.1 Models mới

```python
# app/models/chat.py — bổ sung

class ResumeRequest(BaseModel):
    approved: bool = True
    form_data: dict | None = None

class SessionStatusResponse(BaseModel):
    status: Literal["idle", "interrupted"]
    interrupt_data: dict | None = None
    interrupted_at: datetime | None = None
```

### 4.2 Endpoints mới

```python
# app/routers/chat.py

# Resume sau interrupt — trả về SSE stream tiếp theo
POST /sessions/{session_id}/chat/stream/resume
Headers: X-API-Key, X-User-Id
Body: ResumeRequest
Response: text/event-stream (cùng format với /chat/stream)

# Check trạng thái session — dùng khi reconnect / mount
GET /sessions/{session_id}/chat/status
Headers: X-API-Key, X-User-Id
Response: SessionStatusResponse
```

### 4.3 `ChatService.resume_stream()` — code path độc lập

**Quan trọng:** Method này KHÔNG gọi `_build_messages()`, KHÔNG inject history. Graph đã có đủ state trong checkpoint.

```python
# app/services/chat_service.py

async def resume_stream(
    self,
    user_id: str,
    session_id: str,
    body: ResumeRequest,
) -> AsyncGenerator[str, None]:
    # 1. Verify ownership
    await self._session_service.verify_ownership(user_id, session_id)

    # 2. Lấy interrupt doc để reconstruct tool config (Option A)
    interrupt_doc = await self._interrupt_repo.get_pending(session_id)
    if interrupt_doc is None:
        yield error_event("Không tìm thấy interrupt hoặc đã hết hạn (24h)")
        return

    # 3. Reconstruct agent với đúng tool set từ lần gọi đầu
    tool_config = interrupt_doc.tool_config
    agent = await self._select_agent(
        user_id,
        session_id,
        # Tạo ChatRequest từ saved tool_config
        ChatRequest(
            message="",   # không dùng, chỉ cần tool config
            mcp_server_ids=tool_config["mcp_server_ids"],
            use_web_search=tool_config["use_web_search"],
            file_ids=tool_config["file_ids"],
        ),
    )
    graph = agent._graph   # access internal graph
    config = {"configurable": {"thread_id": session_id}}

    # 4. Resolve interrupt record
    await self._interrupt_repo.resolve(session_id)

    # 5. Resume graph từ checkpoint — KHÔNG inject messages
    resume_value = body.form_data if body.form_data else body.approved
    full_content = ""

    try:
        async for event in graph.astream_events(
            Command(resume=resume_value), config, version="v2"
        ):
            kind = event["event"]

            if kind == "on_chat_model_stream":
                chunk = event["data"]["chunk"]
                if chunk.content:
                    full_content += chunk.content
                    yield token_event(chunk.content)

            elif kind == "on_tool_start":
                yield tool_start_event(
                    event["name"], event["data"].get("input", {})
                )

            elif kind == "on_tool_end":
                yield tool_end_event(
                    event["name"], str(event["data"].get("output", ""))
                )

            elif kind == "on_chain_end":
                output = event["data"].get("output", {})
                if "__interrupt__" in output:
                    # Có thêm interrupt tiếp theo (nhiều sensitive tools)
                    async for evt in self._handle_tools_interrupt(
                        graph, config, session_id, user_id
                    ):
                        yield evt
                    return

    except Exception as e:
        yield error_event(str(e))
        return

    # 6. Persist assistant message
    if full_content:
        msg = await self._message_repo.create_message(
            session_id=session_id, role="assistant", content=full_content
        )
        yield done_event("unified", str(msg.id))

```

### 4.4 `ChatService.get_session_status()`

```python
async def get_session_status(
    self, user_id: str, session_id: str
) -> SessionStatusResponse:
    await self._session_service.verify_ownership(user_id, session_id)

    # Đọc từ interrupt_states — nhanh, không load LangGraph state
    interrupt_doc = await self._interrupt_repo.get_pending(session_id)
    if interrupt_doc:
        return SessionStatusResponse(
            status="interrupted",
            interrupt_data=interrupt_doc.interrupt_data,
            interrupted_at=interrupt_doc.created_at,
        )
    return SessionStatusResponse(status="idle")
```

### 4.5 Guard — không cho gửi message mới khi đang interrupted

```python
# app/services/chat_service.py — đầu stream_chat()

async def stream_chat(self, user_id, session_id, request):
    # Guard: nếu session đang có interrupt pending → từ chối
    existing = await self._interrupt_repo.get_pending(session_id)
    if existing:
        yield error_event(
            "Session đang chờ xác nhận. Vui lòng xác nhận hoặc từ chối trước."
        )
        return
    # ... tiếp tục flow bình thường
```

### Kiểm tra phase 4

- [ ] `GET /status` trả về `idle` khi không có interrupt
- [ ] `GET /status` trả về `interrupted` + đầy đủ `interrupt_data` khi đang pause
- [ ] `POST /resume` với `approved=true` → agent tiếp tục, stream token bình thường
- [ ] `POST /resume` với `approved=false` → agent nhận "đã hủy", trả về response
- [ ] Sau resume xong, `GET /status` trở về `idle`
- [ ] Mất mạng → quay lại → `GET /status` vẫn trả đúng trạng thái
- [ ] Sau 24h → TTL xóa `interrupt_states` → `GET /status` trả về `idle`
- [ ] `POST /resume` khi không có interrupt → trả `error` event rõ ràng
- [ ] `POST /chat/stream` khi đang interrupted → trả `error` event (409-like)
- [ ] Agent được reconstruct đúng tool set khi resume (Option A verified)
- [ ] Không có history double-injection khi resume

---

## Phase 5 — Frontend ReactJS

**Mục tiêu:** Hook và components cho web app — handle stream events, interrupt UI, reconnect.

### 5.1 Types

```typescript
// types/agent.ts

export type StreamEventType =
  | "token" | "tool_start" | "tool_end"
  | "interrupt" | "error" | "done"

export type ToolCallState = {
  tool: string
  input?: Record<string, unknown>
  output?: string
  status: "running" | "done" | "cancelled"
}

export type InterruptData = {
  type: "confirm_tool" | "fill_form"
  tool_name: string
  tool_input: Record<string, unknown>
  message: string
  all_pending: Array<{ tool: string; input: Record<string, unknown> }>
  form_schema?: Record<string, unknown>
  thread_id: string
}

export type StreamState = {
  content: string
  toolCalls: ToolCallState[]
  isStreaming: boolean
  agentType: string | null
  interrupt: InterruptData | null
  error: string | null
}

export type SessionStatusResponse = {
  status: "idle" | "interrupted"
  interrupt_data: InterruptData | null
  interrupted_at: string | null
}
```

### 5.2 `useAgentStream` hook

```typescript
// hooks/useAgentStream.ts

export function useAgentStream(sessionId: string) {
  const [state, setState] = useState<StreamState>(initialState)
  const abortRef = useRef<AbortController | null>(null)

  // Mount: check session status — handle reconnect
  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/chat/status`)
      .then(r => r.json())
      .then((status: SessionStatusResponse) => {
        if (status.status === "interrupted" && status.interrupt_data) {
          setState(s => ({
            ...s,
            interrupt: status.interrupt_data,
            isStreaming: false,
          }))
        }
      })
  }, [sessionId])

  // Parse và dispatch từng SSE event
  const handleEvent = useCallback((event: { type: StreamEventType; data: unknown }) => {
    switch (event.type) {
      case "token":
        setState(s => ({ ...s, content: s.content + (event.data as any).content }))
        break
      case "tool_start":
        setState(s => ({
          ...s,
          toolCalls: [...s.toolCalls, {
            tool: (event.data as any).tool,
            input: (event.data as any).input,
            status: "running",
          }],
        }))
        break
      case "tool_end":
        setState(s => {
          const calls = [...s.toolCalls]
          const idx = calls.findLastIndex(
            c => c.tool === (event.data as any).tool && c.status === "running"
          )
          if (idx !== -1) calls[idx] = {
            ...calls[idx],
            output: (event.data as any).output,
            status: "done",
          }
          return { ...s, toolCalls: calls }
        })
        break
      case "interrupt":
        setState(s => ({ ...s, interrupt: event.data as InterruptData, isStreaming: false }))
        break
      case "error":
        setState(s => ({ ...s, error: (event.data as any).message, isStreaming: false }))
        break
      case "done":
        setState(s => ({
          ...s,
          isStreaming: false,
          agentType: (event.data as any).agent_type,
        }))
        break
    }
  }, [])

  // Đọc SSE stream
  const readStream = useCallback(async (response: Response) => {
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const lines = decoder.decode(value, { stream: true }).split("\n")
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue
        try {
          handleEvent(JSON.parse(line.slice(6)))
        } catch { /* ignore malformed */ }
      }
    }
  }, [handleEvent])

  const sendMessage = useCallback(async (
    message: string,
    options?: { useWebSearch?: boolean; mcpServerIds?: string[]; fileIds?: string[] }
  ) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setState({ content: "", toolCalls: [], isStreaming: true, agentType: null, interrupt: null, error: null })

    const res = await fetch(`/api/sessions/${sessionId}/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        use_web_search: options?.useWebSearch ?? false,
        mcp_server_ids: options?.mcpServerIds ?? [],
        file_ids: options?.fileIds ?? [],
      }),
      signal: abortRef.current.signal,
    })
    await readStream(res)
  }, [sessionId, readStream])

  const resume = useCallback(async (
    approved: boolean,
    formData?: Record<string, unknown>
  ) => {
    setState(s => ({ ...s, interrupt: null, isStreaming: true, content: "", toolCalls: [] }))
    const res = await fetch(`/api/sessions/${sessionId}/chat/stream/resume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved, form_data: formData ?? null }),
    })
    await readStream(res)
  }, [sessionId, readStream])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    setState(s => ({ ...s, isStreaming: false }))
  }, [])

  return { ...state, sendMessage, resume, cancel }
}
```

### 5.3 Components

```
components/
  AgentThinking.tsx       # Danh sách tool calls: spinner khi running, check khi done
  InterruptDialog.tsx     # Confirm dialog cho type="confirm_tool"
  StreamMessage.tsx       # Text stream với blinking cursor
```

**`AgentThinking.tsx`:**
```tsx
const TOOL_LABELS: Record<string, string> = {
  search_documents: "Tìm kiếm tài liệu",
  tavily_search_results_json: "Tìm kiếm web",
  generate_image: "Tạo ảnh",
  generate_sticker: "Tạo sticker",
  mcp_tool: "Gọi MCP tool",
}

export function AgentThinking({ toolCalls }: { toolCalls: ToolCallState[] }) {
  if (toolCalls.length === 0) return null
  return (
    <div className="agent-thinking">
      {toolCalls.map((tc, i) => (
        <div key={i} className="tool-call">
          <span>{TOOL_LABELS[tc.tool] ?? tc.tool}</span>
          {tc.status === "running" && <Spinner size={14} />}
          {tc.status === "done" && <CheckIcon size={14} />}
          {tc.status === "cancelled" && <XIcon size={14} />}
        </div>
      ))}
    </div>
  )
}
```

**`InterruptDialog.tsx`:**
```tsx
export function InterruptDialog({
  data,
  onResume,
}: {
  data: InterruptData
  onResume: (approved: boolean, formData?: Record<string, unknown>) => void
}) {
  return (
    <Dialog open>
      <DialogContent>
        <p>{data.message}</p>
        <pre>{JSON.stringify(data.tool_input, null, 2)}</pre>
        {data.all_pending.length > 1 && (
          <p className="muted">+{data.all_pending.length - 1} tool khác</p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onResume(false)}>Từ chối</Button>
          <Button onClick={() => onResume(true)}>Cho phép</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Kiểm tra phase 5

- [ ] Token stream hiện ra từng chữ, có cursor nhấp nháy
- [ ] Tool đang chạy hiện spinner, xong hiện checkmark
- [ ] Tên tool hiển thị tiếng Việt (theo TOOL_LABELS)
- [ ] Sensitive tool → dialog xuất hiện, blur background
- [ ] Confirm → stream tiếp tục từ chỗ dừng
- [ ] Từ chối → agent báo đã hủy, `done` event
- [ ] Mở tab mới / F5 → dialog tự hiện nếu session đang interrupted
- [ ] Cancel stream (close tab) không crash backend

---

## Phase 6 — Frontend React Native

**Mục tiêu:** Cùng logic với ReactJS nhưng dùng RN components và RN-specific lifecycle.

### 6.1 Network layer — xử lý theo RN version

```typescript
// hooks/useAgentStreamNative.ts

import { AppState, type AppStateStatus } from "react-native"

// RN >= 0.72: fetch + ReadableStream native, cùng pattern với web
// RN < 0.72: dùng react-native-sse package
//   import EventSource from "react-native-sse"

export function useAgentStreamNative(sessionId: string) {
  // Logic giống useAgentStream.ts
  // Khác biệt 1: AppState thay vì visibility event
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        // App foreground lại → check session status
        checkSessionStatus()
      }
    }
    const sub = AppState.addEventListener("change", handleAppStateChange)
    // Check ngay khi mount
    checkSessionStatus()
    return () => sub.remove()
  }, [sessionId])

  // Khác biệt 2: stream reading dùng cùng fetch/getReader API
  // (RN 0.72+ hỗ trợ natively)
  // ...

  return { ...state, sendMessage, resume, cancel }
}
```

### 6.2 RN-specific components

```
components/native/
  AgentThinkingNative.tsx      # Animated API thay CSS animation cho spinner
  InterruptBottomSheet.tsx     # Bottom sheet thay Dialog — UX mobile tốt hơn
  StreamMessageNative.tsx      # RN Text với Animated cursor
```

**`InterruptBottomSheet.tsx`** — dùng `@gorhom/bottom-sheet` hoặc RN Modal:
```tsx
export function InterruptBottomSheet({
  data,
  onResume,
}: {
  data: InterruptData | null
  onResume: (approved: boolean) => void
}) {
  if (!data) return null
  return (
    <BottomSheet snapPoints={["45%"]}>
      <Text style={styles.message}>{data.message}</Text>
      <Text style={styles.code}>
        {JSON.stringify(data.tool_input, null, 2)}
      </Text>
      <View style={styles.row}>
        <Button title="Từ chối" onPress={() => onResume(false)} />
        <Button title="Cho phép" onPress={() => onResume(true)} />
      </View>
    </BottomSheet>
  )
}
```

### Kiểm tra phase 6

- [ ] Stream hoạt động trên iOS simulator và Android emulator
- [ ] Bottom sheet interrupt hiện đúng, dismiss được
- [ ] App về background → foreground → check status và hiện lại interrupt nếu còn
- [ ] Mất mạng → reconnect → tự check status
- [ ] RN < 0.72: verify `react-native-sse` hoạt động đúng

---

## Phase 7 — Testing & hardening

**Mục tiêu:** Coverage đầy đủ cho tính năng mới, không có regression.

### 7.1 Unit tests mới / cập nhật

```
tests/unit/test_chat_service.py
  → Cập nhật mock astream_events (thay astream cũ)
  → test_stream_safe_tools_auto_resume: safe tools không emit interrupt
  → test_stream_sensitive_tool_emits_interrupt: generate_image pause đúng
  → test_resume_approved: agent tiếp tục, stream token
  → test_resume_rejected: agent nhận "đã hủy", trả done
  → test_stream_blocked_when_interrupted: 409-like khi gửi message mới

tests/unit/test_base_agent.py (mới)
  → test_chatbot_agent_implements_interface
  → test_unified_agent_implements_interface
  → test_chatbot_never_emits_tool_events

tests/unit/test_interrupt_repository.py (mới)
  → test_create_and_get_pending
  → test_resolve_clears_pending
  → test_get_pending_returns_none_after_ttl (mock datetime)

tests/unit/test_tool_config.py (mới)
  → test_safe_tools_not_sensitive
  → test_sensitive_tools_are_sensitive
  → test_unknown_tool_is_sensitive (unknown = sensitive by default)
  → test_mcp_dynamic_tool_names_are_sensitive
```

### 7.2 Integration tests mới

```
tests/integration/test_stream_events.py (mới)
  → POST /chat/stream → nhận đủ token + done events (ChatbotAgent)
  → POST /chat/stream → UnifiedAgent với safe tools → token + tool_* + done
  → POST /chat/stream → sensitive tool → interrupt event, stream dừng

tests/integration/test_hitl_flow.py (mới)
  → Full happy path: stream → interrupt → GET status → POST resume → done
  → Reject path: stream → interrupt → POST resume(approved=false) → done
  → Reconnect path: stream → interrupt → [restart server] → GET status → resume
  → TTL path: stream → interrupt → [mock 24h pass] → GET status → idle
  → Double message guard: stream → interrupt → POST /chat/stream → error
```

### 7.3 Regression tests — tính năng cũ phải pass

```
[ ] POST /chat (blocking) — ChatbotAgent và UnifiedAgent
[ ] POST /chat/stream — ChatbotAgent (chỉ có token + done)
[ ] File upload + RAG → search_documents tool hoạt động
[ ] MCP server registration → /mcp/servers CRUD
[ ] Image generation blocking (POST /chat với generate_image request)
[ ] Session / message CRUD — /sessions, /messages
[ ] Health endpoints — /health/, /health/ready
[ ] Auth middleware — request thiếu X-API-Key → 401
```

### 7.4 Edge cases cần cover

| Edge case | Xử lý |
|---|---|
| Resume khi interrupt đã TTL expire | `error_event("Interrupt đã hết hạn")` |
| Agent gọi nhiều sensitive tools liên tiếp | Interrupt từng cái, mỗi cái chờ user confirm |
| `astream_events` lỗi giữa chừng | Emit `error_event`, persist partial message nếu có content |
| Safe tool lỗi (Tavily timeout) | `tool_end` với output là error string, agent tự xử lý |
| Checkpointer MongoDB down | Fallback graceful: log error, trả 503 |
| User gửi message mới khi interrupted | `error_event` với message rõ ràng |
| Multiple concurrent resume requests | `interrupt_states` unique index trên `session_id` |

---

## Dependency giữa các phase

```
Phase 0 (skeleton files, deps)
    ↓
Phase 1 (BaseAgent + stream events) ← ship độc lập, cải thiện UX ngay
    ↓
Phase 2 (MongoDB checkpointer)
    ↓
Phase 3 (interrupt core)
    ↓
Phase 4 (resume + status endpoints)
    ↓
Phase 5 (ReactJS)   ─┐
Phase 6 (RN)        ─┤ song song sau Phase 4
Phase 7 (testing)   ─┘ chạy xuyên suốt từ Phase 1
```

Phase 1 có thể ship trước mà không cần chờ HITL.

---

## Files thay đổi — tổng hợp

### Files mới (tạo từ đầu)

```
app/agents/base.py
app/models/stream.py
app/db/checkpointer.py
app/tools/tool_config.py
app/repositories/interrupt_repository.py
scripts/inspect_checkpoint_schema.py
scripts/verify_tool_names.py
tests/unit/test_base_agent.py
tests/unit/test_interrupt_repository.py
tests/unit/test_tool_config.py
tests/integration/test_stream_events.py
tests/integration/test_hitl_flow.py
```

### Files cập nhật

```
pyproject.toml                       # thêm langgraph-checkpoint-mongodb
app/main.py                          # wire checkpointer vào lifespan
app/agents/chatbot_agent.py          # implement BaseAgent
app/agents/unified_agent.py          # implement BaseAgent, checkpointer, interrupt_before
app/services/chat_service.py         # astream_events loop, HITL logic, resume, status
app/routers/chat.py                  # 2 endpoint mới, SSE headers
app/models/chat.py                   # ResumeRequest, SessionStatusResponse
tests/unit/test_chat_service.py      # cập nhật mock format mới
```

### Files KHÔNG thay đổi

```
app/agents/chatbot_agent.py (logic)  # chỉ thêm BaseAgent interface, không đổi logic
app/graphs/                          # giữ nguyên
app/tools/retriever_tool.py          # giữ nguyên
app/tools/web_search_tool.py         # giữ nguyên
app/tools/image_gen_tool.py          # giữ nguyên (chỉ thêm vào SENSITIVE_TOOLS)
app/tools/mcp_tool.py                # giữ nguyên
app/routers/sessions.py              # giữ nguyên
app/routers/files.py                 # giữ nguyên
app/routers/mcp.py                   # giữ nguyên
app/repositories/ (existing)         # giữ nguyên
app/db/mongo.py                      # giữ nguyên
app/db/qdrant.py                     # giữ nguyên
```