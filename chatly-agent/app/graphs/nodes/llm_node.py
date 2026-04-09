from typing import Any

from langchain_groq import ChatGroq


async def llm_node(state: dict[str, Any], llm: ChatGroq) -> dict[str, list[Any]]:
    """Call LLM with conversation history from graph state."""
    response = await llm.ainvoke(state["messages"])
    return {"messages": [response]}
