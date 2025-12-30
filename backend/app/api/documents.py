"""Document management API endpoints."""

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.config import settings
from app.core.database import get_db
from app.core.vector_store import VectorStore
from app.models.database import Document, DocumentChunk, User
from app.models.schemas import (
    DocumentListResponse,
    DocumentResponse,
    DocumentUploadResponse,
)
from app.services.document_processor import DocumentProcessor

router = APIRouter(prefix="/documents", tags=["documents"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}


def get_vector_store() -> VectorStore:
    """Get vector store instance."""
    return VectorStore()


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    vector_store: VectorStore = Depends(get_vector_store),
) -> DocumentUploadResponse:
    """Upload a document for processing."""
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file_ext} not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )
    
    # Check file size
    contents = await file.read()
    file_size = len(contents)
    max_size = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {settings.MAX_FILE_SIZE_MB}MB",
        )
    
    # Create upload directory if not exists
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Save file
    doc_id = uuid.uuid4()
    storage_path = upload_dir / f"{doc_id}{file_ext}"
    with open(storage_path, "wb") as f:
        f.write(contents)
    
    # Create document record
    document = Document(
        id=doc_id,
        filename=file.filename,
        file_size_bytes=file_size,
        file_type=file_ext.lstrip("."),
        uploaded_by=current_user.id,
        processing_status="pending",
        storage_path=str(storage_path),
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    
    # Process document (inline for now)
    try:
        processor = DocumentProcessor(db=db, document=document, vector_store=vector_store)
        await processor.process_document()
        document.processing_status = "processed"
        db.commit()
    except Exception:
        document.processing_status = "failed"
        db.commit()
    
    return DocumentUploadResponse(document_id=document.id, status=document.processing_status)


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentListResponse:
    """List all documents with pagination."""
    offset = (page - 1) * page_size
    
    total = db.query(Document).count()
    documents = (
        db.query(Document)
        .order_by(Document.uploaded_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )
    
    return DocumentListResponse(
        documents=[DocumentResponse.model_validate(doc) for doc in documents],
        total=total,
        page=page,
    )


@router.get("/{document_id}/download")
async def download_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> FileResponse:
    """Download a document file."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )
    
    if not document.storage_path or not os.path.exists(document.storage_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on disk",
        )
    
    return FileResponse(
        path=document.storage_path,
        filename=document.filename,
        media_type="application/octet-stream",
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    vector_store: VectorStore = Depends(get_vector_store),
) -> None:
    """Delete a document and its chunks."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )
    
    # Get chunk embedding IDs for vector store deletion
    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).all()
    embedding_ids = [chunk.embedding_id for chunk in chunks]
    
    # Delete from vector store
    if embedding_ids:
        try:
            vector_store.delete(embedding_ids)
        except Exception:
            pass  # Best effort deletion
    
    # Delete file from storage
    if document.storage_path and os.path.exists(document.storage_path):
        try:
            os.remove(document.storage_path)
        except OSError:
            pass  # Best effort deletion
    
    # Delete from database (cascades to chunks)
    db.delete(document)
    db.commit()
