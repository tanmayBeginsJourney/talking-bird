"""Document processing service."""

import uuid
from pathlib import Path

from docx import Document as DocxDocument
from pypdf import PdfReader
from sqlalchemy.orm import Session

from app.config import settings
from app.core.vector_store import VectorStore
from app.models.database import Document, DocumentChunk
from app.services.embeddings import embed_texts


class DocumentProcessor:
    """Handles document text extraction and chunking."""

    def __init__(
        self,
        db: Session,
        document: Document,
        vector_store: VectorStore,
    ) -> None:
        """Initialize document processor with dependencies."""
        self.db = db
        self.document = document
        self.vector_store = vector_store

    async def process_document(self) -> None:
        """Process uploaded document - extract text and create chunks."""
        file_path = self.document.storage_path
        file_ext = Path(file_path).suffix.lower()

        # Extract text based on file type
        if file_ext == ".pdf":
            text, page_breaks = self.extract_text_from_pdf(file_path)
        elif file_ext == ".docx":
            text = self.extract_text_from_docx(file_path)
            page_breaks = []  # DOCX doesn't have reliable page info
        elif file_ext == ".txt":
            text = Path(file_path).read_text(encoding="utf-8")
            page_breaks = []
        else:
            raise ValueError(f"Unsupported file type: {file_ext}")

        # Chunk the text
        chunks = self.chunk_text(text, settings.CHUNK_SIZE, settings.CHUNK_OVERLAP)

        if not chunks:
            return

        # Generate embeddings for all chunks at once (batched)
        embeddings = embed_texts(chunks)

        # Store chunks in DB and vector store
        for i, (chunk_text, embedding) in enumerate(zip(chunks, embeddings)):
            chunk_id = uuid.uuid4()
            embedding_id = str(chunk_id)

            # Determine page number for this chunk
            page_number = self._get_page_for_position(i * (settings.CHUNK_SIZE - settings.CHUNK_OVERLAP), page_breaks)

            # Store in PostgreSQL
            db_chunk = DocumentChunk(
                id=chunk_id,
                document_id=self.document.id,
                chunk_index=i,
                page_number=page_number,
                text_content=chunk_text,
                token_count=len(chunk_text.split()),  # Approximate token count
                embedding_id=embedding_id,
            )
            self.db.add(db_chunk)

            # Store in Qdrant
            self.vector_store.upsert(
                point_id=embedding_id,
                vector=embedding,
                payload={
                    "document_id": str(self.document.id),
                    "document_name": self.document.filename,
                    "chunk_index": i,
                    "page_number": page_number,
                    "text_content": chunk_text,
                },
            )

        # Update document with page count if PDF
        if file_ext == ".pdf" and page_breaks:
            self.document.num_pages = len(page_breaks) + 1

        self.db.commit()

    def extract_text_from_pdf(self, file_path: str) -> tuple[str, list[int]]:
        """Extract text from PDF file. Returns (full_text, page_break_positions)."""
        reader = PdfReader(file_path)
        text_parts = []
        page_breaks = []  # Character positions where pages end
        current_pos = 0

        for page in reader.pages:
            page_text = page.extract_text() or ""
            text_parts.append(page_text)
            current_pos += len(page_text)
            page_breaks.append(current_pos)

        return "\n".join(text_parts), page_breaks

    def extract_text_from_docx(self, file_path: str) -> str:
        """Extract text from DOCX file."""
        doc = DocxDocument(file_path)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n\n".join(paragraphs)

    def chunk_text(
        self,
        text: str,
        chunk_size: int = 512,
        overlap: int = 128,
    ) -> list[str]:
        """Split text into overlapping chunks."""
        text = text.strip()
        if not text:
            return []

        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            if chunk.strip():
                chunks.append(chunk.strip())
            start = end - overlap
            if start >= len(text):
                break

        return chunks

    def _get_page_for_position(self, char_position: int, page_breaks: list[int]) -> int | None:
        """Get page number (1-indexed) for a character position."""
        if not page_breaks:
            return None
        for i, break_pos in enumerate(page_breaks):
            if char_position < break_pos:
                return i + 1
        return len(page_breaks)
