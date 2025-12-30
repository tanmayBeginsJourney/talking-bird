"""SQLAlchemy database models."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    """Base class for SQLAlchemy models."""

    pass


class User(Base):
    """User model."""

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(Text, nullable=False)
    role = Column(String(20), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    documents = relationship("Document", back_populates="uploader")
    queries = relationship("Query", back_populates="user")


class Document(Base):
    """Document model."""

    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String(255), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    file_type = Column(String(10), nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    processing_status = Column(String(20), nullable=False, default="pending")
    num_pages = Column(Integer)
    storage_path = Column(Text, nullable=False)

    uploader = relationship("User", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    """Document chunk model."""

    __tablename__ = "document_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer)
    text_content = Column(Text, nullable=False)
    token_count = Column(Integer, nullable=False)
    embedding_id = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="chunks")


class Query(Base):
    """Query model."""

    __tablename__ = "queries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    query_text = Column(Text, nullable=False)
    answer_text = Column(Text)
    confidence_level = Column(String(10))
    num_chunks_retrieved = Column(Integer)
    avg_similarity_score = Column(Float)
    processing_time_ms = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="queries")
    sources = relationship("QuerySource", back_populates="query", cascade="all, delete-orphan")


class QuerySource(Base):
    """Query source mapping model."""

    __tablename__ = "query_sources"

    query_id = Column(UUID(as_uuid=True), ForeignKey("queries.id", ondelete="CASCADE"), primary_key=True)
    chunk_id = Column(UUID(as_uuid=True), ForeignKey("document_chunks.id", ondelete="CASCADE"), primary_key=True)
    similarity_score = Column(Float, nullable=False)

    query = relationship("Query", back_populates="sources")



