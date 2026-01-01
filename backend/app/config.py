"""Application configuration using Pydantic BaseSettings."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # App
    APP_NAME: str = "Talking Bird"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/talkingbird"

    # Vector DB
    VECTOR_DB_HOST: str = "localhost"
    VECTOR_DB_PORT: int = 6333
    COLLECTION_NAME: str = "office_of_research_docs"

    # LLM (Groq)
    GROQ_API_KEY: str = ""
    LLM_MODEL: str = "llama-3.3-70b-versatile"
    LLM_TEMPERATURE: float = 0.0

    # Embeddings - Using mpnet for better quality (768 dims vs 384)
    EMBEDDING_MODEL: str = "sentence-transformers/all-mpnet-base-v2"

    # Retrieval - More chunks for complex queries
    TOP_K_CHUNKS: int = 10
    SIMILARITY_THRESHOLD: float = 0.55
    CHUNK_SIZE: int = 400
    CHUNK_OVERLAP: int = 100

    # Security
    SECRET_KEY: str = "change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # File Storage
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 50

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()



