"""Document processing service."""

import re
import uuid
from pathlib import Path

import pdfplumber
from docx import Document as DocxDocument
from sqlalchemy.orm import Session

from app.config import settings
from app.core.vector_store import VectorStore
from app.models.database import Document, DocumentChunk
from app.services.embeddings import embed_texts


# Common abbreviations that shouldn't trigger sentence splits
ABBREVIATIONS = frozenset([
    "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "vs", "etc", "inc", "ltd",
    "corp", "co", "no", "vol", "pg", "pp", "fig", "al", "ed", "rev",
])


def is_sentence_boundary(text: str, pos: int) -> bool:
    """Check if position after punctuation is a real sentence boundary."""
    if pos >= len(text):
        return True
    
    # Must be followed by whitespace then uppercase or digit
    remaining = text[pos:]
    if not remaining or not remaining[0].isspace():
        return False
    
    # Find next non-space character
    next_char_idx = 0
    for i, c in enumerate(remaining):
        if not c.isspace():
            next_char_idx = i
            break
    else:
        return False
    
    next_char = remaining[next_char_idx]
    if not (next_char.isupper() or next_char.isdigit() or next_char in '"\'(['):
        return False
    
    # Check if preceded by abbreviation
    # Look backwards for the word before the punctuation
    word_end = pos - 1  # Position of the punctuation
    if word_end < 0:
        return True
    
    word_start = word_end
    while word_start > 0 and text[word_start - 1].isalpha():
        word_start -= 1
    
    word = text[word_start:word_end].lower()
    if word in ABBREVIATIONS:
        return False
    
    # Single capital letter followed by period (like initials "J.")
    if len(word) == 1 and word.isalpha():
        return False
    
    return True


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

        # Chunk the text using sentence-aware chunking
        chunks = self.chunk_text_by_sentences(
            text, settings.CHUNK_SIZE, settings.CHUNK_OVERLAP
        )

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
        """
        Extract text from PDF file using pdfplumber.

        Handles both regular text and tables, converting tables to readable
        markdown-style format for better semantic understanding.

        Returns (full_text, page_break_positions).
        """
        text_parts = []
        page_breaks = []
        current_pos = 0

        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = self._extract_page_content(page)
                text_parts.append(page_text)
                current_pos += len(page_text)
                page_breaks.append(current_pos)

        return "\n\n".join(text_parts), page_breaks

    def _extract_page_content(self, page) -> str:
        """
        Extract content from a single PDF page, handling tables specially.

        Strategy:
        1. Detect tables on the page
        2. Extract tables as structured text
        3. Extract remaining text (outside tables)
        4. Combine in reading order
        """
        tables = page.find_tables()

        if not tables:
            # No tables - just extract text normally
            text = page.extract_text() or ""
            return text.strip()

        # Get table bounding boxes to exclude from text extraction
        table_bboxes = [table.bbox for table in tables]

        # Extract text outside tables
        # Filter out characters that fall within table regions
        chars_outside_tables = []
        for char in page.chars:
            char_center_y = (char["top"] + char["bottom"]) / 2
            char_center_x = (char["x0"] + char["x1"]) / 2
            in_table = False
            for bbox in table_bboxes:
                # bbox is (x0, top, x1, bottom)
                if (bbox[0] <= char_center_x <= bbox[2] and
                    bbox[1] <= char_center_y <= bbox[3]):
                    in_table = True
                    break
            if not in_table:
                chars_outside_tables.append(char)

        # Build text from chars outside tables (simplified approach)
        # Group chars by approximate y position (line)
        if chars_outside_tables:
            # Use pdfplumber's text extraction on filtered chars
            filtered_page = page.filter(
                lambda obj: obj["object_type"] != "char" or any(
                    abs(obj["x0"] - c["x0"]) < 1 and abs(obj["top"] - c["top"]) < 1
                    for c in chars_outside_tables
                )
            )
            outside_text = filtered_page.extract_text() or ""
        else:
            outside_text = ""

        # Extract tables and convert to readable format
        table_texts = []
        for table in tables:
            table_data = table.extract()
            if table_data:
                formatted = self._format_table(table_data)
                if formatted:
                    table_texts.append(formatted)

        # Combine text and tables (tables after main text for simplicity)
        # In a more sophisticated version, we'd interleave by y-position
        parts = []
        if outside_text.strip():
            parts.append(outside_text.strip())
        for tt in table_texts:
            parts.append(tt)

        return "\n\n".join(parts)

    def _format_table(self, table_data: list[list]) -> str:
        """
        Convert table data to readable text format.

        Uses a simple markdown-like format that preserves structure
        while being easy for embeddings/LLM to understand.
        """
        if not table_data or not table_data[0]:
            return ""

        # Clean up cells (remove None, strip whitespace)
        cleaned = []
        for row in table_data:
            cleaned_row = [
                (cell.strip() if isinstance(cell, str) else str(cell) if cell else "")
                for cell in row
            ]
            # Skip completely empty rows
            if any(cleaned_row):
                cleaned.append(cleaned_row)

        if not cleaned:
            return ""

        # Format as pipe-separated table (markdown style)
        lines = []

        # Assume first row is header
        header = cleaned[0]
        lines.append("| " + " | ".join(header) + " |")
        lines.append("|" + "|".join(["---"] * len(header)) + "|")

        for row in cleaned[1:]:
            # Pad row if needed
            while len(row) < len(header):
                row.append("")
            lines.append("| " + " | ".join(row[:len(header)]) + " |")

        return "\n".join(lines)

    def extract_text_from_docx(self, file_path: str) -> str:
        """Extract text from DOCX file."""
        doc = DocxDocument(file_path)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n\n".join(paragraphs)

    def split_into_sentences(self, text: str) -> list[str]:
        """Split text into sentences using boundary detection."""
        # Normalize whitespace first
        text = re.sub(r"\s+", " ", text.strip())
        if not text:
            return []

        sentences = []
        current_start = 0

        # Find sentence-ending punctuation and check if it's a real boundary
        for i, char in enumerate(text):
            if char in ".!?":
                if is_sentence_boundary(text, i + 1):
                    sentence = text[current_start:i + 1].strip()
                    if sentence:
                        sentences.append(sentence)
                    # Skip whitespace to find start of next sentence
                    current_start = i + 1
                    while current_start < len(text) and text[current_start].isspace():
                        current_start += 1

        # Don't forget the last part
        if current_start < len(text):
            remaining = text[current_start:].strip()
            if remaining:
                sentences.append(remaining)

        # If no splits occurred, fall back to paragraph splitting
        if len(sentences) <= 1 and len(text) > 200:
            paragraphs = re.split(r"\n\s*\n", text)
            if len(paragraphs) > 1:
                sentences = [p.strip() for p in paragraphs if p.strip()]

        return sentences if sentences else [text]

    def chunk_text_by_sentences(
        self,
        text: str,
        target_chunk_size: int = 512,
        overlap_size: int = 128,
    ) -> list[str]:
        """
        Split text into overlapping chunks at sentence boundaries.

        Strategy:
        1. Split text into sentences
        2. Greedily combine sentences until we exceed target_chunk_size
        3. For overlap, include sentences from end of previous chunk that fit in overlap_size
        """
        sentences = self.split_into_sentences(text)
        if not sentences:
            return []

        # If total text is small enough, return as single chunk
        total_len = sum(len(s) for s in sentences) + len(sentences) - 1
        if total_len <= target_chunk_size:
            return [" ".join(sentences)]

        chunks = []
        current_chunk_sentences: list[str] = []
        current_length = 0

        for sentence in sentences:
            sentence_len = len(sentence)

            # If single sentence exceeds target, it becomes its own chunk
            # (we never split mid-sentence)
            if sentence_len > target_chunk_size:
                # Flush current chunk first
                if current_chunk_sentences:
                    chunks.append(" ".join(current_chunk_sentences))
                chunks.append(sentence)
                current_chunk_sentences = []
                current_length = 0
                continue

            # Check if adding this sentence would exceed target
            new_length = current_length + sentence_len + (1 if current_chunk_sentences else 0)

            if new_length > target_chunk_size and current_chunk_sentences:
                # Flush current chunk
                chunks.append(" ".join(current_chunk_sentences))

                # Build overlap from end of previous chunk
                overlap_sentences = self._get_overlap_sentences(
                    current_chunk_sentences, overlap_size
                )
                current_chunk_sentences = overlap_sentences + [sentence]
                current_length = sum(len(s) for s in current_chunk_sentences) + len(
                    current_chunk_sentences
                ) - 1
            else:
                current_chunk_sentences.append(sentence)
                current_length = new_length

        # Don't forget the last chunk
        if current_chunk_sentences:
            chunks.append(" ".join(current_chunk_sentences))

        return chunks

    def _get_overlap_sentences(
        self, sentences: list[str], max_overlap_chars: int
    ) -> list[str]:
        """Get sentences from end of list that fit within max_overlap_chars."""
        overlap = []
        total_len = 0

        for sentence in reversed(sentences):
            sentence_len = len(sentence) + (1 if overlap else 0)
            if total_len + sentence_len > max_overlap_chars:
                break
            overlap.insert(0, sentence)
            total_len += sentence_len

        return overlap

    def _get_page_for_position(self, char_position: int, page_breaks: list[int]) -> int | None:
        """Get page number (1-indexed) for a character position."""
        if not page_breaks:
            return None
        for i, break_pos in enumerate(page_breaks):
            if char_position < break_pos:
                return i + 1
        return len(page_breaks)
