from typing import Any

from app.services.vector_service import VectorService


async def retriever_node(
    state: dict[str, Any],
    vector_service: VectorService,
) -> dict[str, list[str]]:
    """Retrieve relevant chunk texts for current query."""
    query = str(state.get("query", ""))
    session_id = str(state.get("session_id", ""))
    chunks = await vector_service.similarity_search(query=query, session_id=session_id)
    return {"context": [str(item.get("content", "")) for item in chunks]}
