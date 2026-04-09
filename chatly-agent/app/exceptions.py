class AgentServerError(Exception):
    """Base exception for the whole application."""


class AgentError(AgentServerError):
    """Raised when agent execution fails."""


class SessionNotFoundError(AgentServerError):
    """Raised when a chat session cannot be found."""


class VectorSearchError(AgentServerError):
    """Raised when vector search fails."""


class LLMRateLimitError(AgentServerError):
    """Raised when the upstream LLM rate limit is exceeded."""


class DocumentNotFoundError(AgentServerError):
    """Raised when a document cannot be found."""


class AuthError(AgentServerError):
    """Raised for authentication and authorization failures."""


class MCPConnectionError(AgentServerError):
    """Raised when an MCP server cannot be reached or returns an error."""


class MCPServerNotFoundError(AgentServerError):
    """Raised when an MCP server record cannot be found."""
