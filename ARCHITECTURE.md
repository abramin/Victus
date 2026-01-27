# Victus Architecture

A comprehensive technical reference for the Victus adaptive daily nutrition planning application.

## Table of Contents

1. [Overview](#1-overview)
2. [System Architecture](#2-system-architecture)
3. [Backend Architecture](#3-backend-architecture-go)
4. [Frontend Architecture](#4-frontend-architecture-reacttypescript)
5. [Domain Model](#5-domain-model)
6. [Domain Concepts](#6-domain-concepts)
7. [Database Schema](#7-database-schema)
8. [API Reference](#8-api-reference)
9. [Data Flow Patterns](#9-data-flow-patterns)
10. [Testing Architecture](#10-testing-architecture)
11. [Development & CI/CD](#11-development--cicd)

---

## 1. Overview

### 1.1 Project Purpose

Victus is an adaptive daily nutrition planning app that:
- Calculates personalized macro targets based on biometrics, training, and historical data
- Learns from actual weight/intake history to provide increasingly accurate TDEE recommendations
- Supports long-term planning with variance detection and recalibration options

### 1.2 Key Features

| Feature | Description |
|---------|-------------|
| Daily Log Creation | Morning check-in with weight, sleep, training, day type |
| Multiple Training Sessions | 0..N sessions per day with 12 training types |
| Day Type System | Performance, Fatburner, Metabolize strategies |
| TDEE Calculation | Formula, Manual, or Adaptive modes |
| Training Load (ACR) | Acute:Chronic workload ratio tracking |
| Recovery Scoring | Rest + ACR + Sleep composite score |
| Long-term Planning | Goal weight + duration with weekly targets |
| Dual-track Analysis | Plan vs actual variance detection |

### 1.3 Technology Stack

| Layer | Technology |
|-------|------------|
| Backend | Go 1.22+, net/http, database/sql |
| Database | SQLite |
| Frontend | React 19, TypeScript, React Router v7 |
| Styling | Tailwind CSS v4 |
| Build | Vite 7.3 |
| Charts | Recharts 3.7 |
| E2E Testing | Cypress 14.2 + Cucumber |

---

## 2. System Architecture

### 2.1 High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                              Browser                                 │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    React Frontend (SPA)                        │  │
│  │  Pages: Today | Kitchen | Strategy | Schedule | History | ...  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ HTTP (REST/JSON)
                                │ Port 5173 (dev) → Vite Proxy → 8080
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Go Backend API                               │
│  ┌─────────┐  ┌─────────────┐  ┌─────────┐  ┌─────────┐            │
│  │   API   │→ │   Service   │→ │  Store  │→ │   DB    │            │
│  │ Handlers│  │   Logic     │  │  Layer  │  │ SQLite  │            │
│  └─────────┘  └──────┬──────┘  └─────────┘  └─────────┘            │
│                      │                                               │
│               ┌──────▼──────┐                                        │
│               │   Domain    │  (Pure types & calculations)           │
│               └─────────────┘                                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Ports & Configuration

| Service | Port | Description |
|---------|------|-------------|
| Frontend Dev Server | 5173 | Vite development server |
| Backend API | 8080 | Go HTTP server |
| Vite Proxy | `/api/*` | Proxies to backend during dev |

---

## 3. Backend Architecture (Go)

### 3.1 Layered Architecture Pattern

```
HTTP Request
     │
     ▼
┌─────────────────────────────────────────────────────────┐
│  API Layer (api/)                                        │
│  - HTTP handlers, request parsing, response formatting   │
│  - Middleware (CORS, logging)                            │
│  - Request/Response DTOs (api/requests/)                 │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Service Layer (service/)                                │
│  - Business logic orchestration                          │
│  - Calls domain functions and stores                     │
│  - Transaction coordination                              │
└─────────────────────────┬───────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│  Domain Layer (domain/) │   │  Store Layer (store/)   │
│  - Pure types & enums   │   │  - SQLite persistence   │
│  - Calculation functions│   │  - Repository pattern   │
│  - Validation rules     │   │  - No business logic    │
│  - NO I/O imports       │   │  - Sentinel errors      │
└─────────────────────────┘   └───────────┬─────────────┘
                                          │
                                          ▼
                              ┌─────────────────────────┐
                              │  DB Layer (db/)         │
                              │  - SQLite connection    │
                              │  - Migrations           │
                              └─────────────────────────┘
```

### 3.2 Package Structure

```
backend/
├── cmd/
│   ├── server/main.go           # Application entry point
│   └── seed/main.go             # Database seeding utility
├── internal/
│   ├── api/                     # HTTP handlers & routing
│   │   ├── server.go            # Route definitions, middleware
│   │   ├── profile.go           # Profile endpoints
│   │   ├── dailylog.go          # Daily log endpoints
│   │   ├── plan.go              # Nutrition plan endpoints
│   │   ├── analysis.go          # Plan analysis endpoints
│   │   ├── trainingconfig.go    # Training config endpoints
│   │   ├── history.go           # History endpoints
│   │   ├── weighttrend.go       # Weight trend endpoints
│   │   ├── planneddays.go       # Planned days endpoints
│   │   ├── foodreference.go     # Food reference endpoints
│   │   └── requests/            # Request/Response DTOs
│   ├── service/                 # Business logic
│   │   ├── profile.go           # Profile service
│   │   ├── dailylog.go          # Daily log + calculations
│   │   ├── plan.go              # Nutrition plan service
│   │   ├── trainingconfig.go    # Training config service
│   │   └── analysis.go          # Analysis service
│   ├── store/                   # Data persistence
│   │   ├── profile.go           # User profile store
│   │   ├── dailylog.go          # Daily log store
│   │   ├── trainingsession.go   # Training sessions store
│   │   ├── trainingconfig.go    # Training configs store
│   │   ├── plan.go              # Nutrition plan store
│   │   ├── planneddaytype.go    # Planned day types store
│   │   └── foodreference.go     # Food reference store
│   ├── domain/                  # Pure domain types
│   │   ├── types.go             # Core enums & structs
│   │   ├── constants.go         # Domain constants
│   │   ├── targets.go           # TDEE & macro calculations
│   │   ├── profile.go           # UserProfile type
│   │   ├── dailylog.go          # DailyLog type
│   │   ├── training.go          # Training calculations
│   │   ├── recovery.go          # Recovery score logic
│   │   ├── plan.go              # NutritionPlan type
│   │   ├── analysis.go          # Dual-track analysis
│   │   ├── history.go           # History aggregation
│   │   ├── weighttrend.go       # Weight trend regression
│   │   └── errors.go            # Domain validation errors
│   └── db/                      # Database layer
│       ├── db.go                # SQLite connection
│       └── migrations.go        # Schema migrations
└── data/                        # SQLite database directory
```

### 3.3 Design Principles

From `CLAUDE.md`:

| Principle | Description |
|-----------|-------------|
| **Hop Budget** | Target ≤3 hops (handler → service → store) |
| **Signature Honesty** | Functions with `ctx context.Context` may do I/O; without must be pure |
| **Domain Purity** | Domain packages must have no infrastructure imports |
| **Sandwich Structure** | Read → Compute → Write pattern |
| **No Boomerang Flows** | Avoid A → B → A call patterns |
| **Interfaces at Consumer** | Define interfaces where used, not where implemented |

### 3.4 Key Files Reference

| File | Purpose |
|------|---------|
| `internal/api/server.go` | Route definitions, middleware setup |
| `internal/service/dailylog.go` | Daily log creation with full calculation pipeline |
| `internal/domain/targets.go` | TDEE and macro calculation algorithms |
| `internal/domain/types.go` | Core domain types and enumerations |
| `internal/domain/recovery.go` | Recovery score and adjustment multipliers |
| `internal/domain/analysis.go` | Dual-track plan analysis |
| `internal/db/migrations.go` | Database schema definition |

### 3.5 Service Layer Mapping

**Which service owns which endpoints:**

| Service | Endpoints | Purpose |
|---------|-----------|---------|
| **ProfileService** | `/api/profile` (GET, PUT, DELETE) | User profile CRUD operations |
| **DailyLogService** | `/api/logs`, `/api/logs/today`, `/api/logs/{date}`, `/api/logs/{date}/actual-training`, `/api/logs/{date}/active-calories`, `/api/logs/{date}/fasting-override`, `/api/logs/{date}/health-sync`, `/api/logs/{date}/consumed-macros`, `/api/logs/{date}/insight` | Daily log creation, updates, AI insights via Ollama |
| **TrainingConfigStore** | `/api/training-configs` | Training type configurations (MET, load scores) - direct store access |
| **FatigueService** | `/api/body-status`, `/api/archetypes`, `/api/fatigue/apply`, `/api/sessions/{id}/apply-load` | Body fatigue map, training load application |
| **NutritionPlanService** | `/api/plans`, `/api/plans/active`, `/api/plans/current-week`, `/api/plans/{id}`, `/api/plans/{id}/complete`, `/api/plans/{id}/abandon`, `/api/plans/{id}/pause`, `/api/plans/{id}/resume`, `/api/plans/{id}/recalibrate` | Nutrition plan lifecycle management |
| **AnalysisService** | `/api/plans/active/analysis`, `/api/plans/{id}/analysis`, `/api/stats/history`, `/api/stats/weight-trend` | Dual-track variance analysis, historical data |
| **PlannedDayTypeStore** | `/api/planned-days`, `/api/planned-days/{date}` | Planned day types - direct store access |
| **FoodReferenceStore** | `/api/food-reference`, `/api/food-reference/{id}` | Food reference library - direct store access |
| **TrainingProgramService** | `/api/training-programs`, `/api/training-programs/{id}`, `/api/training-programs/{id}/waveform`, `/api/training-programs/{id}/install`, `/api/program-installations/active`, `/api/program-installations/{id}`, `/api/program-installations/{id}/abandon`, `/api/program-installations/{id}/sessions` | Training program and installation management |
| **MetabolicService** | `/api/metabolic/chart`, `/api/metabolic/notification`, `/api/metabolic/notification/{id}/dismiss` | Metabolic Flux Engine, weekly strategy notifications |
| **SolverService** | `/api/solver/solve` | Macro Tetris solver with AI recipe naming |
| **WeeklyDebriefService** | `/api/debrief/weekly`, `/api/debrief/weekly/{date}`, `/api/debrief/current` | Mission Report generation with AI narrative |
| **ImportService** | `/api/import/garmin`, `/api/stats/monthly-summaries` | Garmin data import, monthly activity summaries |
| **BodyIssueService** | `/api/body-issues`, `/api/body-issues/active`, `/api/body-issues/modifiers`, `/api/body-issues/vocabulary` | Semantic Body tagger, body part issue tracking |
| **AuditService** | `/api/audit/status` | Strategy Auditor (Check Engine light) |
| **CalendarAPI** | `/api/calendar/summary` | Calendar heatmap data (handler-level logic) |

**Key Observations:**
- Most services follow the layered pattern: Handler → Service → Domain/Store
- Some stores are accessed directly from handlers (TrainingConfigStore, PlannedDayTypeStore, FoodReferenceStore) for simple CRUD
- DailyLogService integrates multiple dependencies: MetabolicStore, OllamaService
- Ollama integration is used by: DailyLogService, SolverService, WeeklyDebriefService, AuditService

---

## 4. Frontend Architecture (React/TypeScript)

### 4.1 Component Hierarchy

```
main.tsx
└── BrowserRouter
    └── DisplayModeProvider (Context)
        └── App.tsx
            ├── OnboardingWizard (if no profile)
            └── AppLayout
                ├── Sidebar (Navigation)
                └── Routes
                    ├── / → DailyUpdateForm
                    ├── /kitchen → MealPointsDashboard
                    ├── /strategy → PlanOverview
                    ├── /schedule → PlanCalendar
                    ├── /history → WeightHistory
                    ├── /log-workout → LogWorkoutView
                    └── /profile → ProfileForm
```

### 4.2 Directory Structure

```
frontend/src/
├── pages/
│   └── App.tsx                    # Main routing hub
├── api/
│   ├── client.ts                  # HTTP client with all endpoints
│   └── types.ts                   # TypeScript type definitions
├── hooks/
│   ├── useProfile.ts              # Profile CRUD
│   ├── useDailyLog.ts             # Today's log operations
│   ├── usePlan.ts                 # Nutrition plan management
│   ├── usePlanAnalysis.ts         # Dual-track analysis
│   ├── useWeightTrend.ts          # Weight trend data
│   ├── useHistorySummary.ts       # Historical data
│   └── useWeeklyDayTypes.ts       # Weekly planning
├── contexts/
│   └── DisplayModeContext.tsx     # Points vs Grams toggle
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx          # Main wrapper (sidebar + content)
│   │   └── Sidebar.tsx            # Navigation
│   ├── common/                    # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   └── ...
│   ├── daily-update/              # /today route
│   │   ├── DailyUpdateForm.tsx
│   │   └── DayTypeSelector.tsx
│   ├── meal-points/               # /kitchen route
│   │   ├── MealPointsDashboard.tsx
│   │   ├── MealCard.tsx
│   │   └── ActivityGapCard.tsx
│   ├── planning/                  # /strategy route
│   │   ├── PlanOverview.tsx
│   │   ├── PlanCreationForm.tsx
│   │   ├── DualTrackChart.tsx
│   │   └── WeeklyTargetsTable.tsx
│   ├── history/                   # /history route
│   │   ├── WeightHistory.tsx
│   │   └── charts/
│   │       ├── WeightTrendChart.tsx
│   │       └── TrainingVolumeChart.tsx
│   ├── training/                  # /log-workout route
│   │   ├── LogWorkoutView.tsx
│   │   └── ActualTrainingModal.tsx
│   ├── settings/                  # /profile route
│   │   ├── ProfileForm.tsx
│   │   └── MacroRatiosInput.tsx
│   └── onboarding/
│       └── OnboardingWizard.tsx
├── constants/
│   └── index.ts                   # Magic numbers, defaults, labels
└── utils/
    ├── date.ts                    # Date formatting
    └── math.ts                    # Calculation helpers
```

### 4.3 State Management Pattern

Custom hooks manage server state following a fetch-cache-mutate pattern:

```typescript
// Example: useDailyLog hook pattern
const {
  log,           // Current data
  loading,       // Fetch in progress
  error,         // Fetch error
  saving,        // Mutation in progress
  saveError,     // Mutation error
  create,        // Create action
  replace,       // Update action
  refresh,       // Refetch
} = useDailyLog();
```

### 4.4 Context Providers

| Context | Purpose | Persistence |
|---------|---------|-------------|
| `DisplayModeContext` | Points vs Grams display toggle | localStorage |

### 4.5 Routing Structure

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `DailyUpdateForm` | Morning check-in |
| `/kitchen` | `MealPointsDashboard` | Meal tracking dashboard |
| `/strategy` | `PlanOverview` | Long-term plan management |
| `/schedule` | `PlanCalendar` | Calendar view of planned days |
| `/history` | `WeightHistory` | Weight trend and history charts |
| `/log-workout` | `LogWorkoutView` | Record actual training |
| `/profile` | `ProfileForm` | User settings |

---

## 5. Domain Model

### 5.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          UserProfile                                 │
│  (Singleton: id=1)                                                   │
│  - height, birthDate, sex, goal                                      │
│  - targetWeight, targetWeeklyChange                                  │
│  - macroRatios, mealRatios, pointsConfig                            │
│  - supplementConfig, fruitTargetG, veggieTargetG                    │
│  - bmrEquation, bodyFatPercent                                       │
│  - tdeeSource, manualTDEE, recalibrationTolerance                   │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────────┐   ┌─────────────────────────────────┐
│        DailyLog             │   │       NutritionPlan             │
│  - date (unique)            │   │  - startDate, startWeight       │
│  - weightKg, bodyFatPercent │   │  - goalWeight, durationWeeks    │
│  - sleepQuality, sleepHours │   │  - requiredWeeklyChange         │
│  - dayType                  │   │  - requiredDailyDeficit         │
│  - estimatedTDEE, formulaTDEE│   │  - status (active/completed/   │
│  - tdeeSourceUsed, confidence│   │           abandoned)            │
│  - recoveryScore            │   └───────────────┬─────────────────┘
│  - adjustmentMultipliers    │                   │
│  - calculatedTargets ──────►│   ┌───────────────▼─────────────────┐
└───────────────┬─────────────┘   │       WeeklyTarget              │
                │ 1:N             │  - weekNumber                    │
                ▼                 │  - startDate, endDate            │
┌─────────────────────────────┐   │  - projectedWeight, projectedTDEE│
│    TrainingSession          │   │  - targetIntake, targetMacros   │
│  - sessionOrder             │   │  - actualWeight, actualIntake   │
│  - isPlanned (bool)         │   │  - daysLogged                   │
│  - type (12 types)          │   └─────────────────────────────────┘
│  - durationMin              │
│  - perceivedIntensity (RPE) │
│  - notes                    │
└─────────────────────────────┘

┌─────────────────────────────┐   ┌─────────────────────────────────┐
│     DailyTargets            │   │      MealTargets                │
│  (Embedded in DailyLog)     │   │  - breakfast: MacroPoints       │
│  - totalCarbsG, totalProteinG│   │  - lunch: MacroPoints           │
│  - totalFatsG, totalCalories│   │  - dinner: MacroPoints          │
│  - fruitG, veggiesG, waterL │   │                                 │
│  - dayType                  │   │  MacroPoints: {carbs, protein,  │
│  - meals ──────────────────►│   │                fats}            │
└─────────────────────────────┘   └─────────────────────────────────┘
```

### 5.2 Enumerations

| Type | Values | Usage |
|------|--------|-------|
| `Sex` | `male`, `female` | BMR calculation |
| `Goal` | `lose_weight`, `maintain`, `gain_weight` | Deficit/surplus direction |
| `DayType` | `performance`, `fatburner`, `metabolize` | Macro multipliers |
| `TrainingType` | `rest`, `qigong`, `walking`, `gmb`, `run`, `row`, `cycle`, `hiit`, `strength`, `calisthenics`, `mobility`, `mixed` | 12 activity types |
| `TDEESource` | `formula`, `manual`, `adaptive` | TDEE calculation method |
| `BMREquation` | `mifflin_st_jeor`, `katch_mcardle`, `oxford_henry`, `harris_benedict` | BMR formula |
| `PlanStatus` | `active`, `completed`, `abandoned` | Plan lifecycle |
| `FoodCategory` | `high_carb`, `high_protein`, `high_fat` | Food reference grouping |

---

## 6. Domain Concepts

### 6.1 TDEE Calculation

TDEE (Total Daily Energy Expenditure) can come from three sources:

| Source | Method | Confidence |
|--------|--------|------------|
| **Formula** | BMR × 1.2 + exercise calories | 0.3 |
| **Manual** | User-provided value | 0.8 |
| **Adaptive** | Weight trend + intake history regression | 0.0-1.0 (varies) |

**BMR Equations:**
- Mifflin-St Jeor (default): `10 × weight + 6.25 × height - 5 × age + (5 for male, -161 for female)`
- Katch-McArdle: `370 + 21.6 × (weight × (1 - bodyFatPercent/100))`
- Oxford-Henry: Age and sex-specific equations
- Harris-Benedict: Classic equation

**Exercise Calories:**
- MET-based: `(MET - 1) × weight(kg) × duration(hours)`
- Net MET subtraction avoids double-counting with NEAT multiplier (1.2)

### 6.2 Day Type Multipliers

| Day Type | Carbs | Protein | Fats | Use Case |
|----------|-------|---------|------|----------|
| Performance | ×1.30 | ×1.00 | ×1.00 | Training days, carb loading |
| Fatburner | ×0.60 | ×1.00 | ×0.85 | Rest days, fat loss focus |
| Metabolize | ×1.50 | ×1.00 | ×1.10 | Refeed days, metabolism boost |

**Protected Protein:** Protein multiplier is always 1.00 to maintain muscle.

### 6.3 Training System

**Training Types with MET Values:**

| Type | MET | Load Score | Description |
|------|-----|------------|-------------|
| rest | 1.0 | 0 | Complete rest |
| qigong | 2.5 | 0.5 | Breath work, meditation |
| walking | 3.5 | 1 | Light cardio |
| gmb | 4.0 | 3 | Gymnastic bodies routines |
| mobility | 2.5 | 0.5 | Stretching, flexibility |
| run | 9.8 | 3 | Running |
| row | 7.0 | 3 | Rowing |
| cycle | 6.8 | 2 | Cycling |
| hiit | 12.8 | 5 | High-intensity intervals |
| strength | 5.0 | 5 | Weight training |
| calisthenics | 4.0 | 3 | Bodyweight training |
| mixed | 6.0 | 4 | Combined activities |

**Load Calculation:**
```
SessionLoad = LoadScore × DurationMin × (RPE / 3)
```

**ACR (Acute:Chronic Workload Ratio):**
- Acute = 7-day rolling average
- Chronic = 28-day rolling average
- ACR = Acute / Chronic

| ACR Zone | Range | Interpretation |
|----------|-------|----------------|
| Undertrained | < 0.8 | Increase training |
| Optimal | 0.8 - 1.3 | Ideal zone |
| High | 1.3 - 1.5 | Monitor fatigue |
| Danger | > 1.5 | Reduce load |

### 6.4 Recovery Scoring

Recovery score is a 0-100 composite:

| Component | Weight | Scoring |
|-----------|--------|---------|
| Rest Days | 40% | Based on rest days in last 7 |
| ACR | 35% | Based on ACR zone |
| Sleep | 25% | 7-day average sleep quality |

**Adjustment Multipliers:**
Daily TDEE adjustments based on:
- Training load (ACR thresholds)
- Recovery score thresholds
- Today's sleep quality
- Yesterday's max load score (≥5 triggers adjustment)

### 6.5 Points System

**Multipliers (grams to points):**
- Carbs: ×1.15
- Protein: ×4.35
- Fats: ×3.5

**Supplement Deductions (Performance days only):**
- Maltodextrin: 96% carbs by weight
- Whey Protein: 88% protein by weight
- Collagen: 90% protein by weight

**Fruit/Veg Carb Contribution:**
- Fruit: 10% carbs by weight
- Vegetables: 3% carbs by weight

---

## 7. Database Schema

### 7.1 ERD Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                        user_profile                                 │
│  (Singleton: id=1)                                                  │
├────────────────────────────────────────────────────────────────────┤
│ PK │ id INTEGER (CHECK id=1)                                       │
│    │ height_cm REAL, birth_date TEXT, sex TEXT                     │
│    │ goal TEXT, target_weight_kg REAL, target_weekly_change_kg REAL│
│    │ carb_ratio, protein_ratio, fat_ratio (CHECK sum ≈ 1.0)       │
│    │ breakfast_ratio, lunch_ratio, dinner_ratio (CHECK sum ≈ 1.0) │
│    │ carb_multiplier, protein_multiplier, fat_multiplier           │
│    │ fruit_target_g, veggie_target_g                               │
│    │ bmr_equation TEXT, body_fat_percent REAL                      │
│    │ tdee_source TEXT, manual_tdee REAL                            │
│    │ maltodextrin_g, whey_g, collagen_g                            │
│    │ recalibration_tolerance REAL                                  │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                         daily_logs                                  │
├────────────────────────────────────────────────────────────────────┤
│ PK │ id INTEGER AUTOINCREMENT                                      │
│ UK │ log_date TEXT UNIQUE                                          │
│    │ weight_kg REAL (30-300), body_fat_percent REAL               │
│    │ resting_heart_rate INTEGER, sleep_quality INTEGER (1-100)    │
│    │ sleep_hours REAL, day_type TEXT                               │
│    │ total_carbs_g, total_protein_g, total_fats_g, total_calories │
│    │ breakfast_*/lunch_*/dinner_*_points (9 columns)              │
│    │ fruit_g, veggies_g, water_l                                   │
│    │ estimated_tdee, formula_tdee INTEGER                          │
│    │ tdee_source_used TEXT, tdee_confidence REAL                   │
│    │ data_points_used INTEGER, active_calories_burned INTEGER      │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ 1:N
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                      training_sessions                              │
├────────────────────────────────────────────────────────────────────┤
│ PK │ id INTEGER AUTOINCREMENT                                      │
│ FK │ daily_log_id → daily_logs(id) ON DELETE CASCADE              │
│    │ session_order INTEGER                                         │
│    │ is_planned BOOLEAN                                            │
│    │ training_type TEXT (12 types)                                 │
│    │ duration_min INTEGER (0-480)                                  │
│    │ perceived_intensity INTEGER (1-10)                            │
│    │ notes TEXT                                                    │
│ UK │ (daily_log_id, session_order, is_planned)                    │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                       training_configs                              │
├────────────────────────────────────────────────────────────────────┤
│ PK │ id INTEGER                                                    │
│ UK │ type TEXT (12 training types)                                 │
│    │ met REAL (MET value for calorie calc)                         │
│    │ load_score REAL (for ACR calculation)                         │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                       nutrition_plans                               │
├────────────────────────────────────────────────────────────────────┤
│ PK │ id INTEGER AUTOINCREMENT                                      │
│    │ start_date TEXT, start_weight_kg REAL (30-300)               │
│    │ goal_weight_kg REAL (30-300), duration_weeks INTEGER (4-104) │
│    │ required_weekly_change_kg REAL                                │
│    │ required_daily_deficit_kcal REAL                              │
│    │ status TEXT (active, completed, abandoned)                    │
└──────────────────────────────┬─────────────────────────────────────┘
                               │ 1:N
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│                       weekly_targets                                │
├────────────────────────────────────────────────────────────────────┤
│ PK │ id INTEGER AUTOINCREMENT                                      │
│ FK │ plan_id → nutrition_plans(id) ON DELETE CASCADE              │
│    │ week_number INTEGER (≥1)                                      │
│    │ start_date TEXT, end_date TEXT                                │
│    │ projected_weight_kg, projected_tdee INTEGER                   │
│    │ target_intake_kcal, target_carbs_g, target_protein_g         │
│    │ target_fats_g                                                 │
│    │ actual_weight_kg, actual_intake_kcal (nullable)              │
│    │ days_logged INTEGER                                           │
│ UK │ (plan_id, week_number)                                        │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                     planned_day_types                               │
├────────────────────────────────────────────────────────────────────┤
│ PK │ id INTEGER AUTOINCREMENT                                      │
│ UK │ plan_date TEXT UNIQUE                                         │
│    │ day_type TEXT (performance, fatburner, metabolize)           │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                      food_reference                                 │
├────────────────────────────────────────────────────────────────────┤
│ PK │ id INTEGER AUTOINCREMENT                                      │
│    │ category TEXT (high_carb, high_protein, high_fat)            │
│    │ food_item TEXT                                                │
│    │ plate_multiplier REAL                                         │
│ UK │ (category, food_item)                                         │
└────────────────────────────────────────────────────────────────────┘
```

---

## 8. API Reference

### 8.1 Complete Endpoints Reference

**Total: 66+ endpoints across 13 feature domains**

#### 8.1.1 Health Check
| Method | Path | Query Params | Description |
|--------|------|--------------|-------------|
| GET | `/api/health` | - | Health check with timestamp |

#### 8.1.2 Profile Management (3 endpoints)
| Method | Path | Query Params | Description |
|--------|------|--------------|-------------|
| GET | `/api/profile` | - | Get user profile |
| PUT | `/api/profile` | - | Create/update profile |
| DELETE | `/api/profile` | - | Delete profile (resets all data) |

#### 8.1.3 Daily Logs (11 endpoints)
| Method | Path | Query Params | Description |
|--------|------|--------------|-------------|
| POST | `/api/logs` | - | Create daily log with calculated targets |
| GET | `/api/logs` | `start`, `end` | Get logs for date range (YYYY-MM-DD) |
| GET | `/api/logs/today` | - | Get today's log |
| GET | `/api/logs/{date}` | - | Get log by specific date |
| DELETE | `/api/logs/today` | - | Delete today's log |
| PATCH | `/api/logs/{date}/actual-training` | - | Update actual training sessions (post-workout) |
| PATCH | `/api/logs/{date}/active-calories` | - | Update active calories burned from wearable |
| PATCH | `/api/logs/{date}/fasting-override` | - | Override fasting protocol for specific day |
| PATCH | `/api/logs/{date}/health-sync` | - | Sync health data (RHR, HRV, sleep from wearable) |
| PATCH | `/api/logs/{date}/consumed-macros` | - | Add consumed macros (additive, per-meal tracking) |
| GET | `/api/logs/{date}/insight` | - | Get AI-generated day insight via Ollama |

#### 8.1.4 Training & Body Status (5 endpoints)
| Method | Path | Query Params | Description |
|--------|------|--------------|-------------|
| GET | `/api/training-configs` | - | Get training type configs (MET, load scores) |
| GET | `/api/body-status` | - | Get current body fatigue map (all 15 muscle groups) |
| GET | `/api/archetypes` | - | Get training archetypes with muscle coefficients |
| POST | `/api/fatigue/apply` | - | Apply fatigue by archetype (no session ID required) |
| POST | `/api/sessions/{id}/apply-load` | - | Apply session load to body map (linked to session) |

#### 8.1.5 Statistics (3 endpoints)
| Method | Path | Query Params | Description |
|--------|------|--------------|-------------|
| GET | `/api/stats/weight-trend` | `range` (7d, 30d, 90d, all) | Weight trend with linear regression |
| GET | `/api/stats/history` | `range` (7d, 30d, 90d, all) | Historical summary with training compliance |
| GET | `/api/stats/monthly-summaries` | `from`, `to` (YYYY-MM) | Monthly activity summaries from Garmin |

#### 8.1.6 Calendar & Planning (4 endpoints)
| Method | Path | Query Params | Description |
|--------|------|--------------|-------------|
| GET | `/api/calendar/summary` | `start`, `end` | Calendar with load/calorie heatmap |
| GET | `/api/planned-days` | `start`, `end` | Get planned day types for date range |
| PUT | `/api/planned-days/{date}` | - | Upsert planned day type |
| DELETE | `/api/planned-days/{date}` | - | Delete planned day |

#### 8.1.7 Food Reference (2 endpoints)
| Method | Path | Query Params | Description |
|--------|------|--------------|-------------|
| GET | `/api/food-reference` | - | Get food reference library (all food items) |
| PATCH | `/api/food-reference/{id}` | - | Update plate multiplier for food item |

#### 8.1.8 Nutrition Plans (13 endpoints)
| Method | Path | Query Params | Description |
|--------|------|--------------|-------------|
| POST | `/api/plans` | - | Create new nutrition plan |
| GET | `/api/plans` | - | List all nutrition plans (summary view) |
| GET | `/api/plans/active` | - | Get currently active plan (full details) |
| GET | `/api/plans/current-week` | - | Get current week target for active plan |
| GET | `/api/plans/active/analysis` | `date` (optional) | Analyze active plan (dual-track variance) |
| GET | `/api/plans/{id}` | - | Get plan by ID (full details) |
| GET | `/api/plans/{id}/analysis` | `date` (optional) | Analyze specific plan (dual-track variance) |
| POST | `/api/plans/{id}/complete` | - | Mark plan as completed |
| POST | `/api/plans/{id}/abandon` | - | Abandon plan |
| POST | `/api/plans/{id}/pause` | - | Pause plan |
| POST | `/api/plans/{id}/resume` | - | Resume paused plan |
| POST | `/api/plans/{id}/recalibrate` | - | Apply recalibration strategy (increase deficit, extend timeline, etc.) |
| DELETE | `/api/plans/{id}` | - | Delete plan permanently |

#### 8.1.9 Training Programs (11 endpoints)
| Method | Path | Query Params | Description |
|--------|------|--------------|-------------|
| GET | `/api/training-programs` | `difficulty`, `focus`, `templatesOnly` | List programs with optional filters |
| POST | `/api/training-programs` | - | Create custom training program |
| GET | `/api/training-programs/{id}` | - | Get program by ID (includes weeks and days) |
| DELETE | `/api/training-programs/{id}` | - | Delete program |
| GET | `/api/training-programs/{id}/waveform` | - | Get periodization waveform data for chart |
| POST | `/api/training-programs/{id}/install` | - | Install program to calendar with day mapping |
| GET | `/api/program-installations/active` | - | Get active program installation |
| GET | `/api/program-installations/{id}` | - | Get installation by ID |
| POST | `/api/program-installations/{id}/abandon` | - | Abandon installation (stop following program) |
| DELETE | `/api/program-installations/{id}` | - | Delete installation permanently |
| GET | `/api/program-installations/{id}/sessions` | - | Get scheduled sessions for installation |

#### 8.1.10 Metabolic Flux Engine (3 endpoints)
| Method | Path | Query Params | Description |
|--------|------|--------------|-------------|
| GET | `/api/metabolic/chart` | `weeks` (default: 12) | Metabolic history for graph visualization |
| GET | `/api/metabolic/notification` | - | Get pending weekly strategy notification (null if none) |
| POST | `/api/metabolic/notification/{id}/dismiss` | - | Dismiss notification after user acknowledges |

#### 8.1.11 Macro Tetris Solver (1 endpoint)
| Method | Path | Query Params | Description |
|--------|------|--------------|-------------|
| POST | `/api/solver/solve` | - | Solve remaining macros with food combinations + AI recipe naming |

#### 8.1.12 Weekly Debrief / Mission Report (3 endpoints)
| Method | Path | Query Params | Description |
|--------|------|--------------|-------------|
| GET | `/api/debrief/weekly` | - | Get most recent completed week debrief |
| GET | `/api/debrief/weekly/{date}` | - | Get debrief for specific week (any day in week) |
| GET | `/api/debrief/current` | - | Get in-progress debrief for current incomplete week |

#### 8.1.13 Garmin Data Import (2 endpoints)
| Method | Path | Query Params | Description |
|--------|------|--------------|-------------|
| POST | `/api/import/garmin` | - | Upload Garmin CSV/ZIP export (sleep, weight, HRV, activities) |
| GET | `/api/stats/monthly-summaries` | `from`, `to` (YYYY-MM) | Get monthly activity summaries (listed above) |

#### 8.1.14 Semantic Body / Body Issues (4 endpoints)
| Method | Path | Query Params | Description |
|--------|------|--------------|-------------|
| POST | `/api/body-issues` | - | Create body part issues from semantic tokens in workout notes |
| GET | `/api/body-issues/active` | - | Get active body issues (within decay period) |
| GET | `/api/body-issues/modifiers` | - | Get fatigue modifiers from active body issues |
| GET | `/api/body-issues/vocabulary` | - | Get semantic vocabulary for body part detection |

#### 8.1.15 Strategy Auditor / Check Engine (1 endpoint)
| Method | Path | Query Params | Description |
|--------|------|--------------|-------------|
| GET | `/api/audit/status` | - | Get audit status with detected strategy mismatches |

### 8.2 Request/Response Formats

**Content Type:** All endpoints use `application/json` for requests and responses.

**Date Format:** ISO 8601 date strings (`YYYY-MM-DD`), e.g., `"2025-01-27"`

**Common Request Patterns:**
- `POST` - Create with JSON body
- `GET` - Retrieve with query params
- `PUT` - Upsert (create or replace) with JSON body
- `PATCH` - Partial update with JSON body
- `DELETE` - Remove resource

### 8.3 Error Handling

```json
{
  "error": "error_code",
  "message": "Human readable description"
}
```

Common error codes:
- `not_found` - Resource doesn't exist (404)
- `validation_error` - Invalid input (400)
- `already_exists` - Duplicate resource (409)
- `internal_error` - Server error (500)
- `forbidden` - Operation not allowed (403)

### 8.4 CORS Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ALLOWED_ORIGIN` | `*` | Allowed origins |
| `CORS_ALLOWED_METHODS` | `GET,POST,PUT,PATCH,DELETE,OPTIONS` | Allowed methods |
| `CORS_ALLOWED_HEADERS` | `Content-Type,Authorization` | Allowed headers |
| `CORS_MAX_AGE` | `3600` | Preflight cache (seconds) |

### 8.5 Feature Integrations

**Ollama AI Integration:**
- **Endpoints using Ollama:** `/api/logs/{date}/insight`, `/api/solver/solve`, `/api/debrief/*`, `/api/audit/status`
- **Default URL:** `localhost:11434` (configurable via `OLLAMA_URL` env var)
- **Models:** Uses lightweight models for recipe naming, narrative generation, insights
- **Fallback:** Graceful degradation to template-based responses if Ollama unavailable

**Garmin Integration:**
- **Import Format:** CSV or ZIP exports from Garmin Connect
- **Supported Data:** Sleep (with RHR, HRV), Weight (with body fat %), standalone HRV/RHR, Activity summaries
- **Date Parsing:** Handles Spanish locale (e.g., "Sueño", "Peso") with configurable year parameter

---

## 9. Data Flow Patterns

### 9.1 Daily Log Creation Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ POST /api/logs                                                       │
│ Request: { date, weightKg, sleepQuality, plannedSessions, dayType } │
└─────────────────────────────────────────────┬───────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Handler (api/dailylog.go)                                            │
│ 1. Parse JSON request                                                │
│ 2. Convert to DailyLogInput                                          │
│ 3. Call service.Create(ctx, input, now)                              │
└─────────────────────────────────────────────┬───────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Service (service/dailylog.go)                                        │
│ 1. Get profile from store                                            │
│ 2. Calculate Formula TDEE:                                           │
│    └─ domain.CalculateEstimatedTDEE(profile, weight, sessions)       │
│ 3. Calculate Adaptive TDEE (if enabled):                             │
│    └─ Get historical data from store                                 │
│    └─ domain.CalculateAdaptiveTDEE(dataPoints)                       │
│ 4. Get Effective TDEE:                                               │
│    └─ domain.GetEffectiveTDEE(profile, formulaTDEE, adaptiveResult)  │
│ 5. Calculate Recovery (7-day lookback):                              │
│    └─ domain.CalculateRecoveryScore(input)                           │
│    └─ domain.CalculateAdjustmentMultipliers(input)                   │
│ 6. Calculate Daily Targets:                                          │
│    └─ domain.CalculateDailyTargets(profile, log)                     │
│ 7. Persist with transaction:                                         │
│    └─ store.WithTx() { CreateWithTx, CreateSessionsWithTx }          │
└─────────────────────────────────────────────┬───────────────────────┘
                                              │
                                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Response: Complete DailyLog with calculated targets                  │
│ - calculatedTargets (meals, totals, fruit/veg, water)               │
│ - estimatedTDEE, tdeeSourceUsed, tdeeConfidence                     │
│ - recoveryScore, adjustmentMultipliers                               │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.2 Target Calculation Pipeline

```
Input: Profile + DailyLog
           │
           ▼
┌──────────────────────────────────────┐
│ 1. Get Base Macros from Profile      │
│    - dailyCarbsG                     │
│    - dailyProteinG                   │
│    - dailyFatsG                      │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│ 2. Apply Day Type Multipliers        │
│    Performance: C×1.3, P×1.0, F×1.0  │
│    Fatburner:   C×0.6, P×1.0, F×0.85 │
│    Metabolize:  C×1.5, P×1.0, F×1.1  │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│ 3. Calculate Fruit/Veg               │
│    maxFruit = C×0.3 / 0.10           │
│    maxVeg = C×0.1 / 0.03             │
│    Apply fatburner reduction (×0.7)  │
│    Round to nearest 5g               │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│ 4. Deduct Fixed Contributions        │
│    - Fruit carbs (10% by weight)     │
│    - Veg carbs (3% by weight)        │
│    - Supplements (Performance only)  │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│ 5. Convert to Points                 │
│    C×1.15, P×4.35, F×3.5             │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│ 6. Distribute Across Meals           │
│    Apply meal ratios                 │
│    Round to nearest 5                │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│ 7. Calculate Water                   │
│    waterL = weightKg × 0.04          │
│    Round to 0.1L                     │
└──────────────────┴───────────────────┘
```

---

## 10. Testing Architecture

### 10.1 Backend Testing

```bash
cd backend
go test ./...                     # Run all tests
go test -v ./internal/domain      # Verbose for specific package
go test -race ./...               # With race detection
go test -run TestName ./...       # Single test
```

**Test Structure:**
- `internal/domain/*_test.go` - Unit tests for pure domain functions
- `internal/service/service_test.go` - Service integration tests
- `internal/store/store_test.go` - Store tests (in-memory SQLite)
- `internal/api/handlers_test.go` - API integration tests

**Test Database:** Uses `:memory:` SQLite for isolation.

### 10.2 Frontend Testing

```bash
cd frontend
npm test                          # Run Vitest
npm run test:watch                # Watch mode
```

### 10.3 E2E Testing

```bash
make e2e-native                   # Full E2E suite (macOS)
cd frontend && npm run e2e:open   # Cypress interactive
cd frontend && npm run e2e:run    # Cypress headless
```

**E2E Stack:** Cypress 14.2 + Cucumber (BDD)

**Feature Files:** `frontend/cypress/e2e/*.feature`

---

## 11. Development & CI/CD

### 11.1 Local Development

**Prerequisites:**
- Go 1.22+
- Node.js 20+
- npm 10+

**Setup:**
```bash
# Backend
cd backend
go run ./cmd/server

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

### 11.2 Docker Compose

```bash
docker compose up --build         # Full stack
```

### 11.3 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Backend server port |
| `DB_PATH` | `data/victus.sqlite` | SQLite file path |
| `CORS_ALLOWED_ORIGIN` | `*` | CORS origin |

### 11.4 CI/CD Pipeline

GitHub Actions runs on push/PR to main:

```
┌─────────────────────────────────────────────────┐
│ 1. Backend Tests                                 │
│    go test -race ./...                           │
├─────────────────────────────────────────────────┤
│ 2. Frontend Build                                │
│    npm run build                                 │
├─────────────────────────────────────────────────┤
│ 3. E2E Tests                                     │
│    Cypress with Cucumber                         │
└─────────────────────────────────────────────────┘
```

### 11.5 Code Quality

**Review Agents** (in `.claude/commands/`):
| Command | Focus |
|---------|-------|
| `/balance-review` | Over-abstraction, DRY, hop budget |
| `/complexity-review` | Readability, cognitive complexity |
| `/ddd-review` | Domain-driven design patterns |
| `/testing-review` | Test coverage and quality |
| `/qa` | OpenAPI contract completeness |
| `/adaptive-model` | Model and data integrity |
