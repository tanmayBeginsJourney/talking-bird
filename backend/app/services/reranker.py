"""Cross-encoder reranking service."""

from sentence_transformers import CrossEncoder

from app.services.retrieval import RetrievedChunk

# Lazy-loaded cross-encoder model
_cross_encoder: CrossEncoder | None = None

# ms-marco-MiniLM-L-6-v2 is fast and effective for reranking
CROSS_ENCODER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"


def get_cross_encoder() -> CrossEncoder:
    """Get or initialize the cross-encoder model (singleton)."""
    global _cross_encoder
    if _cross_encoder is None:
        _cross_encoder = CrossEncoder(CROSS_ENCODER_MODEL)
    return _cross_encoder


def rerank_chunks(
    query: str,
    chunks: list[RetrievedChunk],
    top_k: int = 5,
) -> list[RetrievedChunk]:
    """
    Rerank retrieved chunks using a cross-encoder model.

    Cross-encoders jointly encode (query, document) pairs and produce
    more accurate relevance scores than bi-encoder similarity.

    Args:
        query: The user's query
        chunks: List of candidate chunks from initial retrieval
        top_k: Number of top results to return after reranking

    Returns:
        Reranked list of chunks (top_k), sorted by cross-encoder score
    """
    if not chunks:
        return []

    if len(chunks) <= 1:
        return chunks

    model = get_cross_encoder()

    # Create query-document pairs for the cross-encoder
    pairs = [(query, chunk.text_content) for chunk in chunks]

    # Get relevance scores from cross-encoder
    scores = model.predict(pairs)

    # Pair chunks with their scores and sort
    scored_chunks = list(zip(chunks, scores))
    scored_chunks.sort(key=lambda x: x[1], reverse=True)

    # Take top_k and update similarity scores
    reranked = []
    for chunk, score in scored_chunks[:top_k]:
        # Cross-encoder scores are typically in [-10, 10] range
        # Normalize to [0, 1] for consistency
        normalized_score = 1 / (1 + 2.718281828 ** (-score))  # sigmoid
        reranked.append(
            RetrievedChunk(
                chunk_id=chunk.chunk_id,
                document_id=chunk.document_id,
                document_name=chunk.document_name,
                page_number=chunk.page_number,
                text_content=chunk.text_content,
                similarity=normalized_score,
            )
        )

    return reranked


