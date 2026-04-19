"""MCP client (SSE transport) and MCP server management service."""
import logging
from datetime import UTC, datetime
from typing import Any

import httpx

from app.exceptions import MCPConnectionError, MCPServerNotFoundError
from app.repositories.mcp_repo import MCPRepository

logger = logging.getLogger(__name__)

_HTTP_TIMEOUT = 10.0


class MCPClient:
    """Async MCP client supporting two transports:

    * ``"http"``  — Raw JSON-RPC 2.0 over HTTP POST (used by custom user
      servers such as the bundled math / text demo servers).  A single POST
      to *url* carries the JSON-RPC request; the response is plain JSON.

    * ``"sse"``   — Legacy SSE transport required by Spring AI 1.0.0
      (``srping-ai-starter-mcp-server-webmvc``).  The SDK opens a GET SSE
      stream first, receives a session-specific POST URL, then sends JSON-RPC
      messages over that URL.  **Only the built-in system MCP server (chatly-
      backend) uses this transport; custom user servers never should.**
    """

    def __init__(
        self,
        url: str,
        headers: dict[str, str] | None = None,
        transport: str = "http",
    ) -> None:
        self._url = url
        self._headers = headers or {}
        self._transport = transport

    # ------------------------------------------------------------------ #
    # Public API                                                           #
    # ------------------------------------------------------------------ #

    async def list_tools(self) -> list[dict[str, Any]]:
        """Fetch the list of tools exposed by this MCP server."""
        if self._transport == "sse":
            return await self._list_tools_sse()
        return await self._list_tools_http()

    async def call_tool(self, tool_name: str, arguments: dict[str, Any]) -> str:
        """Invoke a tool and return its text output."""
        if self._transport == "sse":
            return await self._call_tool_sse(tool_name, arguments)
        return await self._call_tool_http(tool_name, arguments)

    # ------------------------------------------------------------------ #
    # HTTP transport (raw JSON-RPC 2.0 POST)                             #
    # ------------------------------------------------------------------ #

    async def _list_tools_http(self) -> list[dict[str, Any]]:
        payload = {"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}
        try:
            async with httpx.AsyncClient(
                headers=self._headers, timeout=_HTTP_TIMEOUT
            ) as client:
                response = await client.post(self._url, json=payload)
                response.raise_for_status()
            data = response.json()
            return data.get("result", {}).get("tools", [])
        except MCPConnectionError:
            raise
        except Exception as exc:
            raise MCPConnectionError(
                f"HTTP MCP POST to {self._url} failed: {exc}"
            ) from exc

    async def _call_tool_http(self, tool_name: str, arguments: dict[str, Any]) -> str:
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {"name": tool_name, "arguments": arguments},
        }
        try:
            async with httpx.AsyncClient(
                headers=self._headers, timeout=_HTTP_TIMEOUT
            ) as client:
                response = await client.post(self._url, json=payload)
                response.raise_for_status()
            data = response.json()
            if "error" in data:
                raise MCPConnectionError(
                    f"MCP tool '{tool_name}' returned error: {data['error']}"
                )
            content = data.get("result", {}).get("content", [])
            return "\n".join(
                part["text"]
                for part in content
                if isinstance(part, dict) and "text" in part
            )
        except MCPConnectionError:
            raise
        except Exception as exc:
            raise MCPConnectionError(
                f"MCP tool call '{tool_name}' via {self._url} failed: {exc}"
            ) from exc

    # ------------------------------------------------------------------ #
    # SSE transport (Spring AI / MCP SDK sse_client)                     #
    # ------------------------------------------------------------------ #

    async def _list_tools_sse(self) -> list[dict[str, Any]]:
        from mcp import ClientSession
        from mcp.client.sse import sse_client

        try:
            async with sse_client(self._url, headers=self._headers) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()
                    result = await session.list_tools()
                    return [tool.model_dump() for tool in result.tools]
        except MCPConnectionError:
            raise
        except Exception as exc:
            raise MCPConnectionError(
                f"MCP SSE connection to {self._url} failed: {exc}"
            ) from exc

    async def _call_tool_sse(self, tool_name: str, arguments: dict[str, Any]) -> str:
        from mcp import ClientSession
        from mcp.client.sse import sse_client

        try:
            async with sse_client(self._url, headers=self._headers) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()
                    result = await session.call_tool(tool_name, arguments)
                    return "\n".join(
                        part.text
                        for part in result.content
                        if hasattr(part, "text") and part.text
                    )
        except MCPConnectionError:
            raise
        except Exception as exc:
            raise MCPConnectionError(
                f"MCP tool call '{tool_name}' via {self._url} failed: {exc}"
            ) from exc


