# Talking Bird

Document-grounded AI assistant for Office of Research. Answers queries using **only** uploaded documents with strict source attribution.

## What It Does

- Upload PDFs, DOCX, or TXT files
- Ask natural language questions
- Get answers grounded **only** in your documents
- See source citations with page numbers
- Confidence scoring (high/medium/low)
- Refuses to answer if info isn't in documents

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | FastAPI + Python 3.11 |
| Database | PostgreSQL 16 |
| Vector DB | Qdrant |
| LLM | Groq (Llama 3.3 70B) - **FREE** |
| Embeddings | sentence-transformers/all-mpnet-base-v2 (768 dims) |
| Reranking | cross-encoder/ms-marco-MiniLM-L-12-v2 |
| Frontend | Next.js 14 + TypeScript + Tailwind |

## RAG Pipeline

```
Query → Query Expansion (LLM) → Hybrid Search (Vector + BM25) → RRF Fusion → Cross-Encoder Reranking → Answer Generation
```

1. **Query Expansion**: LLM generates 2 alternative phrasings for better recall
2. **Hybrid Search**: Combines semantic (vector) and lexical (BM25) search
3. **Reciprocal Rank Fusion**: Merges rankings from both search methods
4. **Cross-Encoder Reranking**: Re-scores top candidates for precision
5. **Grounded Generation**: LLM answers using only retrieved chunks with citations

---

## Quick Start (5 minutes)

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- [Groq API Key](https://console.groq.com/keys) (free, takes 30 seconds)

### 1. Clone the repo

```bash
git clone <repository-url>
cd talking-bird
```

### 2. Create environment file

```bash
# Copy the example env file
cp .env.example .env
```

Edit `.env` and add your Groq API key:
```properties
GROQ_API_KEY=gsk_your_key_here
```

### 3. Start everything

```bash
docker-compose up -d
```

Wait ~2 minutes for first build (downloads ML models).

### 4. Create admin user

```bash
docker-compose exec backend python scripts/create_admin.py
```

Default credentials: `admin@talkingbird.com` / `admin123`

### 5. Access the app

| Service | URL |
|---------|-----|
| API Docs (Swagger) | http://localhost:8000/docs |
| Backend Health | http://localhost:8000/health |
| Frontend | http://localhost:3000 |
| Qdrant Dashboard | http://localhost:6333/dashboard |

---

## Using the API

### Step 1: Login

**POST** `/api/v1/auth/login`
```json
{
  "email": "admin@talkingbird.com",
  "password": "admin123"
}
```

Copy the `access_token` from response.

### Step 2: Upload Documents

**POST** `/api/v1/documents/upload`

- Click "Authorize" in Swagger and paste your token
- Upload PDF, DOCX, or TXT files (max 50MB)

### Step 3: Ask Questions

**POST** `/api/v1/query`
```json
{
  "query": "What programs does the university offer?",
  "max_chunks": 5
}
```

Response includes:
- `answer` - Grounded response with citations
- `confidence` - high/medium/low
- `sources` - Document excerpts with page numbers
- `processing_time_ms` - Response time

---

## Project Structure

```
talking-bird/
├── .env                    # Environment variables (create from .env.example)
├── docker-compose.yml      # Container orchestration
├── backend/
│   ├── app/
│   │   ├── api/            # REST endpoints (auth, documents, query)
│   │   ├── core/           # Database, security, vector store
│   │   ├── models/         # SQLAlchemy + Pydantic models
│   │   └── services/       # Document processing, retrieval, LLM
│   ├── scripts/            # Admin scripts
│   ├── uploads/            # Uploaded documents (gitignored)
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── app/            # Next.js pages
│       ├── components/     # React components
│       └── lib/            # API client
└── docs/                   # Sample documents for testing
```

---

## API Reference

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/login` | Get JWT token | No |
| GET | `/api/v1/auth/me` | Current user info | Yes |
| POST | `/api/v1/documents/upload` | Upload document | Yes |
| GET | `/api/v1/documents` | List documents | Yes |
| DELETE | `/api/v1/documents/{id}` | Delete document | Yes |
| POST | `/api/v1/query` | Submit query | Yes |
| GET | `/health` | Health check | No |

---

## Configuration

All config is via environment variables in `.env`:

```properties
# Required
GROQ_API_KEY=gsk_...              # Get from console.groq.com

# Database (defaults work with Docker)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/talkingbird

# Embeddings
EMBEDDING_MODEL=sentence-transformers/all-mpnet-base-v2

# Retrieval tuning
TOP_K_CHUNKS=10                   # Chunks to retrieve per query
SIMILARITY_THRESHOLD=0.55         # Min similarity (0-1)
CHUNK_SIZE=400                    # Characters per chunk
CHUNK_OVERLAP=100                 # Overlap between chunks

# Security (change in production!)
SECRET_KEY=change-this-in-production
```

---

## Common Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs backend --follow

# Rebuild after code changes
docker-compose build backend
docker-compose up -d backend

# Access backend shell
docker-compose exec backend bash

# Check container status
docker-compose ps
```

---

## Troubleshooting

### Backend won't start
```bash
docker-compose logs backend --tail 50
```

Common issues:
- **"GROQ_API_KEY not set"** → Add your key to `.env`
- **"Can't connect to postgres"** → Wait for postgres to be healthy, or run `docker-compose down && docker-compose up -d`

### Queries return "Not sure" for everything
- Check if documents processed: `GET /api/v1/documents` should show `processing_status: "processed"` and `num_pages` populated
- Scanned PDFs (images) won't work - only text-based PDFs

### Slow first startup
Normal - downloads ~500MB of ML models on first run. Subsequent starts are fast.

---

## Development

### Backend (without Docker)

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend (without Docker)

```bash
cd frontend
npm install
npm run dev
```

---

## Known Limitations

- **Scanned PDFs** - Not supported (need OCR)
- **Large files** - 16MB+ PDFs may take 10-30 seconds to process
- **No user registration** - Only admin user via script

---

## License

MIT
