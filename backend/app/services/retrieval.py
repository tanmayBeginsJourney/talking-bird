"""Retrieval service for hybrid search (vector + BM25) with query expansion."""

import re
from dataclasses import dataclass

from rank_bm25 import BM25Okapi

from app.config import settings
from app.core.vector_store import VectorStore
from app.services.embeddings import embed_text, embed_texts
from app.services.query_expander import expand_query


@dataclass
class RetrievedChunk:
    """Represents a retrieved document chunk."""

    chunk_id: str
    document_id: str
    document_name: str
    page_number: int | None
    text_content: str
    similarity: float


def tokenize(text: str) -> list[str]:
    """Simple tokenizer for BM25: lowercase, split on non-alphanumeric."""
    text = text.lower()
    tokens = re.findall(r"\b[a-z0-9]+\b", text)
    return tokens


class RetrieverService:
    """Handles hybrid search with query expansion, vector similarity, and BM25."""

    def __init__(self) -> None:
        """Initialize retriever service."""
        self.vector_store = VectorStore()

    async def retrieve(
        self,
        query: str,
        top_k: int = 5,
        similarity_threshold: float = 0.35,  # Lower threshold for table/structured content
    ) -> list[RetrievedChunk]:
        """
        Retrieve most relevant document chunks using hybrid search with query expansion.

        Strategy:
        1. Expand query into 2-3 variations (synonyms, related terms)
        2. Fetch candidates from vector search for each query variation
        3. Dedupe and merge results
        4. Score with BM25 using all query variations
        5. Combine scores using Reciprocal Rank Fusion (RRF)
        6. Return top_k results
        """
        # Expand query for better recall
        query_variations = expand_query(query)
        print(f"[RETRIEVAL] Query variations: {query_variations}")

        # Get candidates from vector search for each query variation
        candidate_count_per_query = max(top_k * 3, 15)
        all_results: dict[str, dict] = {}  # chunk_id -> result (dedupe)
        best_vector_scores: dict[str, float] = {}  # chunk_id -> best vector score

        # Embed all query variations at once for efficiency
        query_embeddings = embed_texts(query_variations)

        for q_text, q_embedding in zip(query_variations, query_embeddings):
            results = self.vector_store.search(
                query_vector=q_embedding, top_k=candidate_count_per_query
            )
            for r in results:
                chunk_id = r["id"]
                # Keep result and track best vector score across queries
                if chunk_id not in all_results:
                    all_results[chunk_id] = r
                    best_vector_scores[chunk_id] = r["score"]
                else:
                    best_vector_scores[chunk_id] = max(
                        best_vector_scores[chunk_id], r["score"]
                    )

        if not all_results:
            print("[RETRIEVAL] No results from vector search")
            return []

        # Debug: show top scores before filtering
        top_scores = sorted(best_vector_scores.values(), reverse=True)[:5]
        print(f"[RETRIEVAL] Top 5 vector scores: {top_scores}")
        print(f"[RETRIEVAL] Threshold: {similarity_threshold}")

        # Filter by minimum threshold using best score
        filtered_ids = [
            cid for cid, score in best_vector_scores.items()
            if score >= similarity_threshold
        ]

        if not filtered_ids:
            print(f"[RETRIEVAL] All {len(all_results)} results filtered out by threshold")
            return []
        
        print(f"[RETRIEVAL] {len(filtered_ids)} chunks passed threshold")

        # Sort by best vector score for vector ranking
        filtered_ids.sort(key=lambda x: best_vector_scores[x], reverse=True)
        vector_results = [all_results[cid] for cid in filtered_ids]

        # Extract texts for BM25
        candidate_texts = [r["payload"]["text_content"] for r in vector_results]
        tokenized_corpus = [tokenize(text) for text in candidate_texts]

        # Build BM25 index and score using ALL query variations
        bm25 = BM25Okapi(tokenized_corpus)

        # Combine BM25 scores from all query variations (take max per doc)
        combined_bm25_scores = [0.0] * len(vector_results)
        for q_text in query_variations:
            query_tokens = tokenize(q_text)
            scores = bm25.get_scores(query_tokens)
            for i, score in enumerate(scores):
                combined_bm25_scores[i] = max(combined_bm25_scores[i], score)

        # Create ranked lists for RRF
        vector_ranks = {r["id"]: rank for rank, r in enumerate(vector_results)}

        # BM25 ranking (sort by combined score descending)
        bm25_ranked_indices = sorted(
            range(len(combined_bm25_scores)),
            key=lambda i: combined_bm25_scores[i],
            reverse=True,
        )
        bm25_ranks = {
            vector_results[idx]["id"]: rank
            for rank, idx in enumerate(bm25_ranked_indices)
        }

        # Reciprocal Rank Fusion with k=60 (standard parameter)
        rrf_k = 60
        fused_scores = {}
        for result in vector_results:
            doc_id = result["id"]
            vector_rank = vector_ranks.get(doc_id, len(vector_results))
            bm25_rank = bm25_ranks.get(doc_id, len(vector_results))

            # RRF formula: sum of 1/(k + rank) for each ranking
            rrf_score = (1 / (rrf_k + vector_rank)) + (1 / (rrf_k + bm25_rank))
            fused_scores[doc_id] = rrf_score

        # Sort by fused score and take top_k
        sorted_ids = sorted(
            fused_scores.keys(), key=lambda x: fused_scores[x], reverse=True
        )

        # Build final result list
        id_to_result = {r["id"]: r for r in vector_results}
        chunks = []

        for doc_id in sorted_ids[:top_k]:
            result = id_to_result[doc_id]
            payload = result["payload"]
            chunks.append(
                RetrievedChunk(
                    chunk_id=doc_id,
                    document_id=payload["document_id"],
                    document_name=payload["document_name"],
                    page_number=payload.get("page_number"),
                    text_content=payload["text_content"],
                    # Use RRF score normalized to 0-1 range for display
                    similarity=min(fused_scores[doc_id] * 30, 1.0),
                )
            )

        return chunks
