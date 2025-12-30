"""Answer generation service."""

from app.models.schemas import ConfidenceLevel, QueryResponse
from app.services.retrieval import RetrievedChunk

SYSTEM_PROMPT = """You are Talking Bird, an AI assistant for the Office of Research.

CRITICAL RULES:
1. Answer ONLY using the provided document excerpts
2. NEVER use general knowledge or make assumptions
3. If the answer isn't explicitly in the documents, respond: "Not sure based on available information."
4. Always cite sources: [Document Name, Page X]
5. Do not speculate, compare, or make value judgments

PROHIBITED:
- Answering questions not covered in documents
- Making inferences beyond explicit text
- Providing opinions or recommendations
- Using phrases like "generally," "typically," "probably"
"""


class AnswerGenerator:
    """Generates grounded answers from retrieved chunks."""

    def __init__(self) -> None:
        """Initialize answer generator."""
        pass

    async def generate(
        self,
        query: str,
        chunks: list[RetrievedChunk],
    ) -> QueryResponse:
        """Generate a grounded answer from retrieved chunks."""
        pass

    def calculate_confidence(
        self,
        avg_similarity: float,
        num_chunks: int,
        answer_length: int,
        contains_citation: bool,
    ) -> ConfidenceLevel:
        """Calculate confidence level for an answer."""
        if avg_similarity > 0.75 and num_chunks >= 3 and contains_citation:
            return ConfidenceLevel.HIGH
        if avg_similarity > 0.65 and num_chunks >= 2:
            return ConfidenceLevel.MEDIUM
        return ConfidenceLevel.LOW

    def build_context(self, chunks: list[RetrievedChunk]) -> str:
        """Build context string from retrieved chunks."""
        pass



