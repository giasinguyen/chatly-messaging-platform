"""MCP client (SSE transport) and MCP server management service."""
import logging
from datetime import UTC, datetime
from typing import Any

from app.exceptions import MCPConnectionError, MCPServerNotFoundError
from app.repositories.mcp_repo import MCPRepository

logger = logging.getLogger(__name__)


class MCPClient:
    """Async MCP client using the SSE transport (MCP SDK 0.10 / Spring AI 1.0.0).

    Spring AI 1.0.0 ``spring-ai-starter-mcp-server-webmvc`` registers two
    routes via ``WebMvcSseServerTransportProvider``:

    * ``GET  {sse-endpoint}``          — client opens an SSE stream; server
      immediately emits an ``endpoint`` event whose data is the
      session-specific POST URL.
    * ``POST {sse-message-endpoint}``  — client sends JSON-RPC messages; the
      server writes responses back over the SSE stream.

    The ``mcp`` Python package's :func:`mcp.client.sse.sse_client` handles
    this handshake automatically.  The ``url`` parameter must be the **SSE
    endpoint** (e.g. ``http://host:8080/api/ai/mcp/sse``).

    A fresh SSE session is opened for every :meth:`list_tools` or
    :meth:`call_tool` invocation so that each request is fully stateless.
    """

    def __init__(self, url: str, headers: dict[str, str] | None = None) -> None:
        self._sse_url = url
        self._headers = headers or {}

    async def list_tools(self) -> list[dict[str, Any]]:
        """Fetch the list of tools exposed by this MCP server."""
        from mcp import ClientSession
        from mcp.client.sse import sse_client

        try:
            async with sse_client(self._sse_url, headers=self._headers) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()
                    result = await session.list_tools()
                    return [tool.model_dump() for tool in result.tools]
        except MCPConnectionError:
            raise
        except Exception as exc:
            raise MCPConnectionError(
                f"MCP SSE connection to {self._sse_url} failed: {exc}"
            ) from exc

    async def call_tool(self, tool_name: str, arguments: dict[str, Any]) -> str:
        """Invoke a tool and return its text output."""
        from mcp import ClientSession
        from mcp.client.sse import sse_client

        try:
            async with sse_client(self._sse_url, headers=self._headers) as (read, write):
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
                f"MCP tool call '{tool_name}' via {self._sse_url} failed: {exc}"
            ) from exc


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
                    all_tools.append({**tool, "server_id": record["id"], "server_url": record["url"], "server_headers": record.get("headers", {})})
            except MCPConnectionError:
                logger.warning(
                    "Skipping unreachable MCP server %s (%s)",
                    record.get("name"),
                    record.get("url"),
                )
        return all_tools