class MCPService:
    """Business logic for managing user-owned MCP server configurations."""

    def __init__(self, mcp_repo: MCPRepository) -> None:
        self._repo = mcp_repo

    def _make_client(self, record: dict[str, Any]) -> MCPClient:
        return MCPClient(
            url=str(record["url"]),
            headers=record.get("headers", {}),
            transport=record.get("transport", "http"),
        )

    async def register_server(
        self,
        user_id: str,
        name: str,
        url: str,
        headers: dict[str, str],
        transport: str = "http",
    ) -> dict[str, Any]:
        """Verify connectivity then persist the server record."""
        client = MCPClient(url=url, headers=headers, transport=transport)
        # Raises MCPConnectionError if the server is unreachable.
        await client.list_tools()

        doc = {
            "user_id": user_id,
            "name": name,
            "url": url,
            "headers": headers,
            "transport": transport,
            "is_active": True,
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC),
        }
        return await self._repo.create(doc)

    async def list_servers(self, user_id: str) -> list[dict[str, Any]]:
        """Return all MCP servers owned by *user_id*."""
        return await self._repo.find_by_user(user_id)

    async def get_server(self, user_id: str, server_id: str) -> dict[str, Any]:
        """Return one server, raising MCPServerNotFoundError if absent."""
        record = await self._repo.find_by_user_and_id(user_id, server_id)
        if record is None:
            raise MCPServerNotFoundError(f"MCP server {server_id!r} not found")
        return record

    async def delete_server(self, user_id: str, server_id: str) -> None:
        """Delete a server record, raising MCPServerNotFoundError if absent."""
        record = await self._repo.find_by_user_and_id(user_id, server_id)
        if record is None:
            raise MCPServerNotFoundError(f"MCP server {server_id!r} not found")
        await self._repo.delete(server_id)

    async def toggle_server(
        self, user_id: str, server_id: str, is_active: bool
    ) -> dict[str, Any]:
        """Update the is_active flag, raising MCPServerNotFoundError if absent."""
        updated = await self._repo.update_active(user_id, server_id, is_active)
        if updated is None:
            raise MCPServerNotFoundError(f"MCP server {server_id!r} not found")
        return updated

    async def get_live_tools(
        self, user_id: str, server_id: str
    ) -> list[dict[str, Any]]:
        """Live-fetch tools from a single server."""
        record = await self.get_server(user_id, server_id)
        client = self._make_client(record)
        return await client.list_tools()

    async def get_tools_for_servers(
        self, user_id: str, server_ids: list[str]
    ) -> list[dict[str, Any]]:
        """
        Aggregate tools from multiple active servers.

        Servers that cannot be reached are silently skipped so that a single
        failing server does not break the whole request.
        """
        records = await self._repo.find_active_by_ids(user_id, server_ids)
        all_tools: list[dict[str, Any]] = []
        for record in records:
            client = self._make_client(record)
            try:
                tools = await client.list_tools()
                for tool in tools:
                    all_tools.append({
                        **tool,
                        "server_id": record["id"],
                        "server_url": record["url"],
                        "server_headers": record.get("headers", {}),
                        "server_transport": record.get("transport", "http"),
                    })
            except MCPConnectionError:
                logger.warning(
                    "Skipping unreachable MCP server %s (%s)",
                    record.get("name"),
                    record.get("url"),
                )
        return all_tools
