"""Custom exceptions for the application."""


class TalkingBirdError(Exception):
    """Base exception for Talking Bird."""

    pass


class DocumentProcessingError(TalkingBirdError):
    """Error during document processing."""

    pass


class RetrievalError(TalkingBirdError):
    """Error during chunk retrieval."""

    pass


class LLMError(TalkingBirdError):
    """Error during LLM generation."""

    pass


class AuthenticationError(TalkingBirdError):
    """Authentication error."""

    pass


class AuthorizationError(TalkingBirdError):
    """Authorization error."""

    pass



