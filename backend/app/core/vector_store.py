"""Vector store client for Qdrant."""

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams

from app.config import settings


class VectorStore:
    """Qdrant vector store client."""

    # Embedding dimensions for supported models
    EMBEDDING_DIMS = {
        "sentence-transformers/all-MiniLM-L6-v2": 384,
        "sentence-transformers/all-mpnet-base-v2": 768,
        "BAAI/bge-large-en-v1.5": 1024,
    }

    def __init__(self) -> None:
        """Initialize Qdrant client."""
        self.client = QdrantClient(
            host=settings.VECTOR_DB_HOST,
            port=settings.VECTOR_DB_PORT,
        )
        self.collection_name = settings.COLLECTION_NAME
        self.vector_size = self.EMBEDDING_DIMS.get(settings.EMBEDDING_MODEL, 768)
        self._ensure_collection()

    def _ensure_collection(self) -> None:
        """Ensure the collection exists with correct dimensions."""
        try:
            collections = self.client.get_collections().collections
            exists = any(c.name == self.collection_name for c in collections)
            
            if not exists:
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=self.vector_size,
                        distance=Distance.COSINE,
                    ),
                )
                print(f"[VECTOR_STORE] Created collection '{self.collection_name}' with {self.vector_size} dimensions")
            else:
                print(f"[VECTOR_STORE] Using existing collection '{self.collection_name}'")
        except Exception as e:
            print(f"[VECTOR_STORE] Error ensuring collection: {e}")

    def upsert(self, point_id: str, vector: list[float], payload: dict) -> None:
        """Insert or update a vector."""
        self.client.upsert(
            collection_name=self.collection_name,
            points=[PointStruct(id=point_id, vector=vector, payload=payload)],
        )

    def search(self, query_vector: list[float], top_k: int = 5) -> list[dict]:
        """Search for similar vectors."""
        results = self.client.query_points(
            collection_name=self.collection_name,
            query=query_vector,
            limit=top_k,
        )
        return [{"id": r.id, "score": r.score, "payload": r.payload} for r in results.points]

    def delete(self, point_ids: list[str]) -> None:
        """Delete vectors by ID."""
        from qdrant_client.models import PointIdsList
        self.client.delete(
            collection_name=self.collection_name,
            points_selector=PointIdsList(points=point_ids),
        )



