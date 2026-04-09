"""Tool assembly service — aggregates MCP tools and web search per request."""
import logging
from typing import Any

from langchain_core.tools import BaseTool

from app.services.mcp_service import MCPClient, MCPService
from app.tools.mcp_tool import create_mcp_tool
from app.tools.web_search_tool import create_web_search_tool, web_search_available

logger = logging.getLogger(__name__)


class ToolService:
    """Assemble the full tool list for a single chat request."""

    def __init__(self, mcp_service: MCPService | None = None) -> None:
        self._mcp_service = mcp_service

    async def assemble_tools(
        self,
        user_id: str,
        mcp_server_ids: list[str],
        use_web_search: bool,
    ) -> list[BaseTool]:
        """
        Build the tool list for one request.

        Priority / order:
        1. MCP tools (one MCPClient per unique server URL).
        2. Tavily web search (only when available and requested).

        Returns an empty list when no tools are configured.
        """
        tools: list[BaseTool] = []

        # ── MCP tools ─────────────────────────────────────────────────────────
        if self._mcp_service and mcp_server_ids:
            tool_infos: list[dict[str, Any]] = (
                await self._mcp_service.get_tools_for_servers(user_id, mcp_server_ids)
            )
            # Share one MCPClient per server URL.
            clients: dict[str, MCPClient] = {}
            for info in tool_infos:
                server_url: str = info["server_url"]
                if server_url not in clients:
                    clients[server_url] = MCPClient(
                        url=server_url,
                        headers=info.get("server_headers", {}),
                    )
                tools.append(
                    create_mcp_tool(info, call_tool=clients[server_url].call_tool)
                )

        # ── Web search tool ────────────────────────────────────────────────────
        if use_web_search:
            if web_search_available():
                tools.append(create_web_search_tool())
            else:
                logger.warning(
                    "use_web_search=True but TAVILY_API_KEY is not configured — skipping"
                )

        return tools
