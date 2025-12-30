"""Vector store client for Qdrant."""

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from app.config import settings


class VectorStore:
    """Qdrant vector store client."""

    def __init__(self) -> None:
        """Initialize Qdrant client."""
        self.client = QdrantClient(
            host=settings.VECTOR_DB_HOST,
            port=settings.VECTOR_DB_PORT,
        )
        self.collection_name = settings.COLLECTION_NAME
        self._ensure_collection()

    def _ensure_collection(self) -> None:
        """Ensure the collection exists."""
        collections = self.client.get_collections().collections
        if not any(c.name == self.collection_name for c in collections):
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(
                    size=384,  # all-MiniLM-L6-v2 embedding dimension
                    distance=Distance.COSINE,
                ),
            )

    def upsert(self, point_id: str, vector: list[float], payload: dict) -> None:
        """Insert or update a vector."""
        self.client.upsert(
            collection_name=self.collection_name,
            points=[PointStruct(id=point_id, vector=vector, payload=payload)],
        )

    def search(self, query_vector: list[float], top_k: int = 5) -> list[dict]:
        """Search for similar vectors."""
        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_vector,
            limit=top_k,
        )
        return [{"id": r.id, "score": r.score, "payload": r.payload} for r in results]

    def delete(self, point_ids: list[str]) -> None:
        """Delete vectors by ID."""
        self.client.delete(
            collection_name=self.collection_name,
            points_selector=point_ids,
        )



