"""Query API endpoints."""

from fastapi import APIRouter

router = APIRouter(prefix="/query", tags=["query"])


@router.post("")
async def submit_query() -> dict[str, str]:
    """Submit query endpoint - to be implemented."""
    return {"message": "Query endpoint"}


@router.get("/history")
async def query_history() -> dict[str, str]:
    """Query history endpoint - to be implemented."""
    return {"message": "Query history endpoint"}



