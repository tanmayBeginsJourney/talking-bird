"""Shared embedding model for document processing and retrieval."""

from sentence_transformers import SentenceTransformer

from app.config import settings

# Load model once at module level - avoids reloading 90MB model per request
_model: SentenceTransformer | None = None


def get_embedding_model() -> SentenceTransformer:
    """Get or create the shared embedding model."""
    global _model
    if _model is None:
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
    return _model


def embed_text(text: str) -> list[float]:
    """Generate embedding for a single text."""
    model = get_embedding_model()
    return model.encode(text, convert_to_numpy=True).tolist()


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for multiple texts (batched for efficiency)."""
    model = get_embedding_model()
    embeddings = model.encode(texts, convert_to_numpy=True)
    return [emb.tolist() for emb in embeddings]

