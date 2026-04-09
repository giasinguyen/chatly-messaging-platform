# agents.md — agent-server

> **Mục đích chính:** Quy tắc coding convention & TDD workflow cho dự án `agent-server`.
> Đây là nguồn sự thật duy nhất (single source of truth) cho cách viết code trong dự án.

---

## Table of Contents

1. [Tech Stack & Versions](#1-tech-stack--versions)
2. [Cấu trúc thư mục](#2-cấu-trúc-thư-mục)
3. [Coding Conventions](#3-coding-conventions)
4. [TDD Workflow](#4-tdd-workflow)
5. [DRY Principles](#5-dry-principles)
6. [Agent Patterns](#6-agent-patterns)
7. [LangGraph Node Conventions](#7-langgraph-node-conventions)
8. [MongoDB Conventions](#8-mongodb-conventions)
9. [FastAPI Conventions](#9-fastapi-conventions)
10. [Error Handling](#10-error-handling)
11. [Linting & Formatting](#11-linting--formatting)
12. [Checklist trước khi commit](#12-checklist-trước-khi-commit)

---

## 1. Tech Stack & Versions

| Thư viện | Version tối thiểu | Ghi chú |
|---|---|---|
| Python | 3.12+ | Required |
| `uv` | latest | Package manager duy nhất — không dùng pip trực tiếp |
| `fastapi` | 0.111+ | Web framework |
| `langgraph` | 0.2+ | Agent state machine |
| `langchain` | 0.2+ | Chains, prompts, tools |
| `langserve` | 0.2+ | Expose runnable qua HTTP |
| `langchain-groq` | latest | Groq LLM integration |
| `langchain-huggingface` | latest | Hugging Face Inference API embeddings |
| `huggingface-hub` | latest | Hugging Face API auth + transport |
| `motor` | 3.x | MongoDB async driver (thay Supabase) |
| `pymongo` | 4.x | MongoDB sync utils, ObjectId |
| `minio` | latest | S3-compatible object storage client (file binary) |
| `python-jose[cryptography]` | latest | JWT encode/decode (thay Supabase Auth) |
| `passlib[bcrypt]` | latest | Password hashing |
| `pydantic` | v2 | Validation — KHÔNG dùng v1 |
| `pytest` | 8.x | Testing |
| `pytest-asyncio` | 0.23+ | Async test support |
| `mongomock-motor` | latest | In-memory MongoDB cho unit tests |
| `ruff` | latest | Linting + formatting |
| `mypy` | 1.x | Static type check |

> **Tại sao Motor?** Motor là async wrapper chính thức của PyMongo, tương thích hoàn toàn với `asyncio` và FastAPI. Không dùng `beanie` hay `odmantic` để giữ dependency tối giản.

---

## 2. Cấu trúc thư mục

```
agent-server/
├── pyproject.toml
├── uv.lock
├── .env.example
├── Makefile
├── agents.md                   # file này
│
├── app/
│   ├── main.py                 # FastAPI entry point
│   ├── config.py               # pydantic BaseSettings
│   ├── dependencies.py         # FastAPI DI — tất cả Depends() ở đây
│   ├── exceptions.py           # Custom exception classes
│   │
│   ├── agents/
│   │   ├── base.py             # AbstractBaseAgent
│   │   ├── chatbot_agent.py    # Conversational Chatbot
│   │   ├── rag_agent.py        # RAG Agent
│   │   └── tool_agent.py       # Tool-calling Agent
│   │
│   ├── graphs/
│   │   ├── chatbot_graph.py
│   │   ├── rag_graph.py
│   │   ├── tool_graph.py
│   │   └── nodes/              # Mỗi node là một module riêng
│   │       ├── llm_node.py
│   │       ├── retriever_node.py
│   │       ├── tool_executor_node.py
│   │       └── router_node.py
│   │
│   ├── tools/
│   │   ├── base.py
│   │   ├── search_tool.py
│   │   └── mcp_tool.py
│   │
│   ├── routers/
│   │   ├── auth.py
│   │   ├── chat.py
│   │   ├── files.py
│   │   ├── mcp.py
│   │   ├── sessions.py
│   │   └── health.py
│   │
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── chat_service.py
│   │   ├── file_service.py
│   │   ├── mcp_service.py
│   │   ├── session_service.py
│   │   ├── tool_service.py
│   │   └── vector_service.py
│   │
│   ├── repositories/
│   │   ├── base.py             # Generic BaseRepository[T]
│   │   ├── user_repo.py
│   │   ├── session_repo.py
│   │   ├── message_repo.py
│   │   ├── file_repo.py
│   │   ├── chunk_repo.py
│   │   └── mcp_repo.py
│   │
│   ├── db/
│   │   ├── __init__.py
│   │   ├── mongo.py            # Motor client singleton + collection getters
│   │
│   ├── storage/
│   │   ├── __init__.py
│   │   └── minio.py            # MinIO client singleton + object helpers
│   │
│   ├── models/                 # Pydantic schemas (request/response)
│   │   ├── auth.py
│   │   ├── chat.py
│   │   ├── document.py
│   │   ├── mcp.py
│   │   └── session.py
│   │
│   ├── prompts/                # Prompt templates
│   │   ├── chatbot.py
│   │   ├── rag.py
│   │   └── tool.py
│   │
│   └── utils/
│       ├── llm.py              # LLM factory
│       ├── embeddings.py       # Embedding helpers
│       └── security.py         # JWT helpers
│
└── tests/
    ├── conftest.py             # Shared fixtures
    ├── unit/
    │   ├── agents/
    │   │   ├── test_chatbot_agent.py
    │   │   ├── test_rag_agent.py
    │   │   └── test_tool_agent.py
    │   ├── graphs/
    │   │   └── nodes/
    │   ├── services/
    │   └── repositories/
    └── integration/
        ├── test_auth_api.py
        ├── test_chat_api.py
        ├── test_files_api.py
        └── test_sessions_api.py
```

**Quy tắc cấu trúc:**
- Mỗi `app/x/y.py` phải có file test tương ứng `tests/unit/x/test_y.py`
- Không để business logic trong `routers/` — chỉ có HTTP handling
- Không để DB query trong `services/` — chỉ có business logic
- `repositories/` là layer duy nhất được phép gọi Motor client trực tiếp
- `db/mongo.py` là nơi duy nhất khởi tạo `AsyncIOMotorClient`

---

## 3. Coding Conventions

### 3.1 Python Style

```python
# ✅ ĐÚNG — type hints đầy đủ, return type rõ ràng
async def get_session(session_id: str) -> Session | None:
    """Lấy session theo ID. Trả None nếu không tồn tại."""
    return await self._repo.find_by_id(session_id)


# ❌ SAI — thiếu type hints, không có docstring
async def get_session(session_id):
    return await self._repo.find_by_id(session_id)
```

**Bắt buộc:**
- Type hints cho **mọi** function signature (param + return)
- Docstring ngắn cho mọi public function/class/method
- `async/await` cho mọi I/O (DB, HTTP, LLM calls)
- Không dùng `print()` — dùng `logging.getLogger(__name__)`

### 3.2 Naming

```python
# Classes → PascalCase
class RagAgent(BaseAgent): ...
class MessageRepository(BaseRepository[dict]): ...

# Functions / methods → snake_case
async def retrieve_documents(query: str) -> list[Document]: ...
async def build_rag_graph() -> CompiledGraph: ...

# Constants → UPPER_SNAKE_CASE (đặt ở đầu module)
MAX_TOKENS: int = 4096
DEFAULT_MODEL: str = "llama-3.3-70b-versatile"
TOP_K_DOCUMENTS: int = 5

# Private helpers → _single_underscore
def _format_context(docs: list[Document]) -> str: ...
def _build_system_prompt(persona: str) -> str: ...

# Type aliases → PascalCase, đặt sau imports
SessionId = str
EmbeddingVector = list[float]
DocumentList = list[dict]
MongoId = str   # string representation của ObjectId
```

### 3.3 MongoDB ObjectId Convention

MongoDB dùng `ObjectId` thay vì UUID. Cần serialize/deserialize nhất quán:

```python
# app/db/mongo.py
from bson import ObjectId


def to_str_id(doc: dict) -> dict:
    """Chuyển _id ObjectId → string 'id' cho response."""
    if doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


def to_object_id(id_str: str) -> ObjectId:
    """Parse string sang ObjectId. Raise ValueError nếu invalid."""
    try:
        return ObjectId(id_str)
    except Exception as e:
        raise ValueError(f"Invalid id: {id_str}") from e
```

**Quy tắc:**
- Lưu vào MongoDB: dùng `ObjectId` (native)
- Trả ra API: dùng `str` (serialized)
- Nhận từ API: dùng `str`, convert bằng `to_object_id()` trong repository
- Không bao giờ expose `_id` raw ra ngoài repository layer

### 3.4 Function Size & Responsibility

```python
# ✅ ĐÚNG — mỗi function 1 việc, ≤ 20 dòng
async def embed_query(query: str) -> EmbeddingVector:
    """Embed câu hỏi thành vector."""
    return await self._embedder.aembed_query(query)

async def search_similar_docs(
    embedding: EmbeddingVector,
    session_id: str,
    top_k: int = TOP_K_DOCUMENTS,
) -> DocumentList:
    """Tìm documents tương đồng trong MongoDB vector index."""
    return await self._vector_service.similarity_search(embedding, session_id, top_k)


# ❌ SAI — quá nhiều responsibility trong 1 function
async def process_query(query, session_id, history=None, stream=False, top_k=5):
    embedding = ...
    docs = ...
    prompt = ...
    response = ...
    await save_to_db(...)
    return response
```

### 3.5 Imports

```python
# Thứ tự: stdlib → third-party → internal
# Dùng absolute imports trong app/

# stdlib
import logging
from typing import AsyncIterator
from abc import ABC, abstractmethod

# third-party
from bson import ObjectId
from fastapi import Depends, HTTPException
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END
from motor.motor_asyncio import AsyncIOMotorDatabase

# internal
from app.config import settings
from app.models.chat import ChatInput, ChatOutput
from app.repositories.base import BaseRepository
```

### 3.6 Pydantic Models

```python
# app/models/chat.py
from pydantic import BaseModel, Field
import uuid


class ChatInput(BaseModel):
    message: str = Field(..., min_length=1, max_length=8192)
    session_id: str
    agent_type: str = Field(default="chatbot", pattern="^(chatbot|rag|tool)$")
    use_web_search: bool = False
    mcp_server_ids: list[str] = []

    model_config = {"frozen": True}  # immutable — không mutate input


class ChatOutput(BaseModel):
    content: str
    session_id: str
    message_id: str
    agent_type: str
    usage: dict[str, int] | None = None
```

---

## 4. TDD Workflow

### 4.1 Quy trình bắt buộc: Red → Green → Refactor

```
1. RED    → Viết test mô tả behavior mong muốn. Chạy → thấy FAIL (đỏ).
2. GREEN  → Viết code tối thiểu nhất để test pass. Chạy → thấy PASS (xanh).
3. REFACTOR → Cải thiện code (DRY, naming, structure). Test phải vẫn xanh.
```

> **Không được phép** viết implementation trước khi có test cho nó.

### 4.2 Test Naming Convention

```python
# Pattern: test_<behavior>_when_<condition>
def test_invoke_returns_answer_when_docs_found(): ...
def test_invoke_raises_error_when_session_not_found(): ...
def test_retrieve_returns_empty_list_when_no_match(): ...
def test_stream_yields_tokens_when_llm_responds(): ...
def test_find_by_id_returns_none_when_invalid_object_id(): ...
```

### 4.3 Test Structure — Arrange / Act / Assert

```python
# tests/unit/agents/test_rag_agent.py
import pytest
from unittest.mock import AsyncMock
from app.agents.rag_agent import RagAgent
from app.models.chat import ChatInput


@pytest.fixture
def chat_input() -> ChatInput:
    return ChatInput(message="What is LangGraph?", session_id="507f1f77bcf86cd799439011")


@pytest.fixture
def rag_agent(mock_llm, mock_vector_service) -> RagAgent:
    return RagAgent(llm=mock_llm, vector_service=mock_vector_service)


class TestRagAgentInvoke:
    """Nhóm tests theo method/behavior, không theo input."""

    async def test_invoke_returns_answer_when_docs_found(
        self, rag_agent: RagAgent, chat_input: ChatInput
    ) -> None:
        # Arrange — đã setup qua fixture

        # Act
        result = await rag_agent.ainvoke(chat_input)

        # Assert
        assert result.content != ""
        assert result.session_id == chat_input.session_id

    async def test_invoke_calls_vector_service_once(
        self, rag_agent: RagAgent, chat_input: ChatInput
    ) -> None:
        await rag_agent.ainvoke(chat_input)
        rag_agent._vector_service.similarity_search.assert_called_once()

    async def test_invoke_raises_value_error_when_empty_message(self) -> None:
        with pytest.raises(ValueError):
            ChatInput(message="", session_id="507f1f77bcf86cd799439011")
```

### 4.4 conftest.py — Shared Fixtures

```python
# tests/conftest.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from langchain_groq import ChatGroq
from langchain_core.messages import AIMessage
from mongomock_motor import AsyncMongoMockClient


@pytest.fixture
def mock_llm() -> AsyncMock:
    """Mock ChatGroq trả về response cố định."""
    llm = AsyncMock(spec=ChatGroq)
    llm.ainvoke.return_value = AIMessage(content="mocked response")
    llm.astream.return_value = _async_iter(["mock", "ed", " response"])
    return llm


@pytest.fixture
def mock_vector_service() -> AsyncMock:
    """Mock vector service với docs giả."""
    service = AsyncMock()
    service.similarity_search.return_value = [
        {"content": "LangGraph is a library for building stateful agents.", "score": 0.95}
    ]
    service.has_context.return_value = True
    return service


@pytest.fixture
def mock_mongo_db():
    """In-memory MongoDB dùng mongomock-motor."""
    client = AsyncMongoMockClient()
    return client["agent_server_test"]


@pytest.fixture
def mock_jwt_user() -> dict:
    """User dict giả lập sau khi JWT decode."""
    return {"id": "507f1f77bcf86cd799439011", "email": "test@example.com"}


async def _async_iter(items: list[str]):
    """Helper tạo async iterator từ list."""
    for item in items:
        yield item
```

### 4.5 Pytest Configuration

```toml
# pyproject.toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
addopts = "-v --tb=short -q"

[tool.coverage.run]
source = ["app"]
omit = ["app/main.py", "app/config.py"]

[tool.coverage.report]
fail_under = 80
show_missing = true
```

### 4.6 Quy tắc Test — Được phép & Không được phép

| | Quy tắc | Lý do |
|---|---|---|
| ✅ | Mock external dependencies (LLM, MongoDB, HTTP) | Isolate unit under test |
| ✅ | Dùng `mongomock-motor` cho repository tests | Test logic DB mà không cần server thật |
| ✅ | Test behavior, không test implementation | Refactor không làm vỡ test |
| ✅ | Một `assert` chính mỗi test | Test rõ ràng, dễ debug khi fail |
| ✅ | Dùng `pytest.fixture` cho setup tái sử dụng | DRY trong tests |
| ✅ | Dùng `pytest.mark.parametrize` cho nhiều inputs | Tránh copy-paste tests |
| ❌ | Mock internal modules của app | Test trở nên giòn |
| ❌ | Test nhiều behaviors trong 1 test | Khó biết thứ gì fail |
| ❌ | Hardcode ObjectId string magic values | Dùng fixture hoặc `str(ObjectId())` |
| ❌ | Skip test mà không có lý do rõ ràng | `@pytest.mark.skip(reason="...")` nếu cần |

### 4.7 Parametrize Example

```python
@pytest.mark.parametrize("message", [
    "Hello",
    "What is your name?",
    "Tell me about Python",
])
async def test_invoke_calls_llm_once_regardless_of_message(
    chatbot_agent: ChatbotAgent,
    message: str,
) -> None:
    input = ChatInput(message=message, session_id="507f1f77bcf86cd799439011")
    await chatbot_agent.ainvoke(input)
    chatbot_agent._llm.ainvoke.assert_called_once()
```

---

## 5. DRY Principles

### 5.1 Base Agent — không repeat interface

```python
# app/agents/base.py
from abc import ABC, abstractmethod
from typing import AsyncIterator
from app.models.chat import ChatInput, ChatOutput


class BaseAgent(ABC):
    """
    Interface chung cho tất cả agents.
    Mọi agent PHẢI kế thừa class này.
    """

    @abstractmethod
    async def ainvoke(self, input: ChatInput) -> ChatOutput:
        """Gọi agent, chờ kết quả đầy đủ."""
        ...

    @abstractmethod
    async def astream(self, input: ChatInput) -> AsyncIterator[str]:
        """Gọi agent, stream từng token."""
        ...

    def _build_run_config(self, session_id: str) -> dict:
        """Shared LangGraph run config — không override trừ khi cần."""
        return {"configurable": {"thread_id": session_id}}
```

### 5.2 Base Repository — không repeat CRUD

```python
# app/repositories/base.py
from typing import Generic, TypeVar
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection
from app.db.mongo import to_str_id, to_object_id

T = TypeVar("T")


class BaseRepository(Generic[T]):
    """
    CRUD operations dùng chung cho MongoDB.
    Subclass chỉ override khi cần logic đặc biệt.
    """

    def __init__(self, collection: AsyncIOMotorCollection) -> None:
        self._col = collection

    async def find_by_id(self, id: str) -> dict | None:
        """Tìm document theo id string, trả None nếu không tồn tại."""
        doc = await self._col.find_one({"_id": to_object_id(id)})
        return to_str_id(doc) if doc else None

    async def create(self, data: dict) -> dict:
        """Insert document, trả về document với id đã được stringify."""
        result = await self._col.insert_one(data)
        data["_id"] = result.inserted_id
        return to_str_id(data)

    async def delete_by_id(self, id: str) -> bool:
        """Xoá document theo id. Trả True nếu xoá thành công."""
        result = await self._col.delete_one({"_id": to_object_id(id)})
        return result.deleted_count > 0

    async def update_by_id(self, id: str, update: dict) -> dict | None:
        """Update document theo id, trả về document sau update."""
        await self._col.update_one(
            {"_id": to_object_id(id)},
            {"$set": update},
        )
        return await self.find_by_id(id)
```

### 5.3 MongoDB Client — singleton, không tạo nhiều connection

```python
# app/db/mongo.py
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from bson import ObjectId
from app.config import settings

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    """Trả về MongoDB client singleton."""
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(
            settings.mongodb_uri,
            serverSelectionTimeoutMS=5000,
        )
    return _client


def get_db() -> AsyncIOMotorDatabase:
    """Trả về database instance."""
    return get_client()[settings.mongodb_db_name]


async def close_client() -> None:
    """Gọi khi app shutdown."""
    global _client
    if _client:
        _client.close()
        _client = None


def to_str_id(doc: dict) -> dict:
    """Chuyển _id ObjectId → string id."""
    if doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


def to_object_id(id_str: str) -> ObjectId:
    """Parse string sang ObjectId."""
    try:
        return ObjectId(id_str)
    except Exception as e:
        raise ValueError(f"Invalid id format: {id_str}") from e
```

### 5.4 LLM Factory — không tạo instance lặp lại

```python
# app/utils/llm.py
from functools import lru_cache
from langchain_groq import ChatGroq
from app.config import settings


@lru_cache(maxsize=4)
def get_llm(
    model: str = settings.groq_model,
    temperature: float = 0.0,
    streaming: bool = False,
) -> ChatGroq:
    """Singleton per (model, temperature) — tái sử dụng thay vì tạo mới mỗi request."""
    return ChatGroq(
        model=model,
        api_key=settings.groq_api_key,
        temperature=temperature,
        streaming=streaming,
    )
```

### 5.5 Prompt Templates — không hardcode trong agent

```python
# app/prompts/rag.py
from langchain_core.prompts import ChatPromptTemplate

RAG_SYSTEM = (
    "You are a helpful assistant. "
    "Answer using the context extracted from the user's uploaded files when relevant.\n\n"
    "<context>\n{context}\n</context>\n\n"
    "If the context doesn't contain enough information, answer from general knowledge "
    "but mention the files didn't cover it."
)

RAG_PROMPT = ChatPromptTemplate.from_messages([
    ("system", RAG_SYSTEM),
    ("placeholder", "{history}"),
    ("human", "{question}"),
])
```

### 5.6 FastAPI Dependencies — không repeat DI logic

```python
# app/dependencies.py
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.db.mongo import get_db
from app.utils.llm import get_llm
from app.repositories.session_repo import SessionRepository
from app.repositories.message_repo import MessageRepository
from app.services.session_service import SessionService


def get_database() -> AsyncIOMotorDatabase:
    """Database dependency — inject vào tất cả repositories."""
    return get_db()


def get_session_service(
    db: AsyncIOMotorDatabase = Depends(get_database),
) -> SessionService:
    session_repo = SessionRepository(db["sessions"])
    message_repo = MessageRepository(db["messages"])
    return SessionService(session_repo, message_repo)

# Tương tự cho các services khác
```

---

## 6. Agent Patterns

### 6.1 Conversational Chatbot

```python
# app/agents/chatbot_agent.py
import logging
from typing import AsyncIterator
from langchain_groq import ChatGroq
from app.agents.base import BaseAgent
from app.graphs.chatbot_graph import build_chatbot_graph
from app.models.chat import ChatInput, ChatOutput

logger = logging.getLogger(__name__)


class ChatbotAgent(BaseAgent):
    """Conversational agent với memory per session."""

    def __init__(self, llm: ChatGroq) -> None:
        self._graph = build_chatbot_graph(llm)

    async def ainvoke(self, input: ChatInput) -> ChatOutput:
        config = self._build_run_config(input.session_id)
        result = await self._graph.ainvoke(
            {"messages": [("human", input.message)]},
            config=config,
        )
        return ChatOutput(
            content=result["messages"][-1].content,
            session_id=input.session_id,
            message_id="",   # set bởi service sau khi lưu vào MongoDB
            agent_type="chatbot",
        )

    async def astream(self, input: ChatInput) -> AsyncIterator[str]:
        config = self._build_run_config(input.session_id)
        async for chunk in self._graph.astream(
            {"messages": [("human", input.message)]},
            config=config,
            stream_mode="values",
        ):
            if chunk.get("messages"):
                yield chunk["messages"][-1].content
```

### 6.2 RAG Agent

```python
# app/agents/rag_agent.py
from langchain_groq import ChatGroq
from app.agents.base import BaseAgent
from app.graphs.rag_graph import build_rag_graph
from app.services.vector_service import VectorService
from app.models.chat import ChatInput, ChatOutput


class RagAgent(BaseAgent):
    """Agent trả lời dựa trên tài liệu từ MongoDB Atlas Vector Search."""

    def __init__(self, llm: ChatGroq, vector_service: VectorService) -> None:
        self._graph = build_rag_graph(llm, vector_service)

    async def ainvoke(self, input: ChatInput) -> ChatOutput:
        config = self._build_run_config(input.session_id)
        result = await self._graph.ainvoke(
            {"query": input.message, "messages": [], "context": [], "session_id": input.session_id},
            config=config,
        )
        return ChatOutput(
            content=result["messages"][-1].content,
            session_id=input.session_id,
            message_id="",
            agent_type="rag",
        )
```

### 6.3 Tool-calling Agent

```python
# app/agents/tool_agent.py
from langchain_groq import ChatGroq
from langchain_core.tools import BaseTool
from app.agents.base import BaseAgent
from app.graphs.tool_graph import build_tool_graph
from app.models.chat import ChatInput, ChatOutput


class ToolAgent(BaseAgent):
    """Agent có khả năng gọi external tools (MCP + web search)."""

    def __init__(self, llm: ChatGroq, tools: list[BaseTool]) -> None:
        self._graph = build_tool_graph(llm, tools)

    async def ainvoke(self, input: ChatInput) -> ChatOutput:
        config = self._build_run_config(input.session_id)
        result = await self._graph.ainvoke(
            {"messages": [("human", input.message)]},
            config=config,
        )
        return ChatOutput(
            content=result["messages"][-1].content,
            session_id=input.session_id,
            message_id="",
            agent_type="tool",
        )
```

---

## 7. LangGraph Node Conventions

### 7.1 Node là pure async function

```python
# ✅ Node nhận state, trả dict update — không có side effects ngoài state
from app.graphs.rag_graph import RagState
from app.prompts.rag import RAG_PROMPT
from langchain_groq import ChatGroq


async def generate_node(state: RagState, llm: ChatGroq) -> dict:
    """Generate answer từ context đã retrieve."""
    context = "\n\n".join(state["context"])
    messages = RAG_PROMPT.format_messages(
        context=context,
        question=state["query"],
        history=state.get("messages", []),
    )
    response = await llm.ainvoke(messages)
    return {"messages": [response]}
```

### 7.2 State Definition

```python
# app/graphs/rag_graph.py
from typing import TypedDict, Annotated
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage


class RagState(TypedDict):
    query: str
    session_id: str
    context: list[str]
    messages: Annotated[list[BaseMessage], add_messages]


class ChatbotState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]


class ToolState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
```

### 7.3 Graph Builder Pattern

```python
from functools import partial
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver


def build_rag_graph(llm: ChatGroq, vector_service: VectorService):
    """Factory — gọi một lần khi app khởi động."""
    graph = StateGraph(RagState)

    graph.add_node("retrieve", partial(retrieve_node, vector_service=vector_service))
    graph.add_node("generate", partial(generate_node, llm=llm))

    graph.set_entry_point("retrieve")
    graph.add_edge("retrieve", "generate")
    graph.add_edge("generate", END)

    return graph.compile(checkpointer=MemorySaver())
```

---

## 8. MongoDB Conventions

### 8.1 Phân chia Collections

| Collection | Mô tả | Managed by |
|---|---|---|
| `users` | User accounts + hashed passwords | `UserRepository` |
| `sessions` | Chat sessions per user | `SessionRepository` |
| `messages` | Messages per session | `MessageRepository` |
| `files` | Uploaded file metadata | `FileRepository` |
| `chunks` | Document chunks + embedding vectors | `ChunkRepository` |
| `mcp_servers` | MCP server configs per user | `MCPRepository` |
| MinIO bucket (`uploads`) | Raw file binary storage | `app/storage/minio.py` |

### 8.2 Auth — JWT tự quản lý

Không dùng Supabase Auth. Auth được implement tự bằng `python-jose` + `passlib`:

```python
# app/utils/security.py
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: str) -> str:
    """Tạo JWT access token với expiry."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> str:
    """Decode JWT, trả về user_id. Raise JWTError nếu invalid/expired."""
    payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    user_id: str | None = payload.get("sub")
    if user_id is None:
        raise JWTError("Missing subject")
    return user_id
```

### 8.3 Auth Middleware

```python
# app/middleware/auth.py
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from app.utils.security import decode_token
from app.repositories.user_repo import UserRepository
from app.dependencies import get_user_repo

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
    user_repo: UserRepository = Depends(get_user_repo),
) -> dict:
    """Validate JWT Bearer token — dùng làm dependency trong protected routes."""
    try:
        user_id = decode_token(credentials.credentials)
    except JWTError as e:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from e

    user = await user_repo.find_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
```

### 8.4 Repository — layer duy nhất gọi Motor trực tiếp

```python
# app/repositories/message_repo.py
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorCollection
from app.repositories.base import BaseRepository
from app.db.mongo import to_str_id, to_object_id


class MessageRepository(BaseRepository[dict]):
    def __init__(self, collection: AsyncIOMotorCollection) -> None:
        super().__init__(collection)

    async def find_by_session(self, session_id: str) -> list[dict]:
        """Lấy tất cả messages của session, sorted by created_at ASC."""
        cursor = self._col.find(
            {"session_id": session_id}
        ).sort("created_at", 1)
        return [to_str_id(doc) async for doc in cursor]

    async def create_message(
        self,
        session_id: str,
        role: str,
        content: str,
        tool_calls: dict | None = None,
    ) -> dict:
        """Insert một message mới vào collection."""
        doc = {
            "session_id": session_id,
            "role": role,
            "content": content,
            "tool_calls": tool_calls,
            "created_at": datetime.now(timezone.utc),
        }
        return await self.create(doc)
```

### 8.5 MongoDB Atlas Vector Search

Dùng MongoDB Atlas Vector Search index thay pgvector:

```python
# app/repositories/chunk_repo.py
from motor.motor_asyncio import AsyncIOMotorCollection
from app.repositories.base import BaseRepository
from app.db.mongo import to_str_id


class ChunkRepository(BaseRepository[dict]):
    def __init__(self, collection: AsyncIOMotorCollection) -> None:
        super().__init__(collection)

    async def vector_search(
        self,
        embedding: list[float],
        session_id: str,
        top_k: int = 5,
        threshold: float = 0.5,
    ) -> list[dict]:
        """
        MongoDB Atlas Vector Search ($vectorSearch aggregation).
        Index name: 'chunk_embedding_index' (tạo ở Atlas UI hoặc API).
        Embedding model: BAAI/bge-base-en-v1.5 (Hugging Face Inference API, 768 dims).
        """
        pipeline = [
            {
                "$vectorSearch": {
                    "index": "chunk_embedding_index",
                    "path": "embedding",
                    "queryVector": embedding,
                    "numCandidates": top_k * 10,
                    "limit": top_k,
                    "filter": {"session_id": session_id},
                }
            },
            {
                "$addFields": {
                    "score": {"$meta": "vectorSearchScore"}
                }
            },
            {
                "$match": {"score": {"$gte": threshold}}
            },
            {
                "$project": {"embedding": 0}  # không trả embedding vector về
            },
        ]
        cursor = self._col.aggregate(pipeline)
        return [to_str_id(doc) async for doc in cursor]

    async def count_by_session(self, session_id: str) -> int:
        """Đếm số chunks của session — dùng để check has_context."""
        return await self._col.count_documents({"session_id": session_id})
```

### 8.6 MinIO cho File Storage

```python
# app/storage/minio.py
from functools import lru_cache

from minio import Minio

from app.config import settings


@lru_cache(maxsize=1)
def get_minio_client() -> Minio:
    """Trả về MinIO client singleton cho file binary storage."""
    return Minio(
        endpoint=settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_secure,
    )
```

### 8.7 Không gọi Motor từ Agent hay Service

```python
# ❌ SAI — agent gọi MongoDB trực tiếp
class RagAgent:
    async def ainvoke(self, input: ChatInput) -> ChatOutput:
        docs = await self._db["chunks"].find({}).to_list(10)
        ...

# ✅ ĐÚNG — agent → service → repository → Motor
class RagAgent:
    def __init__(self, vector_service: VectorService) -> None:
        self._vector_service = vector_service

    async def ainvoke(self, input: ChatInput) -> ChatOutput:
        docs = await self._vector_service.similarity_search(
            query=input.message,
            session_id=input.session_id,
        )
        ...
```

---

## 9. FastAPI Conventions

### 9.1 Router chỉ làm HTTP handling

```python
# app/routers/chat.py
import logging
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from app.models.chat import ChatInput, ChatOutput
from app.services.chat_service import ChatService
from app.dependencies import get_chat_service
from app.middleware.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/sessions/{session_id}", tags=["chat"])


@router.post("/chat", response_model=ChatOutput)
async def invoke_agent(
    session_id: str,
    input: ChatInput,
    current_user: dict = Depends(get_current_user),
    service: ChatService = Depends(get_chat_service),
) -> ChatOutput:
    """Gọi agent, trả kết quả đầy đủ."""
    return await service.chat(
        user_id=current_user["id"],
        session_id=session_id,
        request=input,
    )


@router.post("/chat/stream")
async def stream_agent(
    session_id: str,
    input: ChatInput,
    current_user: dict = Depends(get_current_user),
    service: ChatService = Depends(get_chat_service),
) -> StreamingResponse:
    """Gọi agent, stream từng token qua SSE."""
    return StreamingResponse(
        service.stream_chat(user_id=current_user["id"], session_id=session_id, request=input),
        media_type="text/event-stream",
    )
```

### 9.2 App Lifespan — khởi tạo và đóng MongoDB connection

```python
# app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.db.mongo import get_client, close_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ping MongoDB để verify connection
    client = get_client()
    await client.admin.command("ping")
    yield
    # Shutdown: đóng connection pool
    await close_client()


app = FastAPI(title="agent-server", version="1.0.0", lifespan=lifespan)
```

---

## 10. Error Handling

### 10.1 Custom Exceptions

```python
# app/exceptions.py


class AgentServerError(Exception):
    """Base exception."""


class AgentError(AgentServerError):
    """Lỗi khi chạy agent."""


class SessionNotFoundError(AgentServerError):
    """Session không tồn tại hoặc không thuộc về user."""


class UserNotFoundError(AgentServerError):
    """User không tồn tại."""


class InvalidCredentialsError(AgentServerError):
    """Email/password không đúng."""


class VectorSearchError(AgentServerError):
    """Lỗi MongoDB vector search."""


class LLMRateLimitError(AgentServerError):
    """Groq API rate limit."""


class FileProcessingError(AgentServerError):
    """Lỗi khi xử lý file upload."""


class MCPConnectionError(AgentServerError):
    """Không kết nối được tới MCP server."""
```

### 10.2 Exception → HTTP Mapping

```python
# app/main.py
@app.exception_handler(SessionNotFoundError)
async def session_not_found_handler(request, exc):
    return JSONResponse(status_code=404, content={"detail": str(exc)})

@app.exception_handler(InvalidCredentialsError)
async def invalid_credentials_handler(request, exc):
    return JSONResponse(status_code=401, content={"detail": "Invalid email or password"})

@app.exception_handler(LLMRateLimitError)
async def rate_limit_handler(request, exc):
    return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded. Retry later."})

@app.exception_handler(MCPConnectionError)
async def mcp_connection_handler(request, exc):
    return JSONResponse(status_code=400, content={"detail": str(exc)})

@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    return JSONResponse(status_code=422, content={"detail": str(exc)})
```

### 10.3 Wrap External Calls

```python
import groq
from app.exceptions import LLMRateLimitError, AgentError


async def _call_llm(self, messages: list) -> str:
    try:
        response = await self._llm.ainvoke(messages)
        return response.content
    except groq.RateLimitError as e:
        raise LLMRateLimitError("Groq API rate limit exceeded") from e
    except groq.APIError as e:
        raise AgentError(f"LLM call failed: {e}") from e
```

---

## 11. Linting & Formatting

### 11.1 Ruff Config

```toml
[tool.ruff]
line-length = 88
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "SIM", "ANN"]
ignore = ["ANN101", "ANN102"]

[tool.ruff.lint.isort]
known-first-party = ["app"]
```

### 11.2 Mypy Config

```toml
[tool.mypy]
python_version = "3.12"
strict = true
plugins = ["pydantic.mypy"]
ignore_missing_imports = true

[[tool.mypy.overrides]]
module = "tests.*"
disallow_untyped_defs = false
```

### 11.3 Makefile

```makefile
.PHONY: lint format test test-cov run

lint:
	uv run ruff check app tests
	uv run ruff format --check app tests
	uv run mypy app

format:
	uv run ruff format app tests
	uv run ruff check --fix app tests

test:
	uv run pytest tests/unit -v

test-integration:
	uv run pytest tests/integration -v

test-cov:
	uv run pytest --cov=app --cov-report=term-missing --cov-report=html

run:
	uv run uvicorn app.main:app --reload --port 8000
```

---

## 12. Checklist trước khi commit

```bash
make format      # auto-fix
make lint        # không có warning
make test-cov    # coverage ≥ 80%
```

**Code review checklist:**

- [ ] Test viết trước implementation (TDD — Red trước Green)
- [ ] Type hints đầy đủ cho tất cả function signatures
- [ ] Không có logic bị duplicate (DRY)
- [ ] External calls (LLM, MongoDB, HTTP) đều được mock trong unit tests
- [ ] Custom exceptions thay vì `raise Exception(...)`
- [ ] Không có `print()` — chỉ dùng `logging`
- [ ] Không có hardcoded credentials, connection strings, hay magic numbers
- [ ] Docstring cho tất cả public functions/classes
- [ ] `repositories/` là layer duy nhất gọi Motor client trực tiếp
- [ ] `db/mongo.py` là nơi duy nhất tạo `AsyncIOMotorClient`
- [ ] `to_str_id()` được gọi trước khi trả document ra ngoài repository
- [ ] Auth dependency đã được áp dụng cho tất cả protected routes

---

> **Nguyên tắc cốt lõi:** Viết code như thể người maintain sau bạn không biết context gì — vì thường đó chính là bạn, 6 tháng sau.
