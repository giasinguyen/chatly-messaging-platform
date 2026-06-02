"""Tool assembly service — aggregates MCP tools and web search per request."""

import logging
from typing import Any

from langchain_core.tools import BaseTool

from app.services.mcp_service import MCPClient, MCPService
from app.services.system_mcp import SystemMCPService
from app.tools.mcp_tool import create_mcp_tool
from app.tools.web_search_tool import create_web_search_tool, web_search_available

logger = logging.getLogger(__name__)


class ToolService:
    """Assemble the full tool list for a single chat request."""

    def __init__(
        self,
        mcp_service: MCPService | None = None,
        system_mcp_service: SystemMCPService | None = None,
    ) -> None:
        self._mcp_service = mcp_service
        self._system_mcp_service = system_mcp_service

    async def assemble_tools(
        self,
        user_id: str,
        mcp_server_ids: list[str],
        use_web_search: bool,
    ) -> list[BaseTool]:
        """
        Build the tool list for one request.

        Priority / order:
        1. System default MCP tools (chatly-backend) — always included when configured.
        2. User-registered MCP tools — included for each requested server ID.
        3. Tavily web search — only when available and requested.

        Returns an empty list when no tools are configured.
        """
        tools: list[BaseTool] = []
        all_mcp_infos: list[dict[str, Any]] = []
        system_infos: list[dict[str, Any]] = []
        user_infos: list[dict[str, Any]] = []

        # ── System default MCP tools ───────────────────────────────────────────
        if self._system_mcp_service:
            system_infos = await self._system_mcp_service.get_tools(user_id)
            all_mcp_infos.extend(system_infos)

        # ── User-registered MCP tools ──────────────────────────────────────────
        if self._mcp_service and mcp_server_ids:
            user_infos = await self._mcp_service.get_tools_for_servers(
                user_id, mcp_server_ids
            )
            all_mcp_infos.extend(user_infos)

        # Build LangChain tools — share one MCPClient per unique server URL.
        clients: dict[str, MCPClient] = {}
        for info in all_mcp_infos:
            server_url: str = info["server_url"]
            if server_url not in clients:
                clients[server_url] = MCPClient(
                    url=server_url,
                    headers=info.get("server_headers", {}),
                    transport=info.get("server_transport", "http"),
                )
            tools.append(create_mcp_tool(info, call_tool=clients[server_url].call_tool))

        # ── Web search tool ────────────────────────────────────────────────────
        if use_web_search:
            if web_search_available():
                tools.append(create_web_search_tool())
            else:
                logger.warning(
                    "use_web_search=True but TAVILY_API_KEY is not configured "
                    "— skipping"
                )

        logger.info(
            "Tool assembly complete for user_id=%s: system_mcp=%d "
            "user_mcp=%d web_search=%s total=%d",
            user_id,
            len(system_infos) if self._system_mcp_service else 0,
            len(user_infos) if self._mcp_service and mcp_server_ids else 0,
            use_web_search and web_search_available(),
            len(tools),
        )
        return tools
