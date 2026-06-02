"""Tool constants and partitioning helpers for dedicated agents."""

from dataclasses import dataclass

from langchain_core.tools import BaseTool

SEND_AI_MESSAGE_TOOL_NAME = "sendAiMessage"
SEND_TEXT_MESSAGE_TOOL_NAME = "sendTextMessage"
CREATE_AI_POST_COMMENT_TOOL_NAME = "createAiPostComment"

SOCIAL_MENTION_TRIGGER_TYPE = "MENTION_IN_COMMENT"
SOCIAL_POST_COMMAND_TRIGGER_TYPE = "POST_COMMAND"

PUBLISH_REQUIRED_FIELDS = {"postId", "content", "triggerType"}


@dataclass(frozen=True)
class ToolPartition:
    """Selected delivery tool plus tools safe for a ReAct research loop."""

    delivery_tool: BaseTool | None
    research_tools: list[BaseTool]


def partition_group_tools(tools: list[BaseTool]) -> ToolPartition:
    """Separate deterministic group-message delivery from research tools."""
    delivery_tool: BaseTool | None = None
    research_tools: list[BaseTool] = []

    for tool in tools:
        if tool.name == SEND_AI_MESSAGE_TOOL_NAME:
            delivery_tool = tool
        elif tool.name == SEND_TEXT_MESSAGE_TOOL_NAME:
            continue
        else:
            research_tools.append(tool)

    return ToolPartition(delivery_tool=delivery_tool, research_tools=research_tools)


def partition_social_tools(tools: list[BaseTool]) -> ToolPartition:
    """Separate deterministic social-comment publishing from research tools."""
    delivery_tool: BaseTool | None = None
    research_tools: list[BaseTool] = []

    for tool in tools:
        if is_publish_comment_tool(tool):
            delivery_tool = tool
        else:
            research_tools.append(tool)

    return ToolPartition(delivery_tool=delivery_tool, research_tools=research_tools)


def is_publish_comment_tool(tool: BaseTool) -> bool:
    """Return True when a tool can publish an AI-generated social comment."""
    if tool.name == CREATE_AI_POST_COMMENT_TOOL_NAME:
        return True

    input_fields = _tool_input_fields(tool)
    if PUBLISH_REQUIRED_FIELDS.issubset(input_fields):
        return True

    description = (getattr(tool, "description", "") or "").lower()
    return "ai-generated comment" in description and "social post" in description


def _tool_input_fields(tool: BaseTool) -> set[str]:
    args_schema = getattr(tool, "args_schema", None)
    if args_schema is None:
        return set()

    fields = getattr(args_schema, "model_fields", None)
    if isinstance(fields, dict):
        return set(fields.keys())
    return set()
