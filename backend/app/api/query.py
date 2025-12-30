"""Query API endpoints."""

import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.database import Document, DocumentChunk, Query as QueryModel, QuerySource, User
from app.models.schemas import (
    ConfidenceLevel,
    QueryRequest,
    QueryResponse,
    SourceResponse,
)
from app.services.answer_generator import AnswerGenerator
from app.services.retrieval import RetrieverService

router = APIRouter(prefix="/query", tags=["query"])


@router.post("", response_model=QueryResponse)
async def submit_query(
    request: QueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> QueryResponse:
    """Submit a query and get a grounded answer."""
    start_time = time.time()
    
    # Retrieve relevant chunks
    retriever = RetrieverService()
    chunks = await retriever.retrieve(query=request.query, top_k=request.max_chunks)
    
    if not chunks:
        # No relevant documents found
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        # Store query in database
        query_record = QueryModel(
            id=uuid.uuid4(),
            user_id=current_user.id,
            query_text=request.query,
            answer_text="Not sure based on available information.",
            confidence_level=ConfidenceLevel.LOW.value,
            num_chunks_retrieved=0,
            avg_similarity_score=0.0,
            processing_time_ms=processing_time_ms,
        )
        db.add(query_record)
        db.commit()
        
        return QueryResponse(
            answer="Not sure based on available information.",
            confidence=ConfidenceLevel.LOW,
            sources=[],
            processing_time_ms=processing_time_ms,
        )
    
    # Generate answer
    generator = AnswerGenerator()
    generated = await generator.generate(query=request.query, chunks=chunks)
    
    processing_time_ms = int((time.time() - start_time) * 1000)
    
    # Calculate average similarity
    avg_similarity = sum(c.similarity for c in chunks) / len(chunks)
    
    # Store query in database
    query_record = QueryModel(
        id=uuid.uuid4(),
        user_id=current_user.id,
        query_text=request.query,
        answer_text=generated.answer,
        confidence_level=generated.confidence.value,
        num_chunks_retrieved=len(chunks),
        avg_similarity_score=avg_similarity,
        processing_time_ms=processing_time_ms,
    )
    db.add(query_record)
    db.flush()
    
    # Store query sources
    for chunk in chunks:
        source = QuerySource(
            query_id=query_record.id,
            chunk_id=uuid.UUID(chunk.chunk_id),
            similarity_score=chunk.similarity,
        )
        db.add(source)
    
    db.commit()
    
    # Build source responses
    sources = [
        SourceResponse(
            document_id=uuid.UUID(chunk.document_id),
            document_name=chunk.document_name,
            page_number=chunk.page_number,
            excerpt=chunk.text_content[:200] + "..." if len(chunk.text_content) > 200 else chunk.text_content,
            similarity_score=chunk.similarity,
        )
        for chunk in chunks
    ]
    
    return QueryResponse(
        answer=generated.answer,
        confidence=generated.confidence,
        sources=sources,
        processing_time_ms=processing_time_ms,
    )
