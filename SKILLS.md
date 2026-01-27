# SKILLS.md - Context-Aware Task Guidance for Claude Code

## Purpose

This file helps Claude Code work efficiently with the Victus codebase by:
- Setting clear default constraints and assumptions
- Providing a decision framework for determining work scope (backend vs frontend)
- Offering a complete API reference to check before proposing changes
- Limiting unnecessary file exploration and context usage

**Quick Links:**
- [Default Constraints](#default-working-assumptions)
- [Scope Decision Framework](#scope-decision-framework)
- [Complete API Reference](#complete-api-reference)
- [Backend vs Frontend Matrix](#backend-vs-frontend-decision-matrix)

**When to use this file:**
- **SKILLS.md** (this file): Quick decisions, scope determination, API reference
- **CLAUDE.md**: Commands, architecture overview, CI/CD, review skills
- **ARCHITECTURE.md**: Deep technical reference, domain model, database schema

---

## Default Working Assumptions

**CRITICAL CONSTRAINTS - Follow by default:**

1. **Mobile Code is OFF-LIMITS** - Never explore or modify `/mobile/**` unless explicitly requested by user
2. **Backend Changes Require Justification** - Prefer frontend-only changes when API already exists
3. **Database Schema Changes Require Approval** - Always confirm with user before modifying migrations
4. **Check API Reference First** - Before proposing backend work, verify endpoint doesn't exist
5. **Read ARCHITECTURE.md First** - Domain concepts and database schema are documented there

**Default preferences:**
- Frontend-only changes over backend changes
- Existing APIs over new endpoints
- Documented patterns over new approaches
- Layer boundaries over shortcuts

---

## Scope Decision Framework

**Decision tree for determining work scope:**

```
User Request
    |
    ├─ Is it mobile-specific (/mobile/**)?
    │   ├─ YES: Ask user to explicitly confirm mobile work
    │   └─ NO: Continue
    |
    ├─ Does it require new data or new calculations?
    │   ├─ YES: Backend changes likely needed
    │   └─ NO: Check API reference below
    |
    ├─ Is the API endpoint available in Section 4?
    │   ├─ YES: Frontend-only work (check types.ts)
    │   ├─ NO: Backend + Frontend work needed
    │   └─ MAYBE: Read endpoint to verify it returns needed data
    |
    └─ Does it change domain concepts or business logic?
        ├─ YES: Backend domain layer changes
        └─ NO: Frontend presentation logic only
```

**Quick decision checklist:**

| User Request Type | Likely Scope |
|-------------------|--------------|
| New UI component/layout | Frontend only |
| Display existing data differently | Frontend only |
| Styling/UX improvements | Frontend only |
| New calculation/business logic | Backend (domain) |
| New data fields in database | Backend + Frontend |
| New API endpoint | Backend + Frontend |
| Modify existing calculation | Backend (domain) |
| State management | Frontend only |

---

## Complete API Reference

All 66+ endpoints organized by feature domain. **Check here BEFORE proposing backend changes.**

### Profile Management
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Upsert profile
- `DELETE /api/profile` - Delete profile

### Health Check
- `GET /api/health` - Health check

### Daily Logs (11 endpoints)
- `POST /api/logs` - Create daily log with calculated targets
- `GET /api/logs` - Get logs by date range (query: start, end)
- `GET /api/logs/today` - Get today's log
- `GET /api/logs/{date}` - Get log by specific date
- `DELETE /api/logs/today` - Delete today's log
- `PATCH /api/logs/{date}/actual-training` - Update actual training sessions
- `PATCH /api/logs/{date}/active-calories` - Update active calories burned
- `PATCH /api/logs/{date}/fasting-override` - Update fasting protocol override
- `PATCH /api/logs/{date}/health-sync` - Sync health data
- `PATCH /api/logs/{date}/consumed-macros` - Add consumed macros (additive)
- `GET /api/logs/{date}/insight` - Get AI-generated day insight

### Training & Body Status (5 endpoints)
- `GET /api/training-configs` - Get training type configurations (MET values, load scores)
- `GET /api/body-status` - Get current body fatigue map (all muscle groups)
- `GET /api/archetypes` - Get training archetypes with muscle coefficients
- `POST /api/fatigue/apply` - Apply fatigue by archetype params (no session ID)
- `POST /api/sessions/{id}/apply-load` - Apply session load to body map

### Statistics (3 endpoints)
- `GET /api/stats/weight-trend` - Weight trend with regression analysis (query: range)
- `GET /api/stats/history` - Historical summary with training compliance (query: range)
- `GET /api/stats/monthly-summaries` - Monthly activity summaries from Garmin (query: from, to)

### Calendar & Planning (4 endpoints)
- `GET /api/calendar/summary` - Calendar summary with load/calorie heatmap (query: start, end)
- `GET /api/planned-days` - Get planned day types (query: start, end)
- `PUT /api/planned-days/{date}` - Upsert planned day type
- `DELETE /api/planned-days/{date}` - Delete planned day

### Food Reference (2 endpoints)
- `GET /api/food-reference` - Get food reference library (all food items)
- `PATCH /api/food-reference/{id}` - Update plate multiplier

### Nutrition Plans (13 endpoints)
- `POST /api/plans` - Create nutrition plan
- `GET /api/plans` - List all nutrition plans
- `GET /api/plans/active` - Get currently active plan
- `GET /api/plans/current-week` - Get current week target for active plan
- `GET /api/plans/active/analysis` - Analyze active plan (dual-track variance)
- `GET /api/plans/{id}` - Get plan by ID
- `GET /api/plans/{id}/analysis` - Dual-track variance analysis for specific plan
- `POST /api/plans/{id}/complete` - Mark plan as completed
- `POST /api/plans/{id}/abandon` - Abandon plan
- `POST /api/plans/{id}/pause` - Pause plan
- `POST /api/plans/{id}/resume` - Resume paused plan
- `POST /api/plans/{id}/recalibrate` - Apply recalibration strategy
- `DELETE /api/plans/{id}` - Delete plan

### Training Programs (11 endpoints)
- `GET /api/training-programs` - List programs (query: difficulty, focus, templatesOnly)
- `POST /api/training-programs` - Create custom training program
- `GET /api/training-programs/{id}` - Get program by ID (includes weeks and days)
- `DELETE /api/training-programs/{id}` - Delete program
- `GET /api/training-programs/{id}/waveform` - Get periodization waveform data
- `POST /api/training-programs/{id}/install` - Install program to calendar
- `GET /api/program-installations/active` - Get active program installation
- `GET /api/program-installations/{id}` - Get installation by ID
- `POST /api/program-installations/{id}/abandon` - Abandon installation
- `DELETE /api/program-installations/{id}` - Delete installation
- `GET /api/program-installations/{id}/sessions` - Get scheduled sessions

### Metabolic Flux Engine (3 endpoints)
- `GET /api/metabolic/chart` - Metabolic history for graph (query: weeks)
- `GET /api/metabolic/notification` - Get pending weekly strategy notification
- `POST /api/metabolic/notification/{id}/dismiss` - Dismiss notification

### Macro Tetris Solver (1 endpoint)
- `POST /api/solver/solve` - Solve remaining macros with food combinations

### Weekly Debrief / Mission Report (3 endpoints)
- `GET /api/debrief/weekly` - Get most recent completed week debrief
- `GET /api/debrief/weekly/{date}` - Get debrief for specific week
- `GET /api/debrief/current` - Get in-progress debrief for current incomplete week

### Garmin Data Import (2 endpoints)
- `POST /api/import/garmin` - Upload Garmin CSV/ZIP export file
- `GET /api/stats/monthly-summaries` - Get monthly summaries (already listed above)

### Semantic Body / Body Issues (4 endpoints)
- `POST /api/body-issues` - Create body part issues from semantic tokens
- `GET /api/body-issues/active` - Get active body issues (within decay period)
- `GET /api/body-issues/modifiers` - Get fatigue modifiers from body issues
- `GET /api/body-issues/vocabulary` - Get semantic vocabulary for body parts

### Strategy Auditor / Check Engine (1 endpoint)
- `GET /api/audit/status` - Get audit status with detected mismatches

**Total: 66+ endpoints**

---

## Context Management Guidelines

**Rules to limit unnecessary file exploration:**

1. **Check API Reference First** - Before exploring backend code, check Section 4 to see if endpoint exists
2. **Read Types Before Code** - Check `frontend/src/api/types.ts` for response types before reading backend
3. **Domain Concepts in Docs** - ARCHITECTURE.md Section 6 has complete domain model
4. **Database Schema in Docs** - ARCHITECTURE.md Section 7 has full schema with relationships
5. **Mobile Code: Zero Files** - Never read mobile files unless explicitly requested
6. **Use Grep Over Read** - Use pattern matching instead of reading entire files when searching
7. **Layer-First Navigation** - Know which layer to check for each type of change:
   - UI changes → `frontend/src/components/{feature}/`
   - API integration → `frontend/src/hooks/use{Feature}.ts`
   - HTTP handlers → `backend/internal/api/{feature}.go`
   - Business logic → `backend/internal/service/{feature}.go`
   - Data persistence → `backend/internal/store/{feature}.go`
   - Domain logic → `backend/internal/domain/{feature}.go`
   - Database schema → `backend/internal/db/migrations.go`

**File reading budget by task type:**
- UI-only changes: Read 0-2 backend files
- Frontend + existing API: Read 0-1 backend files (types only)
- New API endpoint: Read 3-5 backend files (domain, service, api, store)
- Mobile work: Only after explicit user confirmation

---

## Backend vs Frontend Decision Matrix

**Quick lookup for common scenarios:**

| Scenario | Scope | Check First | Files to Modify |
|----------|-------|-------------|-----------------|
| New UI component | Frontend only | Component structure | `frontend/src/components/` |
| Display existing data differently | Frontend only | `types.ts` for API response | Frontend components/hooks |
| Add new calculation | Backend (domain) | Domain concepts in ARCHITECTURE.md | `backend/internal/domain/` |
| New data field | Backend + Frontend | Database schema | Backend + Frontend types |
| Styling/layout change | Frontend only | Component files | CSS/Tailwind in components |
| New API endpoint | Backend + Frontend | API reference above | All backend layers + frontend |
| Modify existing calculation | Backend (domain) | Domain layer files | `backend/internal/domain/` + tests |
| State management | Frontend only | Hook patterns | `frontend/src/hooks/` |
| Database schema change | Backend + Migration | **Confirm with user first** | `backend/internal/db/migrations.go` |
| Mobile feature | Mobile only | **Confirm with user first** | `/mobile/**` |

**Backend change indicators:**
- New data fields not in existing types
- New calculations not in existing domain functions
- New API endpoints not in the 66+ routes above
- Database schema modifications
- New business logic unavailable via existing endpoints

**Frontend-only indicators:**
- UI/UX improvements
- Layout/styling changes
- Component refactoring
- Display logic changes
- Existing API endpoint returns needed data
- State management improvements
- Client-side calculations (non-domain)

---

## Skill Selection Guide

**When to invoke review skills:**

### /ddd-review
- **Use for:** Backend domain logic changes in `internal/domain/*`
- **Focus:** Hop budget (≤3), signature honesty, domain purity, aggregate boundaries
- **Invoke after:** Changes to domain calculation functions, domain types, business logic

### /testing-review
- **Use for:** Test additions or coverage improvements
- **Focus:** Inverted test pyramid, contract-first testing, behavior-driven development
- **Invoke after:** Adding tests, updating test infrastructure, coverage gaps

### /frontend-review
- **Use for:** React + TypeScript UI changes
- **Focus:** Type-safety, correctness, UX, performance (skips accessibility per CLAUDE.md)
- **Invoke after:** Frontend component/hook changes, state management updates

**Do NOT invoke skills for:**
- Minor typo fixes
- Single-line changes
- Documentation updates
- Trivial formatting changes

---

## Common Task Patterns

### Pattern 1: Add New UI Feature (Frontend-Only)

**When:** API endpoint already exists with needed data

**Steps:**
1. Check API reference (Section 4) to confirm endpoint exists
2. Read `frontend/src/api/types.ts` for response types
3. Create/modify component in `frontend/src/components/{feature}/`
4. Add/modify hook in `frontend/src/hooks/use{Feature}.ts` if needed
5. Test with `cd frontend && npm run test`
6. Invoke `/frontend-review` if non-trivial

**Example:** "Add a loading spinner to the daily log page"

---

### Pattern 2: Add New API Endpoint (Backend + Frontend)

**When:** No existing endpoint provides needed data

**Steps:**
1. Confirm backend work needed (no suitable endpoint in Section 4)
2. Add domain types to `backend/internal/domain/types.go`
3. Add domain logic to `backend/internal/domain/{feature}.go` (pure functions)
4. Add service method to `backend/internal/service/{feature}.go`
5. Add store methods to `backend/internal/store/{feature}.go` (if persistence needed)
6. Add HTTP handler to `backend/internal/api/{feature}.go`
7. Register route in `backend/internal/api/server.go` (NewServer function)
8. Add TypeScript types to `frontend/src/api/types.ts`
9. Add client function to `frontend/src/api/client.ts`
10. Test backend: `cd backend && go test ./...`
11. Invoke `/ddd-review` for domain changes
12. Invoke `/testing-review` for test coverage

**Example:** "Add endpoint to calculate weekly macro variance"

---

### Pattern 3: Modify Existing Calculation (Backend Domain)

**When:** Changing business logic or calculation algorithm

**Steps:**
1. Read `backend/internal/domain/{feature}.go` to understand current logic
2. Modify pure calculation function (no I/O imports allowed)
3. Update tests in `backend/internal/domain/{feature}_test.go`
4. Run `cd backend && go test ./internal/domain -v`
5. Invoke `/ddd-review` to verify domain purity and correctness

**Example:** "Change TDEE calculation to use Oxford-Henry equation"

---

### Pattern 4: Database Schema Change (High Risk)

**When:** Adding/modifying database tables or columns

**Steps:**
1. **STOP - Confirm with user first** (never assume approval for schema changes)
2. Add migration in `backend/internal/db/migrations.go`
3. Add store methods in `backend/internal/store/{feature}.go`
4. Update domain types in `backend/internal/domain/types.go`
5. Update TypeScript types in `frontend/src/api/types.ts`
6. Run migration: `cd backend && make seed`
7. Test: `cd backend && go test ./internal/store -v`

**Example:** "Add new table for meal templates"

---

## Feature-to-Layer Reference

**Which files to check for each feature:**

| Feature | Domain | Service | Store | API | Frontend Types | Frontend Hook |
|---------|--------|---------|-------|-----|----------------|---------------|
| Daily Log Creation | `domain/targets.go` | `service/dailylog.go` | `store/dailylog.go` | `api/dailylog.go` | `types.ts` (DailyLog) | `useDailyLog.ts` |
| TDEE Calculation | `domain/targets.go` | `service/dailylog.go` | - | - | `types.ts` (DailyTargets) | `useDailyLog.ts` |
| Nutrition Plans | `domain/plan.go` | `service/plan.go` | `store/plan.go` | `api/plan.go` | `types.ts` (NutritionPlan) | `usePlan.ts` |
| Training Programs | `domain/program.go` | `service/program.go` | `store/program.go` | `api/program.go` | `types.ts` (TrainingProgram) | `useProgram.ts` |
| Metabolic Flux | `domain/metabolic.go` | `service/metabolic.go` | `store/metabolic.go` | `api/metabolic.go` | `types.ts` (FluxChartData) | `useMetabolic.ts` |
| Body Status/Fatigue | `domain/fatigue.go` | `service/fatigue.go` | `store/fatigue.go` | `api/fatigue.go` | `types.ts` (BodyStatus) | `useBodyStatus.ts` |
| Macro Solver | `domain/solver.go` | `service/solver.go` | `store/foodref.go` | `api/solver.go` | `types.ts` (SolverResponse) | `useSolver.ts` |
| Weekly Debrief | `domain/debrief.go` | `service/debrief.go` | - | `api/debrief.go` | `types.ts` (WeeklyDebrief) | `useDebrief.ts` |
| Garmin Import | - | `service/import.go` | `store/monthlysummary.go` | `api/import.go` | `types.ts` (GarminImportResult) | - |
| Body Issues | `domain/bodyissue.go` | `service/bodyissue.go` | `store/bodyissue.go` | `api/bodyissue.go` | `types.ts` (BodyPartIssue) | `useBodyIssues.ts` |
| Strategy Auditor | `domain/audit.go` | `service/audit.go` | - | `api/audit.go` | `types.ts` (AuditStatus) | `useAudit.ts` |

---

## Anti-Patterns to Avoid

**Common mistakes to prevent:**

1. **Reading Mobile Code** - Unless explicitly asked, never explore `/mobile/**`
2. **Backend Exploration Without API Check** - Always check Section 4 first before proposing backend work
3. **Proposing Backend Changes for UI Work** - If API exists with needed data, stay in frontend
4. **Database Changes Without Approval** - Always confirm schema migrations with user
5. **Assuming Endpoint Missing** - Check both `server.go` AND `client.ts` before concluding endpoint doesn't exist
6. **Over-Engineering** - Don't add features beyond user request
7. **Ignoring Layer Boundaries** - Domain layer must be pure (no I/O imports like database, HTTP, file system)
8. **Skipping Tests** - Always update tests when changing logic
9. **Breaking Hop Budget** - Target ≤3 hops in call chain (handler → service → store)
10. **Mobile Assumptions** - Mobile has separate React Native codebase, doesn't share web frontend components

---

## Example Workflows

### Scenario A: "Add a loading spinner to the daily log page"

**Analysis:**
- Type: UI change
- Scope: Frontend only

**Decision:**
1. No API check needed (pure UI)
2. Files: `frontend/src/pages/DailyLog.tsx` or `frontend/src/components/daily-input/`
3. No backend work
4. Test: Visual verification + unit tests
5. Invoke: None (trivial change)

---

### Scenario B: "Add a new BMR equation option"

**Analysis:**
- Type: New calculation + new enum value
- Scope: Backend domain + Frontend

**Decision:**
1. Check API: `PUT /api/profile` exists ✓
2. Backend files:
   - `backend/internal/domain/targets.go` - Add new equation function
   - `backend/internal/domain/types.go` - Add to BMREquation enum
   - `backend/internal/domain/targets_test.go` - Add tests
3. Frontend files:
   - `frontend/src/api/types.ts` - Add to BMREquation type
   - Components using profile settings
4. Test: `go test ./internal/domain -v` + frontend tests
5. Invoke: `/ddd-review`, `/testing-review`

---

### Scenario C: "Show weekly protein average on dashboard"

**Analysis:**
- Type: Display aggregated data
- Scope: Check if data exists first

**Decision:**
1. Check API: `GET /api/stats/history` returns daily protein ✓
2. If daily data exists: Frontend-only (calculate average in component)
3. If aggregated needed: Backend service method + Frontend
4. Files: Frontend component + hook
5. Invoke: `/frontend-review` if frontend-only

---

### Scenario D: "Mobile app login screen"

**Analysis:**
- Type: Mobile feature request
- Scope: Mobile codebase

**Decision:**
1. **STOP - Ask user to explicitly confirm mobile work**
2. Mobile code is OFF-LIMITS by default
3. After confirmation: Files in `/mobile/**`
4. Note: Mobile has separate React Native codebase
5. Invoke: None (mobile doesn't use backend review skills)

---

## Summary

**Key Takeaways:**

1. **Mobile code is OFF-LIMITS** unless explicitly requested
2. **Check API reference (Section 4)** before proposing backend changes
3. **Prefer frontend-only** changes when API already provides needed data
4. **Read ARCHITECTURE.md** for domain model and database schema
5. **Follow layer boundaries** - domain must be pure, no I/O imports
6. **Confirm schema changes** with user before modifying migrations
7. **Use the decision matrix** to determine scope (backend vs frontend)
8. **Invoke review skills** for non-trivial changes (/ddd-review, /testing-review, /frontend-review)

**When in doubt:**
- Check API reference first
- Ask user for clarification
- Prefer existing patterns over new approaches
- Stay in frontend unless backend is clearly needed
