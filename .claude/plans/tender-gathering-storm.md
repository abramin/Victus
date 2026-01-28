# Phase 1: Progression Pattern Data Architecture

## Summary

Add optional `ProgressionPattern` to `ProgramDay`, enabling two progression modes:
- **Strength** (5x5-style): `base_weight`, `increment_unit`, `success_threshold`, `deload_frequency` — auto-advances weight on successful adherence.
- **Skill** (GMB/Calimove): `min_seconds`, `max_seconds`, `rpe_target` — time-on-tension window that shifts based on hold duration.

Fully backward-compatible: days without a pattern behave identically to today.

## Files to Modify

| File | Change |
|------|--------|
| `backend/internal/domain/progression.go` | **NEW** — types + pure calc logic |
| `backend/internal/domain/program.go` | Add `ProgressionPattern *ProgressionPattern` to `ProgramDay` and `ProgramDayInput`; wire validation in `newProgramDay()` |
| `backend/internal/domain/errors.go` | Add 4 progression validation errors |
| `backend/internal/db/migrations_postgres.go` | Add ALTER TABLE to `pgAlterMigrations` for nullable `progression_config TEXT` column |
| `backend/internal/store/program.go` | `insertDay`: serialize pattern to JSON; `getDays`: deserialize nullable column |
| `backend/internal/api/requests/program.go` | Add `ProgressionPattern` to `ProgramDayRequest`, `ProgramDayResponse`, `ScheduledSessionResponse`; update conversion functions |
| `frontend/src/api/types.ts` | Add `ProgressionType`, `StrengthProgressionConfig`, `SkillProgressionConfig`, `ProgressionPattern`; extend `ProgramDay`, `ProgramDayInput`, `ScheduledSession` |
| `frontend/src/components/training-programs/ProgramBuilder.tsx` | Extend `DaysStep` with pattern toggle + conditional sub-forms; extend `ReviewStep` with pattern badge |
| `backend/internal/domain/progression_test.go` | **NEW** — testify suite: validation + CalculateNextTargets logic |

## Domain Types (`progression.go`)

```go
type ProgressionType string  // "strength" | "skill"

type ProgressionPattern struct {
    Type     ProgressionType `json:"type"`
    Strength *StrengthConfig `json:"strength,omitempty"`
    Skill    *SkillConfig    `json:"skill,omitempty"`
}

type StrengthConfig struct {
    BaseWeight       float64 `json:"baseWeight"`       // kg, > 0
    IncrementUnit    float64 `json:"incrementUnit"`    // kg, 0.5–20.0
    SuccessThreshold float64 `json:"successThreshold"` // 0.5–1.0 (fraction of sets)
    DeloadFrequency  int     `json:"deloadFrequency"`  // sessions between deloads, 1–12
}

type SkillConfig struct {
    MinSeconds int     `json:"minSeconds"` // > 0
    MaxSeconds int     `json:"maxSeconds"` // > MinSeconds
    RPETarget  float64 `json:"rpeTarget"`  // 1.0–10.0
}

type SessionAdherence struct {
    PlannedSets    int
    CompletedSets  int
    TimeHeldSec    int     // for skill
    TargetTimeMin  int     // skill window that was active
    TargetTimeMax  int     // skill window that was active
    LastBaseWeight float64 // strength: weight used last session
}

type TargetOutput struct {
    BaseWeight      float64 `json:"baseWeight"`
    TargetTimeMin   int     `json:"targetTimeMin"`
    TargetTimeMax   int     `json:"targetTimeMax"`
    IsDeloadSession bool    `json:"isDeloadSession"`
    Progression     string  `json:"progression"` // e.g. "Progressed +2.5kg" | "Hold"
}
```

### CalculateNextTargets logic (pure, no ctx — stubbed, not wired to any endpoint in Phase 1)

The function is fully implemented and tested. It becomes callable once Phase 3 (Active Session UI) provides real adherence data. No API endpoint calls it in this phase.

