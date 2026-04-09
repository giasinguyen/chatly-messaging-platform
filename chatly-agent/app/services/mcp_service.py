"""MCP client (JSON-RPC over HTTP) and MCP server management service."""
import logging
from datetime import datetime, timezone
from typing import Any

import httpx

from app.exceptions import MCPConnectionError, MCPServerNotFoundError
from app.repositories.mcp_repo import MCPRepository

logger = logging.getLogger(__name__)

# JSON-RPC 2.0 method names used by MCP protocol
_METHOD_LIST_TOOLS = "tools/list"
_METHOD_CALL_TOOL = "tools/call"


class MCPClient:
    """Async JSON-RPC 2.0 client for a single MCP server endpoint."""

    def __init__(self, url: str, headers: dict[str, str] | None = None) -> None:
        self._url = url
        self._headers = headers or {}

    async def _rpc(self, method: str, params: dict[str, Any], req_id: int = 1) -> Any:
        """Send a JSON-RPC 2.0 request and return the *result* field."""
        payload = {
            "jsonrpc": "2.0",
            "id": req_id,
            "method": method,
            "params": params,
        }
        try:
            async with httpx.AsyncClient(headers=self._headers, timeout=10.0) as client:
                response = await client.post(self._url, json=payload)
                response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise MCPConnectionError(
                f"MCP server returned HTTP {exc.response.status_code}: {self._url}"
            ) from exc
        except httpx.RequestError as exc:
            raise MCPConnectionError(
                f"Cannot reach MCP server at {self._url}: {exc}"
            ) from exc

        data = response.json()
        if "error" in data:
            raise MCPConnectionError(
                f"MCP JSON-RPC error from {self._url}: {data['error']}"
            )
        return data.get("result")

    async def list_tools(self) -> list[dict[str, Any]]:
        """Fetch the list of tools exposed by this MCP server."""
        result = await self._rpc(_METHOD_LIST_TOOLS, {})
        return result.get("tools", [])

    async def call_tool(self, tool_name: str, arguments: dict[str, Any]) -> str:
        """Invoke a tool and return its text output."""
        result = await self._rpc(
            _METHOD_CALL_TOOL,
            {"name": tool_name, "arguments": arguments},
            req_id=2,
        )
        # MCP returns content as a list of typed parts; concatenate text parts.
        content = result.get("content", [])
        return "\n".join(
            part["text"] for part in content if part.get("type") == "text"
        )


class MCPService:
    """Business logic for managing user-owned MCP server configurations."""

    def __init__(self, mcp_repo: MCPRepository) -> None:
        self._repo = mcp_repo

    def _make_client(self, record: dict[str, Any]) -> MCPClient:
        return MCPClient(url=str(record["url"]), headers=record.get("headers", {}))

    async def register_server(
        self,
        user_id: str,
        name: str,
        url: str,
        headers: dict[str, str],
    ) -> dict[str, Any]:
        """Verify connectivity then persist the server record."""
        client = MCPClient(url=url, headers=headers)
        # Raises MCPConnectionError if the server is unreachable.
        await client.list_tools()

        doc = {
            "user_id": user_id,
            "name": name,
            "url": url,
            "headers": headers,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
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
        await self._repo.delete_by_id(server_id)

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
                    all_tools.append({**tool, "server_id": record["id"], "server_url": record["url"], "server_headers": record.get("headers", {})})
            except MCPConnectionError:
                logger.warning(
                    "Skipping unreachable MCP server %s (%s)",
                    record.get("name"),
                    record.get("url"),
                )
        return all_tools
