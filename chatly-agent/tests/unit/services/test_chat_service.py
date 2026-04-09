from collections.abc import AsyncIterator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.tools import BaseTool

from app.models.chat import ChatOutput, ChatRequest
from app.services.chat_service import ChatService
from app.services.tool_service import ToolService


async def _iter_tokens(tokens: list[str]) -> AsyncIterator[str]:
    for token in tokens:
        yield token


@pytest.mark.asyncio
async def test_chat_verifies_ownership_before_agent_call() -> None:
    session_service = AsyncMock()
    message_repo = AsyncMock()
    message_repo.find_by_session.return_value = []
    message_repo.create_message.side_effect = [{"id": "m-user"}, {"id": "m-assistant"}]

    chatbot_agent = AsyncMock()
    chatbot_agent.ainvoke.return_value = ChatOutput(
        content="reply",
        session_id="session-1",
        message_id="",
        agent_type="chatbot",
    )

    service = ChatService(
        session_service=session_service,
        message_repo=message_repo,
        chatbot_agent=chatbot_agent,
        rag_agent=AsyncMock(),
        vector_service=AsyncMock(has_context=AsyncMock(return_value=False)),
    )

    response = await service.chat(
        user_id="user-1",
        session_id="session-1",
        request=ChatRequest(message="hello"),
    )

    assert response.content == "reply"
    session_service.get_session.assert_awaited_once_with("user-1", "session-1")
    chatbot_agent.ainvoke.assert_awaited_once()


@pytest.mark.asyncio
async def test_chat_saves_user_and_assistant_messages() -> None:
    session_service = AsyncMock()
    message_repo = AsyncMock()
    message_repo.find_by_session.return_value = []
    message_repo.create_message.side_effect = [{"id": "m-user"}, {"id": "m-assistant"}]

    chatbot_agent = AsyncMock()
    chatbot_agent.ainvoke.return_value = ChatOutput(
        content="assistant output",
        session_id="session-1",
        message_id="",
        agent_type="chatbot",
    )

    service = ChatService(
        session_service=session_service,
        message_repo=message_repo,
        chatbot_agent=chatbot_agent,
        rag_agent=AsyncMock(),
        vector_service=AsyncMock(has_context=AsyncMock(return_value=False)),
    )

    response = await service.chat(
        user_id="user-1",
        session_id="session-1",
        request=ChatRequest(message="hello"),
    )

    assert response.message_id == "m-assistant"
    assert message_repo.create_message.await_count == 2


@pytest.mark.asyncio
async def test_stream_chat_yields_sse_and_persists_full_response() -> None:
    session_service = AsyncMock()
    message_repo = AsyncMock()
    message_repo.find_by_session.return_value = []
    message_repo.create_message.side_effect = [{"id": "m-user"}, {"id": "m-assistant"}]

    chatbot_agent = AsyncMock()
    chatbot_agent.astream.return_value = _iter_tokens(["Hel", "lo"])

    service = ChatService(
        session_service=session_service,
        message_repo=message_repo,
        chatbot_agent=chatbot_agent,
        rag_agent=AsyncMock(),
        vector_service=AsyncMock(has_context=AsyncMock(return_value=False)),
    )

    chunks = [
        chunk
        async for chunk in service.stream_chat(
            user_id="user-1",
            session_id="session-1",
            request=ChatRequest(message="hello"),
        )
    ]

    assert chunks[0] == 'data: {"token": "Hel"}\n\n'
    assert chunks[1] == 'data: {"token": "lo"}\n\n'
    assert chunks[2] == "data: [DONE]\n\n"
    message_repo.create_message.assert_any_await(
        "session-1",
        "assistant",
        "Hello",
        tool_calls=None,
    )


@pytest.mark.asyncio
async def test_chat_uses_rag_agent_when_context_exists() -> None:
    session_service = AsyncMock()
    message_repo = AsyncMock()
    message_repo.find_by_session.return_value = []
    message_repo.create_message.side_effect = [{"id": "m-user"}, {"id": "m-assistant"}]

    chatbot_agent = AsyncMock()
    rag_agent = AsyncMock()
    rag_agent.ainvoke.return_value = ChatOutput(
        content="rag reply",
        session_id="session-1",
        message_id="",
        agent_type="rag",
    )
    vector_service = AsyncMock()
    vector_service.has_context.return_value = True

    service = ChatService(
        session_service=session_service,
        message_repo=message_repo,
        chatbot_agent=chatbot_agent,
        rag_agent=rag_agent,
        vector_service=vector_service,
    )

    response = await service.chat(
        user_id="user-1",
        session_id="session-1",
        request=ChatRequest(message="hello"),
    )

    assert response.content == "rag reply"
    rag_agent.ainvoke.assert_awaited_once()
    chatbot_agent.ainvoke.assert_not_called()


