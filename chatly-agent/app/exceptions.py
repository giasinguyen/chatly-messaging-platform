class AgentServerError(Exception):
    """Base exception for the whole application."""


class SessionNotFoundError(AgentServerError):
    """Raised when a chat session cannot be found."""


class MCPConnectionError(AgentServerError):
    """Raised when an MCP server cannot be reached or returns an error."""


class MCPServerNotFoundError(AgentServerError):
    """Raised when an MCP server record cannot be found."""
