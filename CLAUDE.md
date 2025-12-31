# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Victus (MacroTrack) is an adaptive daily nutrition planning app that calculates personalized macro targets based on biometrics, planned training, and historical data. It learns from actual weight/intake history to provide increasingly accurate TDEE recommendations.

## Commands

### Backend (Go)
```bash
cd backend
go run ./cmd/server           # Run server (port 8080)
go test ./...                 # Run all tests
go test ./internal/api        # Run tests for specific package
go build ./cmd/server         # Build binary
```

### Frontend (React + Vite + Tailwind)
```bash
cd frontend
npm install                   # Install dependencies
npm run dev                   # Dev server (port 5173)
npm run build                 # Production build
npm run preview               # Preview production build
```

### Full Stack (Docker)
```bash
docker compose up --build     # Start full stack with hot reload
```

## Architecture

### Backend Structure
- `cmd/server/main.go` - Entry point, env loading, graceful shutdown
- `internal/api/` - HTTP handlers, routing, middleware (CORS, logging)
- `internal/db/` - SQLite connection using modernc.org/sqlite (pure Go)
- `internal/models/` - Data models (to be implemented per PRD)

Uses standard library `net/http` with `http.ServeMux` for routing. No external router framework.

### Frontend Structure
- `src/pages/` - Page components
- `src/components/` - Reusable UI components (to be organized per PRD)
- `src/hooks/` - Custom React hooks (to be implemented)
- `src/api/` - API client (to be implemented)

Vite proxies `/api` requests to the backend.

### Key Domain Concepts (from PRD)
- **Day Types**: `performance`, `fatburner`, `metabolize` - determine macro multipliers
- **Training Types**: rest, light_cardio, moderate_cardio, hiit, strength_upper/lower/full, calisthenics, mobility, mixed
- **Adaptive TDEE**: Uses weight trends + intake history to refine calorie estimates
- **Training Load**: Acute (7-day) vs Chronic (28-day) load ratio for periodization-aware nutrition
- **Points System**: Converts gram-based macros to meal-level "points" for easier tracking

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Backend server port |
| `DB_PATH` | `data/victus.sqlite` | SQLite database file |
| `CORS_ALLOWED_ORIGIN` | `*` | CORS origin |

## Review Agents

Custom Claude commands are available in `.claude/commands/` for code review:
- `/balance-review` - Over-abstraction, DRY, indirection/hop budget, effects visibility
- `/complexity-review` - Readability and cognitive complexity
- `/ddd-review` - Domain-driven design patterns
- `/performance-review` - Performance and scalability
- `/testing-review` - Test coverage and quality
- `/secure-design-agent` - Security review
- `/qa` - OpenAPI contract completeness
- `/adaptive-model` - Model and data integrity

## Go Style Guidelines

- Interfaces at consumer site, only when 2+ implementations or hard boundary
- Hop budget: target ≤3 hops (handler → service → store)
- No boomerang flows (A → B → A)
- Signature honesty: functions with `ctx context.Context` may do I/O, without must be pure
- Domain packages must be pure (no infra imports)
- Sandwich structure: read → compute → write
