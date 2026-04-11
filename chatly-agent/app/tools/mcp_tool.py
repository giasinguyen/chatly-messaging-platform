"""Dynamic LangChain tool wrapper for MCP server tools."""
from collections.abc import Callable, Coroutine
from typing import Any

from langchain_core.tools import BaseTool
from pydantic import BaseModel, create_model


def create_mcp_tool(
    tool_info: dict[str, Any],
    call_tool: Callable[[str, dict[str, Any]], Coroutine[Any, Any, str]],
) -> BaseTool:
    """
    Build a LangChain BaseTool dynamically from an MCP tool definition.

    Args:
        tool_info:  Dict with keys ``name``, ``description``, ``inputSchema``.
                    Optionally ``server_id``, ``server_url``, ``server_headers``.
        call_tool:  Async callable ``(tool_name, arguments) → str`` that delegates
                    to the MCPClient for the correct server.
    """
    tool_name: str = tool_info["name"]
    tool_description: str = tool_info.get("description", "")
    input_schema: dict[str, Any] = tool_info.get("inputSchema", {})

    # Determine the first required key for raw-string input fallback.
    required_keys: list[str] = input_schema.get("required", [])
    first_key: str | None = required_keys[0] if required_keys else None

    # Build a minimal Pydantic args schema so LangChain can validate inputs.
    properties: dict[str, Any] = input_schema.get("properties", {})
    field_definitions: dict[str, Any] = {
        key: (str, ...) for key in properties
    }
    ArgsSchema: type[BaseModel] = create_model(  # noqa: N806
        f"{tool_name}Args", **field_definitions
    )

    class _DynamicMCPTool(BaseTool):
        name: str = tool_name
        description: str = tool_description
        args_schema: type[BaseModel] = ArgsSchema

        def _run(self, *args: Any, **kwargs: Any) -> str:  # pragma: no cover
            raise NotImplementedError("Use async arun")

        async def _arun(self, *args: Any, **kwargs: Any) -> str:
            # LangChain may pass the parsed model as a single positional dict arg.
            if args and isinstance(args[0], dict):
                arguments = args[0]
            elif args and isinstance(args[0], str) and first_key:
                arguments = {first_key: args[0]}
            else:
                arguments = kwargs
            return await call_tool(tool_name, arguments)

    return _DynamicMCPTool()
