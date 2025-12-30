"""Pydantic schemas for API request/response validation."""

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class ConfidenceLevel(str, Enum):
    """Confidence level for answers."""

    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ProcessingStatus(str, Enum):
    """Document processing status."""

    PENDING = "pending"
    PROCESSED = "processed"
    FAILED = "failed"


class UserRole(str, Enum):
    """User roles."""

    ADMIN = "admin"
    USER = "user"


# Auth schemas
class LoginRequest(BaseModel):
    """Login request schema."""

    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """Login response schema."""

    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """User response schema."""

    id: UUID
    email: EmailStr
    role: UserRole
    created_at: datetime

    class Config:
        from_attributes = True


# Document schemas
class DocumentResponse(BaseModel):
    """Document response schema."""

    id: UUID
    filename: str
    file_size_bytes: int
    file_type: str
    uploaded_at: datetime
    processing_status: ProcessingStatus
    num_pages: int | None

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    """Document list response schema."""

    documents: list[DocumentResponse]
    total: int
    page: int


class DocumentUploadResponse(BaseModel):
    """Document upload response schema."""

    document_id: UUID
    status: str = "processing"


# Query schemas
class QueryRequest(BaseModel):
    """Query request schema."""

    query: str = Field(..., max_length=500, min_length=1)
    max_chunks: int = Field(default=5, ge=1, le=10)


class SourceResponse(BaseModel):
    """Source response schema."""

    document_id: UUID
    document_name: str
    page_number: int | None
    excerpt: str
    similarity_score: float


class QueryResponse(BaseModel):
    """Query response schema."""

    answer: str
    confidence: ConfidenceLevel
    sources: list[SourceResponse]
    processing_time_ms: int


class QueryHistoryItem(BaseModel):
    """Query history item schema."""

    id: UUID
    query_text: str
    answer_text: str | None
    confidence_level: ConfidenceLevel | None
    created_at: datetime

    class Config:
        from_attributes = True


class QueryHistoryResponse(BaseModel):
    """Query history response schema."""

    queries: list[QueryHistoryItem]
    total: int



