"""Factory for the Tavily web search LangChain tool."""
import os

from langchain_tavily import TavilySearch

from app.config import settings

# Use advanced search depth for richer content and better synthesis quality.
_SEARCH_DEPTH = "advanced"
_MAX_RESULTS = 8


def web_search_available() -> bool:
    """True if a Tavily API key is configured."""
    return bool(settings.tavily_api_key)


def create_web_search_tool(max_results: int = _MAX_RESULTS) -> TavilySearch:
    """
    Return a TavilySearch tool configured with the project API key.

    Uses advanced search depth to retrieve full page content, enabling
    the LLM to synthesize a proper answer rather than just listing snippets.

    Raises:
        ValueError: if TAVILY_API_KEY is not set.
    """
    if not settings.tavily_api_key:
        raise ValueError("Tavily API key not configured — set TAVILY_API_KEY in .env")
    os.environ["TAVILY_API_KEY"] = settings.tavily_api_key
    return TavilySearch(
        max_results=max_results,
        search_depth=_SEARCH_DEPTH,
        include_answer=True,
        include_raw_content=False,
    )
