from typing import Any

from langchain_core.messages import BaseMessage
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """Incoming chat payload for one turn."""

    message: str = Field(..., min_length=1, max_length=8192)
    agent_type: str = Field(default="chatbot", pattern="^(chatbot|rag|tool)$")
    use_web_search: bool = False
    mcp_server_ids: list[str] = Field(default_factory=list)


class ChatResponse(BaseModel):
    """Response payload for non-stream chat."""

    content: str
    session_id: str
    message_id: str


class ChatInput(BaseModel):
    """Internal chat input passed to agent implementations."""

    message: str = Field(..., min_length=1, max_length=8192)
    session_id: str
    history: list[BaseMessage] = Field(default_factory=list)

    model_config = {"arbitrary_types_allowed": True, "frozen": True}


class ChatOutput(BaseModel):
    """Internal chat output returned by agent implementations."""

    content: str
    session_id: str
    message_id: str
    agent_type: str
    usage: dict[str, Any] | None = None
