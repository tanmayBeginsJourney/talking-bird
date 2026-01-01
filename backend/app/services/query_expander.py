"""Query expansion service for improved recall."""

import json
import re

from groq import Groq

from app.config import settings

# Lazy-loaded Groq client
_client: Groq | None = None


def get_groq_client() -> Groq:
    """Get or initialize Groq client (singleton)."""
    global _client
    if _client is None:
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


EXPANSION_PROMPT = """Generate 2 alternative phrasings of this search query that would help find relevant documents. Use synonyms and related terms.

Query: "{query}"

Return ONLY a JSON array of 2 strings, no explanation:
["alternative 1", "alternative 2"]"""


def expand_query(query: str) -> list[str]:
    """
    Generate query variations to improve search recall.

    Returns the original query plus 2 alternatives with synonyms/related terms.
    Falls back to original query only if expansion fails.
    """
    client = get_groq_client()

    try:
        response = client.chat.completions.create(
            model=settings.LLM_MODEL,  # Use same model as main LLM
            messages=[
                {"role": "user", "content": EXPANSION_PROMPT.format(query=query)},
            ],
            temperature=0.3,
            max_tokens=150,
        )

        content = response.choices[0].message.content or ""

        # Extract JSON array from response
        match = re.search(r"\[.*\]", content, re.DOTALL)
        if match:
            alternatives = json.loads(match.group())
            if isinstance(alternatives, list) and len(alternatives) >= 1:
                # Return original + alternatives (dedupe)
                all_queries = [query] + [
                    alt for alt in alternatives[:2] if alt.lower() != query.lower()
                ]
                return all_queries

    except Exception:
        # On any failure, fall back to original query only
        pass

    return [query]

