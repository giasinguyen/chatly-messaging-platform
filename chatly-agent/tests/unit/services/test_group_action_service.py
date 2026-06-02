from datetime import datetime

import pytest
from langchain_core.tools import BaseTool

from app.services.group_action_service import (
    LOCAL_TIMEZONE,
    handle_explicit_group_action,
)


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
async def test_handle_explicit_reminder_creates_after_duplicate_check() -> None:
    list_tool = RecordingTool(name="listGroupReminders", calls=[])
    create_tool = RecordingTool(name="createGroupReminder", calls=[])

    result = await handle_explicit_group_action(
        tools=[list_tool, create_tool],
        message="@AI ngày mai có hẹn hãy tạo lịch nhắc hẹn đi ăn tối lúc 8h",
        conversation_id="conversation-1",
        now=datetime(2026, 6, 3, 9, 0, tzinfo=LOCAL_TIMEZONE),
    )

    assert result is not None
    assert result.action_name == "createGroupReminder"
    assert "Ăn tối" in result.content
    assert list_tool.calls == [{"conversationId": "conversation-1"}]
    assert create_tool.calls == [
        {
            "conversationId": "conversation-1",
            "title": "Ăn tối",
            "description": None,
            "remindAt": "2026-06-04T13:00:00Z",
        }
    ]


@pytest.mark.asyncio
async def test_handle_explicit_poll_creates_poll_when_options_are_present() -> None:
    create_tool = RecordingTool(name="createGroupPoll", calls=[])

    result = await handle_explicit_group_action(
        tools=[create_tool],
        message="@AI tạo poll ăn gì tối nay: phở, bún bò, cơm tấm",
        conversation_id="conversation-1",
        now=datetime(2026, 6, 3, 9, 0, tzinfo=LOCAL_TIMEZONE),
    )

    assert result is not None
    assert result.action_name == "createGroupPoll"
    assert create_tool.calls == [
        {
            "conversationId": "conversation-1",
            "question": "ăn gì tối nay",
            "options": ["phở", "bún bò", "cơm tấm"],
            "multipleChoice": False,
        }
    ]


@pytest.mark.asyncio
async def test_handle_explicit_poll_creates_poll_from_labelled_options() -> None:
    create_tool = RecordingTool(name="createGroupPoll", calls=[])

    result = await handle_explicit_group_action(
        tools=[create_tool],
        message='@AI tạo cuộc bình chọn: "Chủ nhật đi đâu?" A) Đi nhậu B) Đi spa',
        conversation_id="conversation-1",
        now=datetime(2026, 6, 3, 9, 0, tzinfo=LOCAL_TIMEZONE),
    )

    assert result is not None
    assert result.action_name == "createGroupPoll"
    assert create_tool.calls == [
        {
            "conversationId": "conversation-1",
            "question": "Chủ nhật đi đâu?",
            "options": ["Đi nhậu", "Đi spa"],
            "multipleChoice": False,
        }
    ]


@pytest.mark.asyncio
async def test_handle_explicit_poll_creates_yes_no_poll() -> None:
    create_tool = RecordingTool(name="createGroupPoll", calls=[])

    result = await handle_explicit_group_action(
        tools=[create_tool],
        message="@AI tạo poll thứ bảy đi quẩy ở bar hay không",
        conversation_id="conversation-1",
        now=datetime(2026, 6, 3, 9, 0, tzinfo=LOCAL_TIMEZONE),
    )

    assert result is not None
    assert result.action_name == "createGroupPoll"
    assert create_tool.calls == [
        {
            "conversationId": "conversation-1",
            "question": "thứ bảy đi quẩy ở bar",
            "options": ["Có", "Không"],
            "multipleChoice": False,
        }
    ]


@pytest.mark.asyncio
async def test_handle_explicit_poll_creates_binary_choice_poll() -> None:
    create_tool = RecordingTool(name="createGroupPoll", calls=[])

    result = await handle_explicit_group_action(
        tools=[create_tool],
        message="@AI tạo poll chọn tối nay chơi ke hay chơi đá",
        conversation_id="conversation-1",
        now=datetime(2026, 6, 3, 9, 0, tzinfo=LOCAL_TIMEZONE),
    )

    assert result is not None
    assert result.action_name == "createGroupPoll"
    assert create_tool.calls == [
        {
            "conversationId": "conversation-1",
            "question": "chọn tối nay",
            "options": ["Chơi ke", "Chơi đá"],
            "multipleChoice": False,
        }
    ]


@pytest.mark.asyncio
async def test_handle_explicit_reminder_creates_for_tonight() -> None:
    list_tool = RecordingTool(name="listGroupReminders", calls=[])
    create_tool = RecordingTool(name="createGroupReminder", calls=[])

    result = await handle_explicit_group_action(
        tools=[list_tool, create_tool],
        message="@AI tạo nhắc hẹn đi bay tối nay 10h",
        conversation_id="conversation-1",
        now=datetime(2026, 6, 3, 9, 0, tzinfo=LOCAL_TIMEZONE),
    )

    assert result is not None
    assert result.action_name == "createGroupReminder"
    assert create_tool.calls == [
        {
            "conversationId": "conversation-1",
            "title": "Bay",
            "description": None,
            "remindAt": "2026-06-03T15:00:00Z",
        }
    ]


@pytest.mark.asyncio
async def test_handle_explicit_reminder_skips_when_time_is_missing() -> None:
    create_tool = RecordingTool(name="createGroupReminder", calls=[])

    result = await handle_explicit_group_action(
        tools=[create_tool],
        message="@AI nhắc hẹn đi ăn tối",
        conversation_id="conversation-1",
        now=datetime(2026, 6, 3, 9, 0, tzinfo=LOCAL_TIMEZONE),
    )

    assert result is None
    assert create_tool.calls == []
