import json
from collections.abc import AsyncIterator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.messages import AIMessageChunk, HumanMessage
from langchain_core.tools import BaseTool

from app.models.chat import ChatOutput, ChatRequest
from app.services import chat_service as chat_service_module
from app.services.chat_service import ChatService
from app.services.tool_service import ToolService


async def _iter_events(tokens: list[str]) -> AsyncIterator[dict]:
    """Yield on_chat_model_stream events for each token."""
    for token in tokens:
        chunk = AIMessageChunk(content=token)
        yield {"event": "on_chat_model_stream", "data": {"chunk": chunk}}


class RecordingTool(BaseTool):
    name: str
    description: str = ""
    calls: list[dict[str, object]]

    def _run(self, *args: object, **kwargs: object) -> str:
        raise NotImplementedError

    async def _arun(self, *args: object, **kwargs: object) -> str:
        self.calls.append(kwargs)
        return "{}"


@pytest.mark.asyncio
async def test_chat_verifies_ownership_before_agent_call() -> None:
    session_service = AsyncMock()
    message_repo = AsyncMock()
    message_repo.find_by_session.return_value = []
    message_repo.create_message.side_effect = [{"id": "m-user"}, {"id": "m-assistant"}]

    chatbot_agent = AsyncMock()
    chatbot_agent.agent_type = "chatbot"
    chatbot_agent.ainvoke.return_value = ChatOutput(
        content="reply",
        session_id="session-1",
        agent_type="chatbot",
    )

    service = ChatService(
        session_service=session_service,
        message_repo=message_repo,
        chatbot_agent=chatbot_agent,
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
    chatbot_agent.agent_type = "chatbot"
    chatbot_agent.ainvoke.return_value = ChatOutput(
        content="assistant output",
        session_id="session-1",
        agent_type="chatbot",
    )

    service = ChatService(
        session_service=session_service,
        message_repo=message_repo,
        chatbot_agent=chatbot_agent,
        vector_service=AsyncMock(has_context=AsyncMock(return_value=False)),
    )

    response = await service.chat(
        user_id="user-1",
        session_id="session-1",
        request=ChatRequest(message="hello"),
    )

    assert response.message_id == "m-assistant"
    assert response.agent_type == "chatbot"
    assert message_repo.create_message.await_count == 2


@pytest.mark.asyncio
async def test_group_assist_enables_web_search_by_default() -> None:
    message_repo = AsyncMock()
    message_repo.find_by_session.return_value = []
    message_repo.create_message.side_effect = [{"id": "m-user"}, {"id": "m-assistant"}]

    tool_service = AsyncMock(spec=ToolService)
    tool_service.assemble_tools = AsyncMock(return_value=[])
    fake_group_agent = AsyncMock()
    fake_group_agent.run.return_value = "group reply"

    with patch("app.services.chat_service.GroupAgent", return_value=fake_group_agent):
        service = ChatService(
            session_service=AsyncMock(),
            message_repo=message_repo,
            chatbot_agent=AsyncMock(),
            vector_service=AsyncMock(),
            tool_service=tool_service,
            llm=MagicMock(),
        )

        await service.run_group_assist(
            user_id="user-1",
            session_id="session-1",
            conversation_id="conversation-1",
            content="@ai check latest info",
        )

    tool_service.assemble_tools.assert_awaited_once_with("user-1", [], True)
    fake_group_agent.run.assert_awaited_once()


@pytest.mark.asyncio
async def test_group_assist_executes_clear_reminder_without_llm_confirmation() -> None:
    message_repo = AsyncMock()
    message_repo.find_by_session.return_value = []
    message_repo.create_message.side_effect = [{"id": "m-user"}, {"id": "m-assistant"}]

    list_tool = RecordingTool(name="listGroupReminders", calls=[])
    create_tool = RecordingTool(name="createGroupReminder", calls=[])
    send_tool = RecordingTool(name="sendAiMessage", calls=[])
    tool_service = AsyncMock(spec=ToolService)
    tool_service.assemble_tools = AsyncMock(
        return_value=[list_tool, create_tool, send_tool]
    )
    fake_group_agent = AsyncMock()

    with patch("app.services.chat_service.GroupAgent", return_value=fake_group_agent):
        service = ChatService(
            session_service=AsyncMock(),
            message_repo=message_repo,
            chatbot_agent=AsyncMock(),
            vector_service=AsyncMock(),
            tool_service=tool_service,
            llm=MagicMock(),
        )

        await service.run_group_assist(
            user_id="user-1",
            session_id="session-1",
            conversation_id="conversation-1",
            content="@AI hãy tạo lịch nhắc hẹn ngày mai đi ăn tối lúc 8h",
        )

    assert list_tool.calls == [{"conversationId": "conversation-1"}]
    assert create_tool.calls[0]["conversationId"] == "conversation-1"
    assert create_tool.calls[0]["title"] == "Ăn tối"
    assert send_tool.calls[0]["conversationId"] == "conversation-1"
    assert "Mình đã tạo nhắc hẹn" in send_tool.calls[0]["content"]
    fake_group_agent.run.assert_not_awaited()


@pytest.mark.asyncio
async def test_group_assist_executes_clear_poll_without_llm_confirmation() -> None:
    message_repo = AsyncMock()
    message_repo.find_by_session.return_value = []
    message_repo.create_message.side_effect = [{"id": "m-user"}, {"id": "m-assistant"}]

    create_tool = RecordingTool(name="createGroupPoll", calls=[])
    send_tool = RecordingTool(name="sendAiMessage", calls=[])
    tool_service = AsyncMock(spec=ToolService)
    tool_service.assemble_tools = AsyncMock(return_value=[create_tool, send_tool])
    fake_group_agent = AsyncMock()

    with patch("app.services.chat_service.GroupAgent", return_value=fake_group_agent):
        service = ChatService(
            session_service=AsyncMock(),
            message_repo=message_repo,
            chatbot_agent=AsyncMock(),
            vector_service=AsyncMock(),
            tool_service=tool_service,
            llm=MagicMock(),
        )

        await service.run_group_assist(
            user_id="user-1",
            session_id="session-1",
            conversation_id="conversation-1",
            content='@AI tạo cuộc bình chọn: "Chủ nhật đi đâu?" A) Đi nhậu B) Đi spa',
        )

    assert create_tool.calls == [
        {
            "conversationId": "conversation-1",
            "question": "Chủ nhật đi đâu?",
            "options": ["Đi nhậu", "Đi spa"],
            "multipleChoice": False,
        }
    ]
    assert send_tool.calls[0]["conversationId"] == "conversation-1"
    assert "Mình đã tạo poll" in send_tool.calls[0]["content"]
    fake_group_agent.run.assert_not_awaited()


@pytest.mark.asyncio
async def test_group_assist_executes_yes_no_poll_without_llm_confirmation() -> None:
    message_repo = AsyncMock()
    message_repo.find_by_session.return_value = []
    message_repo.create_message.side_effect = [{"id": "m-user"}, {"id": "m-assistant"}]

    create_tool = RecordingTool(name="createGroupPoll", calls=[])
    send_tool = RecordingTool(name="sendAiMessage", calls=[])
    tool_service = AsyncMock(spec=ToolService)
    tool_service.assemble_tools = AsyncMock(return_value=[create_tool, send_tool])
    fake_group_agent = AsyncMock()

    with patch("app.services.chat_service.GroupAgent", return_value=fake_group_agent):
        service = ChatService(
            session_service=AsyncMock(),
            message_repo=message_repo,
            chatbot_agent=AsyncMock(),
            vector_service=AsyncMock(),
            tool_service=tool_service,
            llm=MagicMock(),
        )

        await service.run_group_assist(
            user_id="user-1",
            session_id="session-1",
            conversation_id="conversation-1",
            content="@AI tạo poll thứ bảy đi quẩy ở bar hay không",
        )

    assert create_tool.calls == [
        {
            "conversationId": "conversation-1",
            "question": "thứ bảy đi quẩy ở bar",
            "options": ["Có", "Không"],
            "multipleChoice": False,
        }
    ]
    assert send_tool.calls[0]["conversationId"] == "conversation-1"
    fake_group_agent.run.assert_not_awaited()


@pytest.mark.asyncio
async def test_group_assist_executes_binary_poll_without_llm_confirmation() -> None:
    message_repo = AsyncMock()
    message_repo.find_by_session.return_value = []
    message_repo.create_message.side_effect = [{"id": "m-user"}, {"id": "m-assistant"}]

    create_tool = RecordingTool(name="createGroupPoll", calls=[])
    send_tool = RecordingTool(name="sendAiMessage", calls=[])
    tool_service = AsyncMock(spec=ToolService)
    tool_service.assemble_tools = AsyncMock(return_value=[create_tool, send_tool])
    fake_group_agent = AsyncMock()

    with patch("app.services.chat_service.GroupAgent", return_value=fake_group_agent):
        service = ChatService(
            session_service=AsyncMock(),
            message_repo=message_repo,
            chatbot_agent=AsyncMock(),
            vector_service=AsyncMock(),
            tool_service=tool_service,
            llm=MagicMock(),
        )

        await service.run_group_assist(
            user_id="user-1",
            session_id="session-1",
            conversation_id="conversation-1",
            content="@AI tạo poll chọn tối nay chơi ke hay chơi đá",
        )

    assert create_tool.calls == [
        {
            "conversationId": "conversation-1",
            "question": "chọn tối nay",
            "options": ["Chơi ke", "Chơi đá"],
            "multipleChoice": False,
        }
    ]
    assert send_tool.calls[0]["conversationId"] == "conversation-1"
    fake_group_agent.run.assert_not_awaited()


@pytest.mark.asyncio
async def test_group_assist_executes_tonight_reminder_without_llm_confirmation() -> None:
    message_repo = AsyncMock()
    message_repo.find_by_session.return_value = []
    message_repo.create_message.side_effect = [{"id": "m-user"}, {"id": "m-assistant"}]

    list_tool = RecordingTool(name="listGroupReminders", calls=[])
    create_tool = RecordingTool(name="createGroupReminder", calls=[])
    send_tool = RecordingTool(name="sendAiMessage", calls=[])
    tool_service = AsyncMock(spec=ToolService)
    tool_service.assemble_tools = AsyncMock(
        return_value=[list_tool, create_tool, send_tool]
    )
    fake_group_agent = AsyncMock()

    with patch("app.services.chat_service.GroupAgent", return_value=fake_group_agent):
        service = ChatService(
            session_service=AsyncMock(),
            message_repo=message_repo,
            chatbot_agent=AsyncMock(),
            vector_service=AsyncMock(),
            tool_service=tool_service,
            llm=MagicMock(),
        )

        await service.run_group_assist(
            user_id="user-1",
            session_id="session-1",
            conversation_id="conversation-1",
            content="@AI tạo nhắc hẹn đi bay tối nay 10h",
        )

    assert list_tool.calls == [{"conversationId": "conversation-1"}]
    assert create_tool.calls[0]["conversationId"] == "conversation-1"
    assert create_tool.calls[0]["title"] == "Bay"
    assert send_tool.calls[0]["conversationId"] == "conversation-1"
    fake_group_agent.run.assert_not_awaited()


@pytest.mark.asyncio
async def test_chat_executes_clear_group_poll_without_unified_agent() -> None:
    session_service = AsyncMock()
    session_service.get_session.return_value = {
        "context_conversation_id": "conversation-1"
    }
    message_repo = AsyncMock()
    message_repo.find_by_session.return_value = []
    message_repo.create_message.side_effect = [{"id": "m-user"}, {"id": "m-assistant"}]

    create_tool = RecordingTool(name="createGroupPoll", calls=[])
    tool_service = AsyncMock(spec=ToolService)
    tool_service.assemble_tools = AsyncMock(return_value=[create_tool])
    vector_service = AsyncMock(has_context=AsyncMock(return_value=False))
    fake_unified_agent = AsyncMock()

    with patch("app.services.chat_service.UnifiedAgent", return_value=fake_unified_agent):
        service = ChatService(
            session_service=session_service,
            message_repo=message_repo,
            chatbot_agent=AsyncMock(),
            vector_service=vector_service,
            tool_service=tool_service,
            llm=MagicMock(),
        )

        response = await service.chat(
            user_id="user-1",
            session_id="session-1",
            request=ChatRequest(
                message="@AI tạo poll ăn gì tối nay: phở, bún bò, cơm tấm"
            ),
        )

    assert response.agent_type == "group_action"
    assert create_tool.calls == [
        {
            "conversationId": "conversation-1",
            "question": "ăn gì tối nay",
            "options": ["phở", "bún bò", "cơm tấm"],
            "multipleChoice": False,
        }
    ]
    fake_unified_agent.ainvoke.assert_not_awaited()


@pytest.mark.asyncio
async def test_social_mention_assist_enables_web_search_by_default() -> None:
    message_repo = AsyncMock()

    tool_service = AsyncMock(spec=ToolService)
    tool_service.assemble_tools = AsyncMock(return_value=[])
    fake_social_agent = AsyncMock()
    fake_social_agent.run_mention_in_comment.return_value = "social reply"

    with patch("app.services.chat_service.SocialAgent", return_value=fake_social_agent):
        service = ChatService(
            session_service=AsyncMock(),
            message_repo=message_repo,
            chatbot_agent=AsyncMock(),
            vector_service=AsyncMock(),
            tool_service=tool_service,
            llm=MagicMock(),
        )

        await service.run_social_mention_assist(
            user_id="user-1",
            post_id="post-1",
            comment_id="comment-1",
            content="@ai check latest info",
            mention_command="@ai",
            post_context="post",
            thread_context="thread",
        )

    tool_service.assemble_tools.assert_awaited_once_with("user-1", [], True)
    fake_social_agent.run_mention_in_comment.assert_awaited_once()
    message_repo.find_by_session.assert_not_awaited()
    message_repo.create_message.assert_not_awaited()


@pytest.mark.asyncio
async def test_social_post_command_assist_enables_web_search_by_default() -> None:
    message_repo = AsyncMock()

    tool_service = AsyncMock(spec=ToolService)
    tool_service.assemble_tools = AsyncMock(return_value=[])
    fake_social_agent = AsyncMock()
    fake_social_agent.run_post_command.return_value = "post reply"

    with patch("app.services.chat_service.SocialAgent", return_value=fake_social_agent):
        service = ChatService(
            session_service=AsyncMock(),
            message_repo=message_repo,
            chatbot_agent=AsyncMock(),
            vector_service=AsyncMock(),
            tool_service=tool_service,
            llm=MagicMock(),
        )

        await service.run_social_post_command_assist(
            user_id="user-1",
            post_id="post-1",
            command_content="@ai check latest info",
            post_context="post",
            thread_context="thread",
        )

    tool_service.assemble_tools.assert_awaited_once_with("user-1", [], True)
    fake_social_agent.run_post_command.assert_awaited_once()
    message_repo.find_by_session.assert_not_awaited()
    message_repo.create_message.assert_not_awaited()


@pytest.mark.asyncio
async def test_session_context_includes_local_datetime_for_group_assist() -> None:
    service = ChatService(
        session_service=AsyncMock(),
        message_repo=AsyncMock(),
        chatbot_agent=AsyncMock(),
        vector_service=AsyncMock(),
    )

    context = await service._build_session_context(
        user_id="user-1",
        session_id="session-1",
        context_conversation_id="conversation-1",
    )

    assert "Current local datetime:" in context
    assert "Asia/Ho_Chi_Minh" in context
    assert "ngày mai" in context
    assert "`conversation-1`" in context


@pytest.mark.asyncio
async def test_chat_sends_trimmed_recent_history_to_agent() -> None:
    session_service = AsyncMock()
    message_repo = AsyncMock()
    long_content = "x" * (chat_service_module.MAX_MODEL_HISTORY_MESSAGE_CHARS + 100)
    message_repo.find_by_session.return_value = [
        {"role": "user", "content": f"old-{index}"}
        for index in range(20)
    ] + [{"role": "user", "content": long_content}]
    message_repo.create_message.side_effect = [{"id": "m-user"}, {"id": "m-assistant"}]

    chatbot_agent = AsyncMock()
    chatbot_agent.agent_type = "chatbot"
    chatbot_agent.ainvoke.return_value = ChatOutput(
        content="reply",
        session_id="session-1",
        agent_type="chatbot",
    )

    service = ChatService(
        session_service=session_service,
        message_repo=message_repo,
        chatbot_agent=chatbot_agent,
        vector_service=AsyncMock(has_context=AsyncMock(return_value=False)),
    )

    await service.chat(
        user_id="user-1",
        session_id="session-1",
        request=ChatRequest(message="hello"),
    )

    chat_input = chatbot_agent.ainvoke.await_args.args[0]
    history = chat_input.history
    assert len(history) == chat_service_module.MAX_MODEL_HISTORY_MESSAGES
    assert isinstance(history[0], HumanMessage)
    assert history[0].content == "old-9"
    assert str(history[-1].content).endswith(
        chat_service_module.TRUNCATED_HISTORY_SUFFIX
    )
    assert len(str(history[-1].content)) == (
        chat_service_module.MAX_MODEL_HISTORY_MESSAGE_CHARS
    )


@pytest.mark.asyncio
async def test_stream_chat_yields_sse_and_persists_full_response() -> None:
    session_service = AsyncMock()
    message_repo = AsyncMock()
    message_repo.find_by_session.return_value = []
    message_repo.create_message.side_effect = [{"id": "m-user"}, {"id": "m-assistant"}]

    chatbot_agent = AsyncMock()
    chatbot_agent.agent_type = "chatbot"
    chatbot_agent.astream_events = MagicMock(return_value=_iter_events(["Hel", "lo"]))

    service = ChatService(
        session_service=session_service,
        message_repo=message_repo,
        chatbot_agent=chatbot_agent,
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

    token_chunks = [c for c in chunks if '"type": "token"' in c]
    done_chunks = [c for c in chunks if '"type": "done"' in c]
    assert len(token_chunks) == 2
    assert (
        json.loads(token_chunks[0].removeprefix("data: ").strip())["data"]["content"]
        == "Hel"
    )
    assert (
        json.loads(token_chunks[1].removeprefix("data: ").strip())["data"]["content"]
        == "lo"
    )
    assert len(done_chunks) == 1
    done_data = json.loads(done_chunks[0].removeprefix("data: ").strip())
    assert done_data["data"]["message_id"] == "m-assistant"
    assert done_data["data"]["agent_type"] == "chatbot"
    message_repo.create_message.assert_any_await(
        "session-1",
        "assistant",
        "Hello",
        attachments=None,
    )


@pytest.mark.asyncio
async def test_chat_uses_unified_agent_when_context_exists() -> None:
    session_service = AsyncMock()
    message_repo = AsyncMock()
    message_repo.find_by_session.return_value = []
    message_repo.create_message.side_effect = [{"id": "m-user"}, {"id": "m-assistant"}]

    chatbot_agent = AsyncMock()
    vector_service = AsyncMock()
    vector_service.has_context.return_value = True

    fake_unified_agent = AsyncMock()
    fake_unified_agent.agent_type = "unified"
    fake_unified_agent.ainvoke.return_value = ChatOutput(
        content="unified reply",
        session_id="session-1",
        agent_type="unified",
    )

    with patch(
        "app.services.chat_service.UnifiedAgent", return_value=fake_unified_agent
    ):
        service = ChatService(
            session_service=session_service,
            message_repo=message_repo,
            chatbot_agent=chatbot_agent,
            vector_service=vector_service,
            llm=MagicMock(),
        )

        response = await service.chat(
            user_id="user-1",
            session_id="session-1",
            request=ChatRequest(message="hello"),
        )

    assert response.content == "unified reply"
    assert response.agent_type == "unified"
    fake_unified_agent.ainvoke.assert_awaited_once()
    chatbot_agent.ainvoke.assert_not_called()


@pytest.mark.asyncio
async def test_chat_uses_unified_agent_when_mcp_server_ids_provided() -> None:
    """When tool_service returns tools, a UnifiedAgent is built and used."""
    session_service = AsyncMock()
    message_repo = AsyncMock()
    message_repo.find_by_session.return_value = []
    message_repo.create_message.side_effect = [{"id": "m-user"}, {"id": "m-asst"}]

    chatbot_agent = AsyncMock()
    vector_service = AsyncMock(has_context=AsyncMock(return_value=False))

    fake_tool = MagicMock(spec=BaseTool)
    tool_service = AsyncMock(spec=ToolService)
    tool_service.assemble_tools = AsyncMock(return_value=[fake_tool])

    fake_unified_agent = AsyncMock()
    fake_unified_agent.agent_type = "unified"
    fake_unified_agent.ainvoke.return_value = ChatOutput(
        content="tool reply",
        session_id="session-1",
        agent_type="unified",
    )

    with patch(
        "app.services.chat_service.UnifiedAgent", return_value=fake_unified_agent
    ):
        service = ChatService(
            session_service=session_service,
            message_repo=message_repo,
            chatbot_agent=chatbot_agent,
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


@pytest.mark.asyncio
async def test_chat_falls_back_to_unified_when_tool_service_returns_no_tools_but_has_context() -> (
    None
):
    """If tool_service returns no tools but session has context → UnifiedAgent with retriever."""
    session_service = AsyncMock()
    message_repo = AsyncMock()
    message_repo.find_by_session.return_value = []
    message_repo.create_message.side_effect = [{"id": "m-user"}, {"id": "m-asst"}]

    vector_service = AsyncMock(has_context=AsyncMock(return_value=True))
    tool_service = AsyncMock(spec=ToolService)
    tool_service.assemble_tools = AsyncMock(return_value=[])

    fake_unified_agent = AsyncMock()
    fake_unified_agent.agent_type = "unified"
    fake_unified_agent.ainvoke.return_value = ChatOutput(
        content="rag reply",
        session_id="session-1",
        agent_type="unified",
    )

    with patch(
        "app.services.chat_service.UnifiedAgent", return_value=fake_unified_agent
    ):
        service = ChatService(
            session_service=session_service,
            message_repo=message_repo,
            chatbot_agent=AsyncMock(),
            vector_service=vector_service,
            tool_service=tool_service,
            llm=MagicMock(),
        )

        response = await service.chat(
            user_id="user-1",
            session_id="session-1",
            request=ChatRequest(message="hello"),
        )

    assert response.content == "rag reply"
    fake_unified_agent.ainvoke.assert_awaited_once()


@pytest.mark.asyncio
async def test_chat_uses_unified_agent_when_use_web_search_is_true() -> None:
    """use_web_search=True with no MCP IDs should still build a UnifiedAgent."""
    session_service = AsyncMock()
    message_repo = AsyncMock()
    message_repo.find_by_session.return_value = []
    message_repo.create_message.side_effect = [{"id": "m-user"}, {"id": "m-asst"}]

    chatbot_agent = AsyncMock()

    fake_web_tool = MagicMock(spec=BaseTool)
    tool_service = AsyncMock(spec=ToolService)
    tool_service.assemble_tools = AsyncMock(return_value=[fake_web_tool])

    fake_unified_agent = AsyncMock()
    fake_unified_agent.agent_type = "unified"
    fake_unified_agent.ainvoke.return_value = ChatOutput(
        content="web reply",
        session_id="session-1",
        agent_type="unified",
    )

    with patch(
        "app.services.chat_service.UnifiedAgent", return_value=fake_unified_agent
    ):
        service = ChatService(
            session_service=session_service,
            message_repo=message_repo,
            chatbot_agent=chatbot_agent,
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
    tool_service.assemble_tools.assert_awaited_once_with("user-1", [], True)


@pytest.mark.asyncio
async def test_chat_uses_chatbot_when_no_tools_and_no_context() -> None:
    """No tools (use_web_search=False, no MCP, no files) → ChatbotAgent."""
    session_service = AsyncMock()
    message_repo = AsyncMock()
    message_repo.find_by_session.return_value = []
    message_repo.create_message.side_effect = [{"id": "m-user"}, {"id": "m-asst"}]

    chatbot_agent = AsyncMock()
    chatbot_agent.agent_type = "chatbot"
    chatbot_agent.ainvoke.return_value = ChatOutput(
        content="chatbot reply",
        session_id="session-1",
        agent_type="chatbot",
    )

    tool_service = AsyncMock(spec=ToolService)
    tool_service.assemble_tools = AsyncMock(return_value=[])

    service = ChatService(
        session_service=session_service,
        message_repo=message_repo,
        chatbot_agent=chatbot_agent,
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
    chatbot_agent.ainvoke.assert_not_called()
    rag_agent.ainvoke.assert_not_called()


@pytest.mark.asyncio
async def test_chat_falls_back_to_rag_when_tool_service_returns_no_tools() -> None:
    """If tool_service returns no tools, fall back to the normal agent selection."""
    session_service = AsyncMock()
    message_repo = AsyncMock()
    message_repo.find_by_session.return_value = []
    message_repo.create_message.side_effect = [{"id": "m-user"}, {"id": "m-asst"}]

    vector_service = AsyncMock(has_context=AsyncMock(return_value=True))
    tool_service = AsyncMock(spec=ToolService)
    tool_service.assemble_tools = AsyncMock(
        return_value=[]
    )  # empty → falls back to context check

    fake_unified_agent = AsyncMock()
    fake_unified_agent.agent_type = "unified"
    fake_unified_agent.ainvoke.return_value = ChatOutput(
        content="rag reply",
        session_id="session-1",
        agent_type="unified",
    )

    with patch(
        "app.services.chat_service.UnifiedAgent", return_value=fake_unified_agent
    ):
        service = ChatService(
            session_service=session_service,
            message_repo=message_repo,
            chatbot_agent=AsyncMock(),
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
    fake_unified_agent.ainvoke.assert_awaited_once()


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
    fake_tool_agent.agent_type = "unified"
    fake_tool_agent.ainvoke.return_value = ChatOutput(
        content="web reply",
        session_id="session-1",
        agent_type="unified",
    )

    with patch("app.services.chat_service.UnifiedAgent", return_value=fake_tool_agent):
        service = ChatService(
            session_service=session_service,
            message_repo=message_repo,
            chatbot_agent=chatbot_agent,
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
    tool_service.assemble_tools.assert_awaited_once_with("user-1", [], True)


@pytest.mark.asyncio
async def test_chat_uses_chatbot_when_no_tools_and_no_context() -> None:
    """No tools (use_web_search=False, no MCP, no files) → ChatbotAgent."""
    session_service = AsyncMock()
    message_repo = AsyncMock()
    message_repo.find_by_session.return_value = []
    message_repo.create_message.side_effect = [{"id": "m-user"}, {"id": "m-asst"}]

    chatbot_agent = AsyncMock()
    chatbot_agent.agent_type = "chatbot"
    chatbot_agent.ainvoke.return_value = ChatOutput(
        content="chatbot reply",
        session_id="session-1",
        agent_type="chatbot",
    )

    tool_service = AsyncMock(spec=ToolService)
    tool_service.assemble_tools = AsyncMock(return_value=[])

    service = ChatService(
        session_service=session_service,
        message_repo=message_repo,
        chatbot_agent=chatbot_agent,
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
