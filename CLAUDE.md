# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Victus is an adaptive daily nutrition planning app that calculates personalized macro targets based on biometrics, planned training, and historical data. It learns from actual weight/intake history to provide increasingly accurate TDEE recommendations.

## Communication Style

- Do not narrate your thinking or planning process. No "Let me look at..." or "I'll now..." preamble.
- Do not provide a summary or recap at the end of a response. Stop after the work is done.
- Be terse. Token efficiency matters. Only speak when there is something the user needs to know or a decision to make.

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
npm run test                  # Run unit tests (vitest watch mode)
npm run test:run              # Run unit tests once
npm run test:coverage         # Run tests with coverage
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
make seed                     # Seed database with 4 weeks of test data
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

**Core Resources**
- `GET /api/health` - Health check
- `GET/PUT/DELETE /api/profile` - User profile CRUD

**Daily Logs**
- `POST /api/logs` - Create daily log with calculated targets
- `GET /api/logs` - Get logs by date range
- `GET/DELETE /api/logs/today` - Today's log operations
- `GET /api/logs/{date}` - Get log by date
- `PATCH /api/logs/{date}/actual-training` - Update actual training sessions
- `PATCH /api/logs/{date}/active-calories` - Update active calories (health sync)
- `PATCH /api/logs/{date}/fasting-override` - Override fasting window
- `PATCH /api/logs/{date}/health-sync` - Sync with health data sources
- `PATCH /api/logs/{date}/consumed-macros` - Add consumed macro entry
- `GET /api/logs/{date}/insight` - AI-generated day insight

**Training & Body Status**
- `GET /api/training-configs` - Training type configurations (MET, load scores)
- `GET /api/body-status` - Current fatigue/readiness status
- `GET /api/archetypes` - Fatigue archetype definitions
- `POST /api/fatigue/apply` - Apply fatigue by parameters
- `POST /api/sessions/{id}/apply-load` - Apply training load to session

**Statistics & Calendar**
- `GET /api/stats/weight-trend` - Weight trend with regression analysis
- `GET /api/stats/history` - Historical summary with training compliance
- `GET /api/stats/monthly-summaries` - Monthly aggregate data
- `GET /api/calendar/summary` - Calendar visualization with normalized metrics

**Planning & Day Types**
- `GET/PUT/DELETE /api/planned-days/{date}` - Planned day types for calendar
- `GET /api/food-reference` - Food reference library listing
- `PATCH /api/food-reference/{id}` - Update food reference item

**Nutrition Plans**
- `POST /api/plans` - Create nutrition plan
- `GET /api/plans` - List all plans
- `GET /api/plans/active` - Get active plan
- `GET /api/plans/current-week` - Current week target
- `GET /api/plans/active/analysis` - Analyze active plan variance
- `GET /api/plans/{id}` - Get plan by ID
- `GET /api/plans/{id}/analysis` - Dual-track variance analysis
- `POST /api/plans/{id}/complete` - Complete plan
- `POST /api/plans/{id}/abandon` - Abandon plan
- `POST /api/plans/{id}/pause` - Pause plan
- `POST /api/plans/{id}/resume` - Resume plan
- `POST /api/plans/{id}/recalibrate` - Apply recalibration strategy
- `DELETE /api/plans/{id}` - Delete plan

**Training Programs**
- `GET /api/training-programs` - List training programs
- `POST /api/training-programs` - Create training program
- `GET /api/training-programs/{id}` - Get program details
- `DELETE /api/training-programs/{id}` - Delete program
- `GET /api/training-programs/{id}/waveform` - Get program waveform visualization
- `POST /api/training-programs/{id}/install` - Install program to calendar

**Program Installations**
- `GET /api/program-installations/active` - Get active program installation
- `GET /api/program-installations/{id}` - Get installation details
- `POST /api/program-installations/{id}/abandon` - Abandon installation
- `DELETE /api/program-installations/{id}` - Delete installation
- `GET /api/program-installations/{id}/sessions` - Get scheduled sessions

**Metabolic Flux Engine**
- `GET /api/metabolic/chart` - Metabolic rate chart data
- `GET /api/metabolic/notification` - Get pending metabolic notifications
- `POST /api/metabolic/notification/{id}/dismiss` - Dismiss notification

**Weekly Debrief (Mission Report)**
- `GET /api/debrief/weekly` - Get weekly debrief report
- `GET /api/debrief/weekly/{date}` - Get debrief for specific week
- `GET /api/debrief/current` - Get current week debrief

**Data Import**
- `POST /api/import/garmin` - Upload Garmin data file

**Body Issues (Semantic Tagger)**
- `POST /api/body-issues` - Create body issues entry
- `GET /api/body-issues/active` - Get active body issues
- `GET /api/body-issues/modifiers` - Get fatigue modifiers from body issues
- `GET /api/body-issues/vocabulary` - Get semantic vocabulary

**Strategy Auditor**
- `GET /api/audit/status` - Get audit status (Check Engine light)

**Macro Tetris Solver**
- `POST /api/solver/solve` - Solve macro puzzle with food combinations

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

## Key Features

### Adaptive Load & Fatigue Management
The app tracks training load via RPE (Rate of Perceived Exertion) and applies cumulative fatigue using archetypes. The **Semantic Body** system allows tagging specific body issues (e.g., "left knee soreness") which apply fatigue modifiers to relevant training types.

### Metabolic Flux Engine
Tracks metabolic rate adaptations over time based on actual intake and weight changes. Provides notifications when recalibration is recommended due to significant metabolic shifts.

### Training Program Management
Create multi-week training programs with periodization. Programs can be installed to the calendar, automatically populating planned training sessions. Includes waveform visualization for load planning.

### Nutrition Plans with Dual-Track Analysis
Plans track both target macros and actual intake. The analysis endpoint provides variance metrics and suggests recalibration strategies based on adherence and weight trends.

### Macro Tetris Solver
AI-powered meal planning that solves for food combinations matching target macros. Uses Ollama to generate creative recipe names for solved combinations.

### Weekly Debrief (Mission Report)
Generates comprehensive weekly summaries with AI insights covering training compliance, nutrition adherence, weight trends, and metabolic changes.

### Strategy Auditor (Check Engine Light)
Monitors system state for inconsistencies (e.g., outdated plans, missed training, metabolic drift) and surfaces actionable warnings.

### Garmin Data Import
Supports bulk import of Garmin training data to backfill historical training sessions and monthly summaries.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Backend server port |
| `DB_PATH` | `data/victus.sqlite` | SQLite database file (use `:memory:` for tests) |
| `OLLAMA_URL` | `http://localhost:11434` | Ollama API endpoint for AI features (insights, recipe naming) |
| `CORS_ALLOWED_ORIGIN` | `*` | CORS origin |

## CI/CD

GitHub Actions runs on push/PR to main:
1. Backend tests with race detection
2. Frontend build verification
3. E2E tests with Cypress

## Review Agents

Custom Claude commands in `.claude/commands/` for code review:
- `/ddd-review` - Domain-driven design patterns
- `/frontend-review` - React/TypeScript correctness, performance (skip accessibility)
- `/testing-review` - Test coverage and quality

## Go Style Guidelines

- Interfaces at consumer site, only when 2+ implementations or hard boundary
- Hop budget: target ≤3 hops (handler → service → store)
- No boomerang flows (A → B → A)
- Signature honesty: functions with `ctx context.Context` may do I/O, without must be pure
- Domain packages must be pure (no infra imports)
- Sandwich structure: read → compute → write
