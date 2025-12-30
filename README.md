# Talking Bird 🐦

Document-grounded AI assistant for Office of Research. Answers queries using **only** uploaded documents with strict source attribution.

## Features

- Natural language queries over uploaded documents
- Semantic search with similarity thresholds
- Grounded answers with source citations
- Confidence scoring (high/medium/low)
- "Not sure" fallback when answers aren't in documents
- Document management (upload, list, delete)
- JWT-based authentication

## Tech Stack

- **Backend:** FastAPI, PostgreSQL, Qdrant, OpenAI API
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Embeddings:** sentence-transformers/all-MiniLM-L6-v2

## Quick Start

### Prerequisites

- Docker & Docker Compose
- OpenAI API key

### 1. Clone and configure

```bash
git clone <repository-url>
cd talking-bird
cp env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### 2. Start with Docker Compose

```bash
docker-compose up -d
```

Services:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Qdrant: http://localhost:6333

### 3. Run database migrations

```bash
docker-compose exec backend alembic upgrade head
```

## Development Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
talking-bird/
├── backend/
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── core/         # Database, security, vector store
│   │   ├── models/       # SQLAlchemy & Pydantic models
│   │   ├── services/     # Business logic
│   │   └── utils/        # Logging, exceptions
│   ├── tests/
│   └── alembic/          # Database migrations
├── frontend/
│   └── src/
│       ├── app/          # Next.js pages
│       ├── components/   # React components
│       └── lib/          # API client, types
├── docker-compose.yml
└── .env.example
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/login | User login |
| POST | /api/v1/documents/upload | Upload document |
| GET | /api/v1/documents | List documents |
| DELETE | /api/v1/documents/{id} | Delete document |
| POST | /api/v1/query | Submit query |
| GET | /api/v1/queries/history | Query history |
| GET | /health | Health check |

## Configuration

See `env.example` for all configuration options (rename to `.env`). Key settings:

- `OPENAI_API_KEY` - Required for answer generation
- `DATABASE_URL` - PostgreSQL connection string
- `SIMILARITY_THRESHOLD` - Minimum cosine similarity (default: 0.65)
- `TOP_K_CHUNKS` - Number of chunks to retrieve (default: 5)

## License

MIT

