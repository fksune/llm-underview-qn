# Restaurant Feedback System

A full-stack application for collecting and analyzing restaurant reviews with LLM-powered sentiment analysis and real-time admin dashboard updates.

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Backend** | FastAPI (Python) | Async-native, built-in WebSocket support, automatic OpenAPI docs |
| **Frontend** | React 19 + React Router v8 | SSR-capable, streaming, modern routing with React Router v8 |
| **Styling** | Tailwind CSS v4 | Utility-first, zero-runtime CSS, quick iteration |
| **Database** | PostgreSQL via Neon (serverless) | Scalable, async driver (asyncpg), JSONB for structured LLM output |
| **ORM** | SQLAlchemy 2.0 (async) | Mature, type-safe, great PostgreSQL dialect support |
| **LLM** | Groq API (gemma2-9b-it) | Free tier, low latency, structured JSON output with `response_format` |
| **Auth** | JWT (python-jose) | Stateless, simple admin authentication |
| **Real-time** | WebSockets (FastAPI native) | Native async WebSocket support, no extra dependencies |

## Setup

### Prerequisites

- Python 3.13+ with [uv](https://docs.astral.sh/uv/)
- [Bun](https://bun.sh/) v1.3+
- A Neon PostgreSQL database (or any PostgreSQL instance)
- A Groq API key (free at https://console.groq.com)

### 1. Environment Variables

Copy the `.env` file in `apps/api/` and edit with your values:

```env
DATABASE_URL=postgresql+asyncpg://user:password@your-neon-host/dbname
GROQ_API_KEY=gsk_your_groq_api_key
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
JWT_SECRET=generate-a-random-secret-here
```

### 2. Backend

```bash
cd apps/api
uv sync
uv run fastapi dev main.py
```

The API starts at `http://localhost:8000` with docs at `http://localhost:8000/docs`.

### 3. Frontend

```bash
cd apps/web
bun install
bun run dev
```

The frontend starts at `http://localhost:5173`. The Vite dev server proxies `/api` and `/ws` to the backend.

### 4. Combined (from root)

```bash
# Terminal 1
npm run dev:backend

# Terminal 2
npm run dev:web
```

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/login` | Public | Admin login, returns JWT |
| `POST` | `/api/feedback` | Public | Submit a restaurant review |
| `GET` | `/api/insights` | Bearer JWT | Fetch all processed feedback |
| `WS` | `/ws?token=<JWT>` | Bearer JWT query param | Real-time updates for new feedback |

## WebSocket Testing

### Using wscat

```bash
# Install wscat
npm install -g wscat

# 1. Login to get a token
TOKEN=$(curl -s -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 2. Connect to WebSocket
wscat -c "ws://localhost:8000/ws?token=$TOKEN"
```

### Using curl + a WebSocket client

```bash
# Get a token first
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Submit feedback in another terminal while WebSocket is connected
curl -X POST http://localhost:8000/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"raw_text":"The pizza was cold and the service was rude. I think I got food poisoning."}'
```

The WebSocket client should receive the new feedback record in real-time.

## Project Structure

```
apps/
├── api/
│   ├── .env                  # Environment variables
│   ├── main.py               # FastAPI app, CORS, routes, WebSocket
│   ├── config.py             # Pydantic settings from env
│   ├── database.py           # Async SQLAlchemy engine + session
│   ├── models.py             # Feedback ORM model
│   ├── schemas.py            # Pydantic request/response models
│   ├── auth.py               # JWT creation, validation, login endpoint
│   ├── crud.py               # Database operations
│   ├── llm.py                # Groq API integration
│   └── websocket_manager.py  # WebSocket connection pool
└── web/
    └── app/
        ├── root.tsx           # Root layout with AuthProvider
        ├── routes.ts          # Route definitions
        ├── lib/
        │   ├── api.ts         # API client helpers
        │   └── auth.tsx       # Auth context + provider
        └── routes/
            ├── feedback.tsx   # Public review form (/)
            ├── login.tsx      # Admin login (/login)
            └── dashboard.tsx  # Protected dashboard (/dashboard)
```

## LLM Processing

When a review is submitted via `POST /api/feedback`, the backend:

1. Sends the raw text to Groq's `gemma2-9b-it` model
2. Requests structured JSON with `response_format: {type: "json_object"}`
3. Parses the response into: `sentiment`, `key_items`, `requires_action`
4. Stores the result in PostgreSQL
5. Broadcasts the record to all connected admin WebSocket clients

## Security Notes

- The `/api/insights` and `/ws` endpoints require a valid JWT with admin credentials
- Admin credentials are configured via environment variables (not hardcoded in source)
- The feedback submission endpoint is intentionally public
- JWT secrets should be rotated regularly in production
- Use HTTPS/WSS in production to encrypt tokens in transit