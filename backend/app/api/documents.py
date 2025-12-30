"""Document management API endpoints."""

from fastapi import APIRouter

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload")
async def upload_document() -> dict[str, str]:
    """Upload document endpoint - to be implemented."""
    return {"message": "Upload endpoint"}


@router.get("")
async def list_documents() -> dict[str, str]:
    """List documents endpoint - to be implemented."""
    return {"message": "List documents endpoint"}


@router.delete("/{document_id}")
async def delete_document(document_id: str) -> dict[str, str]:
    """Delete document endpoint - to be implemented."""
    return {"message": f"Delete document {document_id}"}