@pytest.mark.asyncio
async def test_chat_uses_tool_agent_when_mcp_server_ids_provided() -> None:
    """When tool_service returns tools, a ToolAgent is built and used."""
    session_service = AsyncMock()
    message_repo = AsyncMock()
    message_repo.find_by_session.return_value = []
    message_repo.create_message.side_effect = [{"id": "m-user"}, {"id": "m-asst"}]

    chatbot_agent = AsyncMock()
    rag_agent = AsyncMock()
    vector_service = AsyncMock(has_context=AsyncMock(return_value=False))

    fake_tool = MagicMock(spec=BaseTool)
    tool_service = AsyncMock(spec=ToolService)
    tool_service.assemble_tools = AsyncMock(return_value=[fake_tool])

    fake_tool_agent = AsyncMock()
    fake_tool_agent.ainvoke.return_value = ChatOutput(
        content="tool reply",
        session_id="session-1",
        message_id="",
        agent_type="tool",
    )

    with patch("app.services.chat_service.ToolAgent", return_value=fake_tool_agent):
        service = ChatService(
            session_service=session_service,
            message_repo=message_repo,
            chatbot_agent=chatbot_agent,
            rag_agent=rag_agent,
            vector_service=vector_service,
            tool_service=tool_service,
            llm=MagicMock(),
        )

        response = await service.chat(
            user_id="user-1",
            session_id="session-1",
            request=ChatRequest(message="hello", mcp_server_ids=["s1"]),
        )

    assert response.content == "tool reply"
    chatbot_agent.ainvoke.assert_not_called()
    rag_agent.ainvoke.assert_not_called()


@pytest.mark.asyncio
async def test_chat_falls_back_to_rag_when_tool_service_returns_no_tools() -> None:
    """If tool_service returns no tools, fall back to the normal agent selection."""
    session_service = AsyncMock()
    message_repo = AsyncMock()
    message_repo.find_by_session.return_value = []
    message_repo.create_message.side_effect = [{"id": "m-user"}, {"id": "m-asst"}]

    rag_agent = AsyncMock()
    rag_agent.ainvoke.return_value = ChatOutput(
        content="rag reply",
        session_id="session-1",
        message_id="",
        agent_type="rag",
    )
    vector_service = AsyncMock(has_context=AsyncMock(return_value=True))

    tool_service = AsyncMock(spec=ToolService)
    tool_service.assemble_tools = AsyncMock(return_value=[])  # empty → no ToolAgent

    service = ChatService(
        session_service=session_service,
        message_repo=message_repo,
        chatbot_agent=AsyncMock(),
        rag_agent=rag_agent,
        vector_service=vector_service,
        tool_service=tool_service,
        llm=MagicMock(),
    )

    response = await service.chat(
        user_id="user-1",
        session_id="session-1",
        request=ChatRequest(message="hello", mcp_server_ids=["s1"]),
    )

    assert response.content == "rag reply"
    rag_agent.ainvoke.assert_awaited_once()


@pytest.mark.asyncio
async def test_chat_uses_tool_agent_when_use_web_search_is_true() -> None:
    """use_web_search=True with no MCP IDs should still build a ToolAgent."""
    session_service = AsyncMock()
    message_repo = AsyncMock()
    message_repo.find_by_session.return_value = []
    message_repo.create_message.side_effect = [{"id": "m-user"}, {"id": "m-asst"}]

    chatbot_agent = AsyncMock()

    fake_web_tool = MagicMock(spec=BaseTool)
    tool_service = AsyncMock(spec=ToolService)
    tool_service.assemble_tools = AsyncMock(return_value=[fake_web_tool])

    fake_tool_agent = AsyncMock()
    fake_tool_agent.ainvoke.return_value = ChatOutput(
        content="web reply",
        session_id="session-1",
        message_id="",
        agent_type="tool",
    )

    with patch("app.services.chat_service.ToolAgent", return_value=fake_tool_agent):
        service = ChatService(
            session_service=session_service,
            message_repo=message_repo,
            chatbot_agent=chatbot_agent,
            rag_agent=AsyncMock(),
            vector_service=AsyncMock(has_context=AsyncMock(return_value=False)),
            tool_service=tool_service,
            llm=MagicMock(),
        )

        response = await service.chat(
            user_id="user-1",
            session_id="session-1",
            request=ChatRequest(message="hello", use_web_search=True),
        )

    assert response.content == "web reply"
    chatbot_agent.ainvoke.assert_not_called()
    tool_service.assemble_tools.assert_awaited_once_with(
        "user-1", [], True
    )


@pytest.mark.asyncio
async def test_chat_uses_chatbot_when_no_tools_and_no_context() -> None:
    """No tools (use_web_search=False, no MCP, no files) → ChatbotAgent."""
    session_service = AsyncMock()
    message_repo = AsyncMock()
    message_repo.find_by_session.return_value = []
    message_repo.create_message.side_effect = [{"id": "m-user"}, {"id": "m-asst"}]

    chatbot_agent = AsyncMock()
    chatbot_agent.ainvoke.return_value = ChatOutput(
        content="chatbot reply",
        session_id="session-1",
        message_id="",
        agent_type="chatbot",
    )

    tool_service = AsyncMock(spec=ToolService)
    tool_service.assemble_tools = AsyncMock(return_value=[])

    service = ChatService(
        session_service=session_service,
        message_repo=message_repo,
        chatbot_agent=chatbot_agent,
        rag_agent=AsyncMock(),
        vector_service=AsyncMock(has_context=AsyncMock(return_value=False)),
        tool_service=tool_service,
        llm=MagicMock(),
    )

    response = await service.chat(
        user_id="user-1",
        session_id="session-1",
        request=ChatRequest(message="hello", use_web_search=False),
    )

    assert response.content == "chatbot reply"
    chatbot_agent.ainvoke.assert_awaited_once()
