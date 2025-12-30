"""Retrieval service for semantic search."""

from dataclasses import dataclass

from app.config import settings
from app.core.vector_store import VectorStore
from app.services.embeddings import embed_text


@dataclass
class RetrievedChunk:
    """Represents a retrieved document chunk."""

    chunk_id: str
    document_id: str
    document_name: str
    page_number: int | None
    text_content: str
    similarity: float


class RetrieverService:
    """Handles semantic search and chunk retrieval."""

    def __init__(self) -> None:
        """Initialize retriever service."""
        self.vector_store = VectorStore()

    async def retrieve(
        self,
        query: str,
        top_k: int = 5,
        similarity_threshold: float = 0.65,
    ) -> list[RetrievedChunk]:
        """Retrieve most relevant document chunks for a query."""
        # Embed the query
        query_embedding = embed_text(query)

        # Search Qdrant
        results = self.vector_store.search(query_vector=query_embedding, top_k=top_k)

        # Filter by similarity threshold and convert to RetrievedChunk
        chunks = []
        for result in results:
            if result["score"] < similarity_threshold:
                continue

            payload = result["payload"]
            chunks.append(
                RetrievedChunk(
                    chunk_id=result["id"],
                    document_id=payload["document_id"],
                    document_name=payload["document_name"],
                    page_number=payload.get("page_number"),
                    text_content=payload["text_content"],
                    similarity=result["score"],
                )
            )

        return chunks
