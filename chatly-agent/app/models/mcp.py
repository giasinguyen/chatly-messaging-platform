from datetime import datetime

from pydantic import BaseModel, Field, HttpUrl


class MCPServerCreate(BaseModel):
    """Payload to register a new MCP server."""

    name: str = Field(..., min_length=1, max_length=100)
    url: HttpUrl
    headers: dict[str, str] = Field(default_factory=dict)


class MCPServerUpdate(BaseModel):
    """Payload to toggle the active state of an MCP server."""

    is_active: bool


class MCPToolInfo(BaseModel):
    """Metadata for a single tool exposed by an MCP server."""

    name: str
    description: str
    input_schema: dict


class MCPServerResponse(BaseModel):
    """API response shape for an MCP server record."""

    id: str
    user_id: str
    name: str
    url: str
    headers: dict[str, str]
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None
