"""Deterministic handlers for explicit group write actions."""

import re
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from langchain_core.tools import BaseTool

CREATE_GROUP_POLL_TOOL_NAME = "createGroupPoll"
CREATE_GROUP_REMINDER_TOOL_NAME = "createGroupReminder"
LIST_GROUP_REMINDERS_TOOL_NAME = "listGroupReminders"
CREATE_GROUP_POLL_TOOL_ALIASES = ("createGroupPoll", "create_group_poll")
CREATE_GROUP_REMINDER_TOOL_ALIASES = (
    "createGroupReminder",
    "create_group_reminder",
)
LIST_GROUP_REMINDERS_TOOL_ALIASES = (
    "listGroupReminders",
    "list_group_reminders",
)

LOCAL_TIMEZONE = ZoneInfo("Asia/Ho_Chi_Minh")
POLL_OPTION_SPLIT_RE = re.compile(r"\s*(?:,|;|\||\n|/)\s*")
POLL_LABEL_RE = re.compile(r"(?:^|\s)(?:[a-z]|\d{1,2})[.)]\s+", re.IGNORECASE)
YES_NO_POLL_RE = re.compile(r"\b(hay|or)\s+(không|khong|not|no)\b", re.IGNORECASE)
BINARY_CHOICE_POLL_RE = re.compile(r"\s+(hay|or)\s+", re.IGNORECASE)
TIME_RE = re.compile(
    r"(?:lúc|luc|at)?\s*(\d{1,2})(?::(\d{2}))?\s*(h|giờ|gio|am|pm)?",
    re.IGNORECASE,
)

POLL_TRIGGERS = (
    "poll",
    "tạo poll",
    "tao poll",
    "create poll",
    "bình chọn",
    "binh chon",
    "cuộc bình chọn",
    "cuoc binh chon",
)
REMINDER_TRIGGERS = (
    "nhắc",
    "nhac",
    "nhắc hẹn",
    "nhac hen",
    "nhắc nhở",
    "nhac nho",
    "remind",
    "reminder",
    "tạo lịch",
    "tao lich",
)


@dataclass(frozen=True)
class GroupActionResult:
    """Result of an explicit group action executed through MCP tools."""

    content: str
    action_name: str


async def handle_explicit_group_action(
    tools: list[BaseTool],
    message: str,
    conversation_id: str,
    now: datetime | None = None,
) -> GroupActionResult | None:
    """Execute clear group poll/reminder commands without relying on the LLM."""
    current_time = now or datetime.now(LOCAL_TIMEZONE)

    poll = _parse_poll(message)
    poll_tool = _find_tool(tools, CREATE_GROUP_POLL_TOOL_ALIASES)
    if poll is not None and poll_tool is not None:
        question, options = poll
        await poll_tool.ainvoke(
            {
                "conversationId": conversation_id,
                "question": question,
                "options": options,
                "multipleChoice": False,
            }
        )
        return GroupActionResult(
            content=f"Mình đã tạo poll: {question} với {len(options)} lựa chọn.",
            action_name=CREATE_GROUP_POLL_TOOL_NAME,
        )
    if poll is not None:
        return GroupActionResult(
            content="Mình chưa tạo được poll lúc này, bạn thử lại sau nhé.",
            action_name=CREATE_GROUP_POLL_TOOL_NAME,
        )

    reminder = _parse_reminder(message, current_time)
    reminder_tool = _find_tool(tools, CREATE_GROUP_REMINDER_TOOL_ALIASES)
    if reminder is not None and reminder_tool is not None:
        title, remind_at = reminder
        list_tool = _find_tool(tools, LIST_GROUP_REMINDERS_TOOL_ALIASES)
        if list_tool is not None:
            await list_tool.ainvoke({"conversationId": conversation_id})
        await reminder_tool.ainvoke(
            {
                "conversationId": conversation_id,
                "title": title,
                "description": None,
                "remindAt": remind_at,
            }
        )
        return GroupActionResult(
            content=f"Mình đã tạo nhắc hẹn: {title}.",
            action_name=CREATE_GROUP_REMINDER_TOOL_NAME,
        )
    if reminder is not None:
        return GroupActionResult(
            content="Mình chưa tạo được nhắc hẹn lúc này, bạn thử lại sau nhé.",
            action_name=CREATE_GROUP_REMINDER_TOOL_NAME,
        )

    return None


def _find_tool(tools: list[BaseTool], names: tuple[str, ...]) -> BaseTool | None:
    for tool in tools:
        if getattr(tool, "name", None) in names:
            return tool
    return None


def _parse_poll(message: str) -> tuple[str, list[str]] | None:
    text = _strip_ai_mention(message)
    normalized = text.lower()
    if not any(trigger in normalized for trigger in POLL_TRIGGERS):
        return None
    labelled_poll = _parse_labelled_poll(text)
    if labelled_poll is not None:
        return labelled_poll
    yes_no_poll = _parse_yes_no_poll(text)
    if yes_no_poll is not None:
        return yes_no_poll
    binary_poll = _parse_binary_choice_poll(text)
    if binary_poll is not None:
        return binary_poll
    if ":" not in text:
        return None

    raw_question, raw_options = text.split(":", 1)
    question = _clean_poll_question(raw_question)
    options = [
        option.strip(" -•\t")
        for option in POLL_OPTION_SPLIT_RE.split(raw_options)
        if option.strip(" -•\t")
    ]
    if not question or len(options) < 2:
        return None
    return question, options