**Strength branch:**
- `adherenceRatio = CompletedSets / PlannedSets`
- If `adherenceRatio >= SuccessThreshold` → next weight = `LastBaseWeight + IncrementUnit`, progression = "Progressed +Xkg"
- Else → next weight = `LastBaseWeight` (hold), progression = "Hold"
- Deload: caller sets `PlannedSets = 0` as sentinel → output `IsDeloadSession = true`, weight = `LastBaseWeight * 0.9`

**Skill branch:**
- If `TimeHeldSec >= TargetTimeMax` → shift window up by 2s on both min/max, progression = "Window advanced"
- If `TimeHeldSec < TargetTimeMin` → shift window down by 2s (floor at 0), progression = "Window regressed"
- Else → hold current window, progression = "Hold"

### Validation rules

- Exactly one of Strength/Skill must be non-nil, matching Type discriminator
- Strength: BaseWeight > 0, IncrementUnit ∈ [0.5, 20.0], SuccessThreshold ∈ [0.5, 1.0], DeloadFrequency ∈ [1, 12]
- Skill: MinSeconds > 0, MaxSeconds > MinSeconds, RPETarget ∈ [1.0, 10.0]

## Migration

Append to `pgAlterMigrations` slice:
```go
`ALTER TABLE program_days ADD COLUMN IF NOT EXISTS progression_config TEXT`
```
Nullable TEXT; NULL = no pattern. Follows existing JSON-in-TEXT pattern (see `equipment`, `tags` columns).

## Store Changes

- `insertDay`: if `day.ProgressionPattern != nil`, marshal to JSON and insert; else pass `nil` (SQL NULL)
- `getDays`: SELECT adds `COALESCE(progression_config, '')`, scan string, unmarshal if non-empty

## API Request/Response Changes

Add `ProgressionPattern *domain.ProgressionPattern` (with `json:"progressionPattern,omitempty"`) to:
- `ProgramDayRequest`
- `ProgramDayResponse`
- `ScheduledSessionResponse`

Wire through `ProgramInputFromRequest` and `ProgramToResponse` conversion functions.

## Frontend UI (DaysStep)

After the existing 4-field grid per day, add a pattern selector row:
- Three-button toggle: **None** / **Strength** / **Skill**
- Strength selected → sub-form: base weight (number, step 0.5 kg), increment unit (number, step 0.5, default 2.5), success threshold (select: 60%/70%/80%/100%, default 80%), deload frequency (select: 2/3/4/6 sessions, default 4)
- Skill selected → sub-form: min seconds (number), max seconds (number, must be > min), RPE target (number, step 0.5, 1–10)

ReviewStep: show small badge per day if pattern is set (e.g. "Strength 5x5" or "Skill TM").

## Tests to Write (`progression_test.go`)

Using `testify/suite` pattern (matching `training_test.go`):

1. **ValidateProgressionPattern**
   - Valid strength config passes
   - Valid skill config passes
   - Missing sub-config returns error
   - Type/config mismatch returns error
   - Out-of-range fields return specific errors

2. **CalculateNextTargets (strength)**
   - Full adherence → weight increments
   - Partial adherence below threshold → hold
   - Deload sentinel (PlannedSets=0) → 90% weight, IsDeloadSession=true

3. **CalculateNextTargets (skill)**
   - TimeHeldSec >= MaxSeconds → window shifts up +2s
   - TimeHeldSec < MinSeconds → window shifts down -2s (floor 0)
   - TimeHeldSec in range → hold

4. **newProgramDay with pattern** — valid pattern attaches; invalid pattern returns error

## Verification

```bash
cd backend
go test ./internal/domain/ -run TestProgressionSuite -v   # domain logic
go test ./internal/store/ -run TestProgram -v              # round-trip with pattern
go test ./...                                              # full backend suite

cd frontend
npm run test:run                                           # unit tests
npm run build                                              # verify TS compilation
```
