"""Tool classification for HITL interrupt decisions.

SAFE_TOOLS and SENSITIVE_TOOLS are populated in Phase 3 after
verifying the actual ``.name`` attribute of each tool instance via
``scripts/verify_tool_names.py``.

Until Phase 3, both sets are empty — ``is_sensitive()`` returns True
for all tools (deny-by-default), which is the safe fallback.
"""

# Verified with: uv run python -c "from langchain_tavily import TavilySearch; print(TavilySearch.model_fields['name'].default)"
SAFE_TOOLS: set[str] = {
    "search_documents",   # app/tools/retriever_tool.py
    "tavily_search",      # langchain-tavily TavilySearch.name
}

SENSITIVE_TOOLS: set[str] = {
    "generate_image",     # app/tools/image_gen_tool.py
    "generate_sticker",   # app/tools/image_gen_tool.py
    # MCP tools have dynamic names → caught by deny-by-default in is_sensitive()
}


def is_sensitive(tool_name: str) -> bool:
    """Return True if the tool requires user confirmation before execution.

    Logic:
    - Explicitly in SENSITIVE_TOOLS → True
    - Explicitly in SAFE_TOOLS → False
    - Unknown (not in either set) → True (deny-by-default for unknown tools)
    """
    if tool_name in SENSITIVE_TOOLS:
        return True
    return tool_name not in SAFE_TOOLS
