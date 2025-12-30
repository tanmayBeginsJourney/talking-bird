"""Authentication API endpoints."""

from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login() -> dict[str, str]:
    """Login endpoint - to be implemented."""
    return {"message": "Login endpoint"}



