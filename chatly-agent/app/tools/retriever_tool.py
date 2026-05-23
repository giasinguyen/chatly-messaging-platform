import logging

from langchain_core.tools import BaseTool, tool

from app.services.vector_service import VectorService

logger = logging.getLogger(__name__)


def create_retriever_tool(
    vector_service: VectorService,
    session_id: str,
    conversation_id: str | None = None,
) -> BaseTool:
    """Create a retriever tool scoped to a session (and optionally a conversation)."""

    @tool
    async def search_documents(query: str) -> str:
        """Search through the user's uploaded documents to find relevant information.

        Use this tool whenever the user asks a question that could be answered by
        the content of uploaded files (PDFs, Word documents, spreadsheets, etc.).
        Call this before answering any question that relates to the documents.

        Returns structured excerpts with source information. Cite the file name and
        content when using results in your answer.
        """
        chunks = await vector_service.similarity_search(
            query,
            session_id,
            threshold=0.3,
            conversation_id=conversation_id,
        )
        logger.info(
            "search_documents: query=%r session_id=%s conversation_id=%s results=%d",
            query,
            session_id,
            conversation_id,
            len(chunks),
        )
        if not chunks:
            return "No relevant content found in the uploaded documents for this query."

        formatted: list[str] = []
        for i, chunk in enumerate(chunks, 1):
            filename = chunk.get("filename") or chunk.get("file_id", "unknown file")
            content = str(chunk.get("content", "")).strip()
            chunk_idx = chunk.get("chunk_index", "")
            source = f"{filename}" + (f" (part {chunk_idx})" if chunk_idx != "" else "")
            formatted.append(f"[Source {i}: {source}]\n{content}")

        return "\n\n---\n\n".join(formatted)

    return search_documents