def _parse_yes_no_poll(text: str) -> tuple[str, list[str]] | None:
    match = YES_NO_POLL_RE.search(text)
    if match is None:
        return None

    question = _clean_poll_question(text[: match.start()])
    if not question:
        return None
    return question, ["Có", "Không"]


def _parse_binary_choice_poll(text: str) -> tuple[str, list[str]] | None:
    parts = BINARY_CHOICE_POLL_RE.split(text, maxsplit=1)
    if len(parts) != 3:
        return None

    left_text, _, right_text = parts
    left_words = _clean_poll_question(left_text).split()
    right_option = right_text.strip(" -:\"'“”.?!")
    if len(left_words) < 2 or not right_option:
        return None

    option_word_count = min(len(left_words), len(right_option.split()))
    left_option = " ".join(left_words[-option_word_count:])
    topic_words = left_words[:-option_word_count]
    if not topic_words or not left_option:
        return None

    question = " ".join(topic_words)
    return question, [_normalize_option(left_option), _normalize_option(right_option)]


def _parse_labelled_poll(text: str) -> tuple[str, list[str]] | None:
    matches = list(POLL_LABEL_RE.finditer(text))
    if len(matches) < 2:
        return None

    question = _clean_poll_question(text[: matches[0].start()])
    options: list[str] = []
    for index, match in enumerate(matches):
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        option = text[start:end].strip(" \n\t.-:;")
        if option:
            options.append(option)

    if not question or len(options) < 2:
        return None
    return question, options


def _parse_reminder(
    message: str,
    now: datetime,
) -> tuple[str, str] | None:
    text = _strip_ai_mention(message)
    normalized = text.lower()
    if not any(trigger in normalized for trigger in REMINDER_TRIGGERS):
        return None

    target_date = _parse_reminder_date(normalized, now)
    target_time = _parse_reminder_time(normalized)
    if target_date is None or target_time is None:
        return None

    target = datetime.combine(target_date, target_time, tzinfo=LOCAL_TIMEZONE)
    title = _clean_reminder_title(text)
    remind_at = target.astimezone(UTC).isoformat().replace("+00:00", "Z")
    return title, remind_at


def _parse_reminder_date(normalized: str, now: datetime) -> date | None:
    if "ngày mai" in normalized or "ngay mai" in normalized or "tomorrow" in normalized:
        return (now + timedelta(days=1)).date()
    if any(
        marker in normalized
        for marker in ("hôm nay", "hom nay", "tối nay", "toi nay", "today")
    ):
        return now.date()
    return None


def _parse_reminder_time(normalized: str) -> time | None:
    matches = list(TIME_RE.finditer(normalized))
    if not matches:
        return None
    hour_text, minute_text, suffix = matches[-1].groups()
    hour = int(hour_text)
    minute = int(minute_text or "0")
    suffix_text = (suffix or "").lower()

    if hour > 23 or minute > 59:
        return None
    if suffix_text == "pm" and hour < 12:
        hour += 12
    has_evening_context = any(
        marker in normalized for marker in ("tối", "toi", "ăn tối")
    )
    if has_evening_context and hour < 12:
        hour += 12
    if ("chiều" in normalized or "chieu" in normalized) and hour < 12:
        hour += 12
    return time(hour=hour, minute=minute)


def _clean_poll_question(raw_question: str) -> str:
    question = raw_question.strip()
    for trigger in sorted(POLL_TRIGGERS, key=len, reverse=True):
        question = re.sub(re.escape(trigger), "", question, flags=re.IGNORECASE)
    question = re.sub(
        r"^(hãy|hay|giúp mình|giup minh|tạo|tao|create)[\s:,-]+",
        "",
        question,
        flags=re.IGNORECASE,
    )
    return question.strip(" -:\"'“”") or "Bình chọn"


def _normalize_option(option: str) -> str:
    clean = re.sub(r"\s+", " ", option).strip(" -:\"'“”.?!")
    return clean[:1].upper() + clean[1:] if clean else clean


def _clean_reminder_title(text: str) -> str:
    title = text
    title = re.sub(
        r"\b(ai|hãy|hay|giúp mình|giup minh|please|tạo|tao|create|lịch|lich)\b",
        " ",
        title,
        flags=re.IGNORECASE,
    )
    title = re.sub(r"\b(có hẹn|co hen)\b", " ", title, flags=re.IGNORECASE)
    title = re.sub(
        r"\b(tạo lịch|tao lich|nhắc hẹn|nhac hen|nhắc nhở|nhac nho|"
        r"remind(?:er)?|nhắc|nhac)\b",
        " ",
        title,
        flags=re.IGNORECASE,
    )
    title = re.sub(
        r"\b(ngày mai|ngay mai|hôm nay|hom nay|tối nay|toi nay|tomorrow|today)\b",
        " ",
        title,
        flags=re.IGNORECASE,
    )
    title = re.sub(
        r"\b(?:lúc|luc|at)?\s*\d{1,2}(?::\d{2})?\s*(?:h|giờ|gio|am|pm)?\b",
        " ",
        title,
        flags=re.IGNORECASE,
    )
    title = re.sub(r"\s+", " ", title).strip(" .,-:")
    title = re.sub(r"^(đi|di)\s+", "", title, flags=re.IGNORECASE)
    return title[:1].upper() + title[1:] if title else "Nhắc hẹn"


def _strip_ai_mention(message: str) -> str:
    return re.sub(r"@[\w.-]+", " ", message).strip()
