# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Victus is an adaptive daily nutrition planning app that calculates personalized macro targets based on biometrics, planned training, and historical data. It learns from actual weight/intake history to provide increasingly accurate TDEE recommendations.

## Commands

### Backend (Go)
```bash
cd backend
go run ./cmd/server           # Run server (port 8080)
go test ./...                 # Run all tests
go test -v ./internal/domain  # Run tests for specific package with verbose output
go test -run TestName ./...   # Run a single test by name
```

### Frontend (React + Vite + Tailwind)
```bash
cd frontend
npm run dev                   # Dev server (port 5173)
npm run build                 # Production build
```

### E2E Tests (Cypress + Cucumber)
```bash
make e2e-native               # Run E2E tests locally (recommended for macOS)
cd frontend && npm run e2e:open  # Open Cypress interactive mode
cd frontend && npm run e2e:run   # Run Cypress headless
```

### Full Stack
```bash
docker compose up --build     # Start full stack with Docker
make test                     # Run backend tests
```

## Architecture

### Backend Layered Architecture

The backend follows a clean architecture pattern with 4 distinct layers:

```
api/ → service/ → store/ → db/
         ↓
      domain/
```

- **api/** - HTTP handlers, request/response DTOs, routing, middleware
- **service/** - Business logic orchestration, calls domain functions and stores
- **store/** - Data persistence using SQLite, implements repository pattern
- **domain/** - Pure domain types and calculation functions (no I/O imports)
- **db/** - Database connection and migrations

**Data flow**: Handler parses request → Service orchestrates logic → Domain calculates → Store persists

### Key Backend Files
- `internal/domain/targets.go` - TDEE and macro calculation algorithms
- `internal/domain/types.go` - Core domain types (DayType, TrainingType, DailyTargets)
- `internal/service/dailylog.go` - Daily log creation with target calculation
- `internal/api/server.go` - Route definitions and middleware

### API Endpoints
- `GET /api/health` - Health check
- `GET/PUT/DELETE /api/profile` - User profile CRUD
- `POST /api/logs` - Create daily log with calculated targets
- `GET/DELETE /api/logs/today` - Today's log operations

### Frontend Structure
- `src/pages/` - Page components (App.tsx is main entry)
- `src/components/` - Organized by feature: `settings/`, `daily-input/`, `targets/`, `common/`
- `src/hooks/` - Data fetching hooks (useProfile, useDailyLog)
- `src/api/` - API client and TypeScript types

Vite proxies `/api` requests to the backend (port 8080).

### Key Domain Concepts
- **Day Types**: `performance`, `fatburner`, `metabolize` - determine macro multipliers
- **Training Types**: rest, qigong, walking, gmb, run, row, cycle, hiit, strength, calisthenics, mobility, mixed
- **BMR Equations**: mifflin_st_jeor (default), katch_mcardle, oxford_henry, harris_benedict
- **Points System**: Converts gram-based macros to meal-level "points" for easier tracking

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Backend server port |
| `DB_PATH` | `data/victus.sqlite` | SQLite database file (use `:memory:` for tests) |
| `CORS_ALLOWED_ORIGIN` | `*` | CORS origin |

## CI/CD

GitHub Actions runs on push/PR to main:
1. Backend tests with race detection
2. Frontend build verification
3. E2E tests with Cypress

## Review Agents

Custom Claude commands in `.claude/commands/` for code review:
- `/balance-review` - Over-abstraction, DRY, indirection/hop budget
- `/complexity-review` - Readability and cognitive complexity
- `/ddd-review` - Domain-driven design patterns
- `/testing-review` - Test coverage and quality
- `/qa` - OpenAPI contract completeness
- `/adaptive-model` - Model and data integrity

## Go Style Guidelines

- Interfaces at consumer site, only when 2+ implementations or hard boundary
- Hop budget: target ≤3 hops (handler → service → store)
- No boomerang flows (A → B → A)
- Signature honesty: functions with `ctx context.Context` may do I/O, without must be pure
- Domain packages must be pure (no infra imports)
- Sandwich structure: read → compute → write
