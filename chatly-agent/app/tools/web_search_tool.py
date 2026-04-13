"""Factory for the Tavily web search LangChain tool."""
import os

from langchain_tavily import TavilySearch

from app.config import settings


def web_search_available() -> bool:
    """True if a Tavily API key is configured."""
    return bool(settings.tavily_api_key)


def create_web_search_tool(max_results: int = 5) -> TavilySearch:
    """
    Return a TavilySearch tool configured with the project API key.

    Raises:
        ValueError: if TAVILY_API_KEY is not set.
    """
    if not settings.tavily_api_key:
        raise ValueError("Tavily API key not configured — set TAVILY_API_KEY in .env")
    # Set env var explicitly so TavilySearch uses the value from our settings.
    os.environ["TAVILY_API_KEY"] = settings.tavily_api_key
    return TavilySearch(max_results=max_results)
