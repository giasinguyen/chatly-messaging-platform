from langchain_core.tools import tool

from app.services.vector_service import VectorService


def create_retriever_tool(vector_service: VectorService, session_id: str):
    """Create a retriever tool scoped to a specific session."""

    @tool
    async def search_documents(query: str) -> str:
        """Search uploaded documents for relevant context."""
        chunks = await vector_service.similarity_search(query, session_id)
        return "\n\n".join(str(c.get("content", "")) for c in chunks)

    return search_documents
