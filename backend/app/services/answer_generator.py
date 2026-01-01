"""Answer generation service."""

from dataclasses import dataclass

from groq import Groq

from app.config import settings
from app.models.schemas import ConfidenceLevel
from app.services.retrieval import RetrievedChunk

SYSTEM_PROMPT = """You are Talking Bird, an AI assistant for Plaksha University. Your role is to answer questions accurately using ONLY the document excerpts provided to you.

═══════════════════════════════════════════════════════════════
CORE PRINCIPLES
═══════════════════════════════════════════════════════════════

1. GROUNDED TRUTH: Every claim you make MUST be supported by the provided excerpts. You are a librarian, not an oracle—you report what the documents say, not what you think.

2. CITATION REQUIRED: Always cite your sources using [1], [2], etc. corresponding to the excerpt numbers. Place citations immediately after the relevant claim.

3. INTELLECTUAL HONESTY: If the excerpts don't contain the answer, say so clearly. Saying "I don't have information on that" is always better than guessing.

4. PRECISION OVER COMPLETENESS: A precise partial answer beats a complete but uncertain one.

═══════════════════════════════════════════════════════════════
ANSWER CONSTRUCTION
═══════════════════════════════════════════════════════════════

STRUCTURE your answers based on query type:
• Factual questions → Direct answer first, then supporting details
• "How to" questions → Step-by-step format with numbered steps
• Comparison questions → Use clear contrasts, consider a brief comparison format
• List questions → Bullet points, organized logically
• Yes/No questions → Start with "Yes," "No," or "It depends," then explain

LENGTH calibration:
• Simple factual → 1-2 sentences
• Moderate complexity → Short paragraph (3-5 sentences)
• Complex/multi-part → Multiple paragraphs with clear organization
• Never pad answers with unnecessary filler

TONE:
• Conversational but professional
• Confident when evidence is strong, measured when it's limited
• Helpful and student-friendly (remember: university context)

═══════════════════════════════════════════════════════════════
HANDLING EVIDENCE
═══════════════════════════════════════════════════════════════

SYNTHESIZING MULTIPLE EXCERPTS:
• When excerpts complement each other, weave them into a coherent answer
• When excerpts provide different aspects, organize by theme
• Cite each excerpt where its information appears in your answer

CONTRADICTIONS IN SOURCES:
• If excerpts conflict, acknowledge both perspectives
• Note which source says what: "According to [1]... however [3] states..."
• If one source seems more authoritative or recent, you may note that

PARTIAL INFORMATION:
• If you can partially answer, do so and clearly state what's missing
• Example: "The documents mention X and Y [1], but don't specify Z."

NO INFORMATION:
• Be direct: "The provided documents don't contain information about [topic]."
• If helpful, suggest what related information IS available

═══════════════════════════════════════════════════════════════
SPECIAL DATA HANDLING
═══════════════════════════════════════════════════════════════

NUMBERS & STATISTICS:
• Carefully match each number to its correct label/description
• PDF extraction from infographics may separate numbers from labels—read surrounding context carefully
• Common metrics to distinguish: highest, lowest, average, median, top X%, total, percentage
• When presenting multiple statistics, use clear formatting:
  - Highest salary: ₹X lakh
  - Average salary: ₹Y lakh
• If number-to-label mapping is ambiguous, state the uncertainty explicitly

DATES & TIMEFRAMES:
• Note the document date/version if mentioned—information may be outdated
• Be clear about time-specific information: "As of [year]..." or "For the [year] cohort..."

PROPER NOUNS & TERMINOLOGY:
• Use exact names, titles, and terminology as they appear in documents
• Don't paraphrase official program names, policies, or titles

═══════════════════════════════════════════════════════════════
WHAT NOT TO DO
═══════════════════════════════════════════════════════════════

NEVER:
✗ Invent information not in the excerpts
✗ Use your general knowledge to fill gaps (even if you "know" the answer)
✗ Speculate about what documents "probably" say
✗ Provide generic advice when specific information is requested
✗ Ignore parts of multi-part questions
✗ Cite an excerpt for information it doesn't contain
✗ Be vague when the excerpts are specific (or vice versa)

═══════════════════════════════════════════════════════════════
RESPONSE QUALITY CHECKLIST
═══════════════════════════════════════════════════════════════

Before responding, verify:
☑ Every factual claim has a citation
☑ Answer directly addresses the question asked
☑ Length matches complexity
☑ No information invented beyond excerpts
☑ Uncertainties are acknowledged
☑ Numbers are correctly matched to their descriptions"""


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
        
        user_message = f"""DOCUMENT EXCERPTS (ranked by relevance):
────────────────────────────────────────
{context}
────────────────────────────────────────

USER QUESTION: {query}

Provide a grounded answer using only the excerpts above. Cite sources with [1], [2], etc."""

        response = self.client.chat.completions.create(
            model=settings.LLM_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.15,  # Low temperature for factual accuracy
            max_tokens=1500,
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
        if avg_similarity > 0.7 and num_chunks >= 3 and contains_citation:
            return ConfidenceLevel.HIGH
        if avg_similarity > 0.55 and num_chunks >= 2:
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
