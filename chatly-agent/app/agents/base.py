"""Abstract base class for all agent implementations."""
from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from typing import Any

from app.models.chat import ChatInput, ChatOutput


class BaseAgent(ABC):
    """Contract that every agent must fulfill.

    Service layer depends only on this interface — never on concrete types.
    """

    agent_type: str

    @abstractmethod
    async def ainvoke(
        self, input: ChatInput, config: dict[str, Any] | None = None
    ) -> ChatOutput:
        """Run a full agent turn and return the final response."""
        ...

    @abstractmethod
    async def astream_events(
        self, input: ChatInput, config: dict[str, Any]
    ) -> AsyncIterator[dict[str, Any]]:
        """Yield LangGraph v2 stream events for the given input.

        Implementations must yield dicts with at least an ``event`` key
        compatible with LangGraph's astream_events v2 format.  Service layer
        filters ``on_chat_model_stream``, ``on_tool_start``, and
        ``on_tool_end`` events; all others are silently ignored.
        """
        ...
