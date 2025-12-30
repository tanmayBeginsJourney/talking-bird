"""Grounding validation service."""


class GroundingValidator:
    """Validates that answers are properly grounded in source documents."""

    def __init__(self) -> None:
        """Initialize grounding validator."""
        pass

    def validate_answer(self, answer: str, source_chunks: list[str]) -> bool:
        """Validate that an answer is grounded in source chunks."""
        pass

    def check_for_speculation(self, answer: str) -> bool:
        """Check if answer contains speculative language."""
        speculative_phrases = [
            "generally",
            "typically",
            "probably",
            "might",
            "could be",
            "I think",
            "based on my knowledge",
        ]
        answer_lower = answer.lower()
        return any(phrase in answer_lower for phrase in speculative_phrases)



