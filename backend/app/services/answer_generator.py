"""Answer generation service."""

from dataclasses import dataclass

from groq import Groq

from app.config import settings
from app.models.schemas import ConfidenceLevel
from app.services.retrieval import RetrievedChunk

SYSTEM_PROMPT = """You are Talking Bird, a helpful assistant that answers questions using provided document excerpts.

Your goal: Give clear, accurate answers based ONLY on the excerpts provided. Be conversational but precise.

Guidelines:
- Synthesize information across excerpts when relevant
- Use [1], [2], etc. to cite which excerpt you're referencing
- Keep answers concise - match length to question complexity
- If information isn't in the excerpts, say "I don't have enough information to answer that."
- For list questions, use bullet points
- For explanations, use clear prose
- Never make up information or use outside knowledge"""


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
        
        user_message = f"""Here are document excerpts, ordered by relevance (most relevant first):

{context}

Question: {query}

Answer based only on the excerpts above. Be helpful and concise."""

        response = self.client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.15,  # Slightly creative for natural phrasing
            max_tokens=1024,
        )
        
        answer = response.choices[0].message.content or "I don't have enough information to answer that."
        
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
            page_info = f" (Page {chunk.page_number})" if chunk.page_number else ""
            context_parts.append(
                f"[{i}] {chunk.document_name}{page_info}:\n{chunk.text_content}\n"
            )
        return "\n".join(context_parts)
