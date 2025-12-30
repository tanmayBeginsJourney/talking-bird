"""Answer generation service."""

from dataclasses import dataclass

from groq import Groq

from app.config import settings
from app.models.schemas import ConfidenceLevel
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


@dataclass
class GeneratedAnswer:
    """Result from answer generation."""
    answer: str
    confidence: ConfidenceLevel


class AnswerGenerator:
    """Generates grounded answers from retrieved chunks."""

    def __init__(self) -> None:
        """Initialize answer generator with Groq client."""
        self.client = Groq(api_key=settings.GROQ_API_KEY)

    async def generate(
        self,
        query: str,
        chunks: list[RetrievedChunk],
    ) -> GeneratedAnswer:
        """Generate a grounded answer from retrieved chunks."""
        context = self.build_context(chunks)
        
        user_message = f"""Based on the following document excerpts, answer the question.

DOCUMENT EXCERPTS:
{context}

QUESTION: {query}

Provide a clear, factual answer citing the specific documents. If the information isn't in the excerpts, say "Not sure based on available information."
"""

        response = self.client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=settings.LLM_TEMPERATURE,
            max_tokens=1024,
        )
        
        answer = response.choices[0].message.content or "Not sure based on available information."
        
        # Calculate confidence
        avg_similarity = sum(c.similarity for c in chunks) / len(chunks) if chunks else 0
        contains_citation = "[" in answer and "]" in answer
        confidence = self.calculate_confidence(
            avg_similarity=avg_similarity,
            num_chunks=len(chunks),
            answer_length=len(answer),
            contains_citation=contains_citation,
        )
        
        return GeneratedAnswer(answer=answer, confidence=confidence)

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
        context_parts = []
        for i, chunk in enumerate(chunks, 1):
            page_info = f", Page {chunk.page_number}" if chunk.page_number else ""
            context_parts.append(
                f"[{i}] Source: {chunk.document_name}{page_info}\n{chunk.text_content}\n"
            )
        return "\n".join(context_parts)
