"""Router for MCP server CRUD and tool introspection.

Endpoints in this router are split into two groups:

* ``/mcp/servers/*``  — manage *user-owned* (custom) MCP servers persisted in
  MongoDB.  The chatly-backend system MCP is intentionally excluded from these
  listings.

* ``/mcp/defaults``   — read-only view of the built-in system MCP servers
  (currently: chatly-backend).  No auth or write operations are available here.
"""
import logging

from fastapi import APIRouter, Depends, Response, status

from app.dependencies import get_mcp_service, get_request_context, get_system_mcp_service
from app.models.context import RequestContext
from app.models.mcp import MCPServerCreate, MCPServerResponse, MCPServerUpdate, MCPToolInfo, SystemMCPServerInfo
from app.services.mcp_service import MCPService
from app.services.system_mcp import SystemMCPService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/mcp", tags=["mcp"])


# ──────────────────────────────────────────────────────────────────────────────
# User-owned (custom) MCP servers
# ──────────────────────────────────────────────────────────────────────────────

@router.post(
    "/servers",
    response_model=MCPServerResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register MCP server",
    description="Verify live connectivity then persist the MCP server configuration.",
    responses={
        400: {"description": "Server unreachable or connection error"},
        401: {"description": "Unauthorized"},
    },
)
async def register_server(
    payload: MCPServerCreate,
    ctx: RequestContext = Depends(get_request_context),  # noqa: B008
    service: MCPService = Depends(get_mcp_service),  # noqa: B008
) -> MCPServerResponse:
    """Verify connectivity and register a new MCP server for the current user."""
    record = await service.register_server(
        user_id=ctx.user_id,
        name=payload.name,
        url=str(payload.url),
        headers=payload.headers,
    )
    return MCPServerResponse(**record)


@router.get(
    "/servers",
    response_model=list[MCPServerResponse],
    summary="List MCP servers",
    description=(
        "Return all **user-registered** MCP servers. "
        "Built-in system servers (chatly-backend) are excluded from this list."
    ),
    responses={401: {"description": "Unauthorized"}},
)
async def list_servers(
    ctx: RequestContext = Depends(get_request_context),  # noqa: B008
    service: MCPService = Depends(get_mcp_service),  # noqa: B008
) -> list[MCPServerResponse]:
    """List all user-owned MCP servers. System defaults are not included."""
    records = await service.list_servers(ctx.user_id)
    return [MCPServerResponse(**r) for r in records]


@router.get(
    "/servers/{server_id}",
    response_model=MCPServerResponse,
    summary="Get MCP server",
    description="Return details for one MCP server owned by the current user.",
    responses={401: {"description": "Unauthorized"}, 404: {"description": "Server not found"}},
)
async def get_server(
    server_id: str,
    ctx: RequestContext = Depends(get_request_context),  # noqa: B008
    service: MCPService = Depends(get_mcp_service),  # noqa: B008
) -> MCPServerResponse:
    """Get details for a single MCP server owned by the current user."""
    record = await service.get_server(ctx.user_id, server_id)
    return MCPServerResponse(**record)


@router.delete(
    "/servers/{server_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete MCP server",
    description="Remove an MCP server configuration owned by the current user.",
    responses={401: {"description": "Unauthorized"}, 404: {"description": "Server not found"}},
)
async def delete_server(
    server_id: str,
    ctx: RequestContext = Depends(get_request_context),  # noqa: B008
    service: MCPService = Depends(get_mcp_service),  # noqa: B008
) -> Response:
    """Delete an MCP server owned by the current user."""
    await service.delete_server(ctx.user_id, server_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch(
    "/servers/{server_id}/toggle",
    response_model=MCPServerResponse,
    summary="Toggle MCP server",
    description="Enable or disable an MCP server. Disabled servers are skipped during tool assembly.",
    responses={401: {"description": "Unauthorized"}, 404: {"description": "Server not found"}},
)
async def toggle_server(
    server_id: str,
    payload: MCPServerUpdate,
    ctx: RequestContext = Depends(get_request_context),  # noqa: B008
    service: MCPService = Depends(get_mcp_service),  # noqa: B008
) -> MCPServerResponse:
    """Enable or disable an MCP server."""
    record = await service.toggle_server(ctx.user_id, server_id, payload.is_active)
    return MCPServerResponse(**record)


@router.get(
    "/servers/{server_id}/tools",
    response_model=list[MCPToolInfo],
    summary="List tools",
    description="Live-fetch the tool list from a registered MCP server.",
    responses={
        400: {"description": "Server unreachable"},
        401: {"description": "Unauthorized"},
        404: {"description": "Server not found"},
    },
)
async def list_server_tools(
    server_id: str,
    ctx: RequestContext = Depends(get_request_context),  # noqa: B008
    service: MCPService = Depends(get_mcp_service),  # noqa: B008
) -> list[MCPToolInfo]:
    """Live-fetch the tool list from a registered MCP server."""
    raw_tools = await service.get_live_tools(ctx.user_id, server_id)
    return [
        MCPToolInfo(
            name=t["name"],
            description=t.get("description", ""),
            input_schema=t.get("inputSchema", {}),
        )
        for t in raw_tools
    ]


# ──────────────────────────────────────────────────────────────────────────────
# System default MCP servers (read-only)
# ──────────────────────────────────────────────────────────────────────────────

@router.get(
    "/defaults",
    response_model=list[SystemMCPServerInfo],
    summary="List system default MCP servers",
    description=(
        "Return metadata for all built-in system MCP servers configured for "
        "this chatly-agent deployment.  These servers are always active and "
        "cannot be modified or deleted by users."
    ),
    responses={401: {"description": "Unauthorized"}},
)
async def list_default_servers(
    _ctx: RequestContext = Depends(get_request_context),  # noqa: B008
    system_service: SystemMCPService = Depends(get_system_mcp_service),  # noqa: B008
) -> list[SystemMCPServerInfo]:
    """List configured system MCP servers (chatly-backend, etc.)."""
    return [SystemMCPServerInfo(**s) for s in system_service.list_configured_servers()]
