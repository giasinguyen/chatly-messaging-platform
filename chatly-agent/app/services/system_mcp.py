"""System-provided (default) MCP server integration.

System MCPs are configured via environment variables and are NOT stored in
MongoDB.  They are therefore never exposed through the /mcp/servers/ endpoints
that manage user-owned servers.

Current system MCPs:
- chatly-backend  (CHATLY_BACKEND_MCP_URL)
  Authenticated with X-Internal-API-Key + X-User-Id so every tool call
  runs in the context of the requesting user.
"""
import asyncio
import logging
import time
from typing import Any

from app.config import settings
from app.exceptions import MCPConnectionError
from app.services.mcp_service import MCPClient

logger = logging.getLogger(__name__)

_BACKEND_SERVER_NAME = "chatly-backend"
_MAX_RETRIES = 3
_RETRY_BASE_DELAY_S = 1.0

_SKILL_URI_PREFIX = "chatly://skills/"
_SKILL_CACHE_TTL_S = 300.0  # 5 min — skills change only on backend redeploy
_SKILL_CACHE_KEY = "chatly-backend-skills"
_skill_cache: dict[str, tuple[str, float]] = {}
_skill_cache_lock = asyncio.Lock()


class SystemMCPService:
    """Provides tools from built-in system MCP servers.

    Returned tool dicts include ``server_url`` and ``server_headers`` so that
    :class:`~app.services.tool_service.ToolService` can build
    :class:`~app.services.mcp_service.MCPClient` instances using the same
    logic it uses for user-owned servers.
    """

    def _get_backend_client(self, user_id: str) -> MCPClient | None:
        """Return an authenticated MCPClient for the chatly-backend endpoint.

        Returns ``None`` when ``CHATLY_BACKEND_MCP_URL`` is not configured.
        """
        if not settings.chatly_backend_mcp_url:
            return None
        return MCPClient(
            url=settings.chatly_backend_mcp_url,
            headers={
                "X-Internal-API-Key": settings.internal_api_key,
                "X-User-Id": user_id,
            },
            transport="sse",
        )

    async def get_tools(self, user_id: str) -> list[dict[str, Any]]:
        """Fetch tools from all configured system MCPs for *user_id*.

        Retries up to ``_MAX_RETRIES`` times with exponential back-off before
        giving up.  An unreachable backend does not block the chat request.
        """
        client = self._get_backend_client(user_id)
        if client is None:
            logger.warning(
                "System MCP '%s' is not configured — set CHATLY_BACKEND_MCP_URL to enable backend tools",
                _BACKEND_SERVER_NAME,
            )
            return []

        logger.info(
            "Fetching tools from system MCP '%s' at %s for user_id=%s",
            _BACKEND_SERVER_NAME,
            settings.chatly_backend_mcp_url,
            user_id,
        )

        last_error: MCPConnectionError | None = None
        for attempt in range(1, _MAX_RETRIES + 1):
            try:
                raw_tools = await client.list_tools()
                logger.info(
                    "System MCP '%s' returned %d tool(s) for user_id=%s",
                    _BACKEND_SERVER_NAME,
                    len(raw_tools),
                    user_id,
                )
                return [
                    {
                        **tool,
                        "server_url": settings.chatly_backend_mcp_url,
                        "server_headers": {
                            "X-Internal-API-Key": settings.internal_api_key,
                            "X-User-Id": user_id,
                        },
                        "server_transport": "sse",
                    }
                    for tool in raw_tools
                ]
            except MCPConnectionError as exc:
                last_error = exc
                if attempt < _MAX_RETRIES:
                    delay = _RETRY_BASE_DELAY_S * (2 ** (attempt - 1))
                    logger.warning(
                        "System MCP '%s' attempt %d/%d failed (%s) — retrying in %.1fs",
                        _BACKEND_SERVER_NAME,
                        attempt,
                        _MAX_RETRIES,
                        exc,
                        delay,
                    )
                    await asyncio.sleep(delay)
                    # Fresh client resets the MCP session for the next attempt
                    client = self._get_backend_client(user_id)

        logger.warning(
            "System MCP '%s' unreachable after %d attempt(s) — skipping default tools. Last error: %s",
            _BACKEND_SERVER_NAME,
            _MAX_RETRIES,
            last_error,
        )
        return []

    async def get_skill_context(self, user_id: str) -> str:
        """Return concatenated skill resource content from chatly-backend.

        Uses a process-wide TTL cache keyed on ``_SKILL_CACHE_KEY`` — skill
        content is identical for all users and changes only on backend redeploy.
        """
        now = time.monotonic()
        cached = _skill_cache.get(_SKILL_CACHE_KEY)
        if cached is not None and now < cached[1]:
            return cached[0]

        async with _skill_cache_lock:
            # Double-checked locking: another coroutine may have populated the
            # cache while this one waited for the lock.
            cached = _skill_cache.get(_SKILL_CACHE_KEY)
            if cached is not None and now < cached[1]:
                return cached[0]

            content = await self._fetch_skill_resources(user_id)
            _skill_cache[_SKILL_CACHE_KEY] = (content, time.monotonic() + _SKILL_CACHE_TTL_S)
            logger.info(
                "Skill resource cache refreshed (%d chars, TTL=%.0fs)",
                len(content),
                _SKILL_CACHE_TTL_S,
            )
            return content

    async def _fetch_skill_resources(self, user_id: str) -> str:
        """Fetch and concatenate all chatly://skills/* resources from the backend."""
        client = self._get_backend_client(user_id)
        if client is None:
            return ""
        try:
            resources = await client.list_resources()
            skill_uris = [
                str(r.get("uri", ""))
                for r in resources
                if str(r.get("uri", "")).startswith(_SKILL_URI_PREFIX)
            ]
            if not skill_uris:
                logger.warning(
                    "No skill resources found on backend MCP (prefix=%s)",
                    _SKILL_URI_PREFIX,
                )
                return ""
            parts: list[str] = []
            for uri in skill_uris:
                text = await client.read_resource(uri)
                if text:
                    parts.append(text)
            return "\n\n---\n\n".join(parts)
        except Exception as exc:
            logger.warning("Failed to fetch skill resources from backend MCP: %s", exc)
            return ""

    def list_configured_servers(self) -> list[dict[str, Any]]:
        """Return metadata for each configured system MCP server.

        Used by the ``GET /mcp/defaults`` endpoint so callers can see which
        system MCPs are available without making live network requests.
        """
        servers: list[dict[str, Any]] = []
        if settings.chatly_backend_mcp_url:
            servers.append(
                {
                    "name": _BACKEND_SERVER_NAME,
                    "url": settings.chatly_backend_mcp_url,
                    "is_active": True,
                }
            )
        return servers
