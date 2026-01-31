# Victus

Scaffolded Go + React application with Docker-based development workflow.

## Backend (Go)

- Location: `backend`
- Entry point: `cmd/server/main.go`
- Health check: `GET /api/health`
- PostgreSQL database connection via `DATABASE_URL` environment variable.

### Running locally

```bash
cd backend
cp .env.example .env # optional customization
GOPROXY=https://proxy.golang.org,direct go mod tidy # download modules (requires network access)
go run ./cmd/server
```

## Frontend (React + Vite + Tailwind)

- Location: `frontend`
- Dev server runs on port `5173` by default with proxy to the backend.

### Running locally

```bash
cd frontend
npm install
npm run dev
```

## Docker Compose

A `docker-compose.yml` is provided to start the full stack with hot reload for the frontend and a PostgreSQL database for the backend.

```bash
docker compose up --build
```

Backend configuration is loaded from `backend/.env.example` by default. Override variables in a custom `.env` file if needed.

## Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `PORT` | Port for the Go HTTP server | `8080` |
| `DATABASE_URL` | PostgreSQL connection URL | - (required) |
| `CORS_ALLOWED_ORIGIN` | Allowed origin for CORS | `*` |
| `CORS_ALLOWED_METHODS` | Allowed HTTP methods | `GET,POST,PUT,DELETE,OPTIONS` |
| `CORS_ALLOWED_HEADERS` | Allowed headers | `Content-Type,Authorization` |
| `CORS_MAX_AGE` | CORS preflight cache duration | `3600` |

## Project Structure

```
backend/
  cmd/server/main.go
  internal/
    api/
    db/
    models/
frontend/
  src/
    api/
    components/
    hooks/
    pages/
README.md
```
