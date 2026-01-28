# Ghost Load Simulator — Implementation Plan

## What we're building
Phase 4 of the Program Builder PRD: a real-time fatigue preview that glows on the Body Map as users configure their training days, plus a "Neural Overload" warning badge when 3+ consecutive days hit RPE ≥ 8.

## Architecture: fully client-side
All backend fatigue formulas are pure functions with no I/O. Archetype configs (muscle coefficients) are fetched once via the existing `getArchetypes()` API. The simulation runs in `useMemo` on every edit — zero network latency for real-time feedback. No new backend endpoints.

## Files to create

| File | Role |
|------|------|
| `frontend/src/utils/simulateGhostLoad.ts` | Pure simulation engine — TrainingType→Archetype mapping, loadScore→RPE conversion, day-by-day fatigue loop, Neural Overload detection |
| `frontend/src/utils/simulateGhostLoad.test.ts` | Unit tests for the engine (mapping, math fidelity, edge cases, overload detection) |
| `frontend/src/components/training-programs/GhostLoadPanel.tsx` | React component: calls engine via `useMemo`, renders `BodyMapVisualizer size="sm"` + warning badge + per-day RPE strip |

## File to modify

| File | Changes |
|------|---------|
| `frontend/src/components/training-programs/ProgramBuilder.tsx` | (1) Fetch archetypes on mount via `useEffect` + `getArchetypes()`. (2) Pass archetypes to `DaysStep`. (3) Add `<GhostLoadPanel>` at bottom of `DaysStep` (below day cards, above progression patterns — outside the `max-h-96` scrollable area). (4) Add `<GhostLoadPanel>` section in `ReviewStep` using first non-deload week's `intensityScale`. |

## Simulation algorithm

```
simulateGhostLoad(dayTemplates, intensityScale, archetypes) → { muscleFatigues, neuralOverload, dailyRPEs }

1. Build archetype lookup: name → coefficients map
2. Init all 15 muscle groups at 0% fatigue
3. For each day template (in order):
   a. If not first day: apply 24h decay to all muscles
      (decay = max(0, current − 24 × 2.0))
   b. effectiveRPE = min(10, loadScore × 2 × intensityScale)
   c. archetype = TRAINING_TYPE_TO_ARCHETYPE[trainingType]
   d. totalLoad = durationMin × (effectiveRPE / 10) / 10
   e. For each muscle in archetype coefficients:
      injection = totalLoad × coefficient × 100
      muscle% = min(100, muscle% + injection)
4. Neural Overload: 3+ consecutive days with effectiveRPE ≥ 8
5. Convert muscle state → MuscleFatigue[] using getMuscleColor + getFatigueStatus
```

## Key design decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Neural Overload threshold | RPE ≥ 8 (loadScore ≥ 4 at baseline) | Practically triggerable without intensityScale; user confirmed |
| Panel placement | Bottom of Days step + Review step | Real-time feedback while editing; confirmed by user |
| Days step intensityScale | 1.0 (baseline) | User hasn't committed to week scales yet at this step |
| Review step intensityScale | First non-deload week's actual scale | Shows impact of the week structure the user configured |
| Recovery between days | 24 hours | One calendar day between training sessions in a week |

## TrainingType → Archetype mapping

```typescript
strength     → upper        // compound upper movements
calisthenics → full_body
hiit         → full_body
run          → cardio_impact
row          → pull
cycle        → cardio_low
mobility     → cardio_low
gmb          → full_body
walking      → cardio_low
qigong       → cardio_low
```

## GhostLoadPanel component shape

```tsx
interface GhostLoadPanelProps {
  dayTemplates: ProgramDayInput[];
  intensityScale: number;
  archetypes: ArchetypeConfig[];
}
```

Renders:
1. `BodyMapVisualizer muscles={simulated} size="sm"` — body map glows via existing >60% glow filters
2. Neural Overload badge (red, pulsing dot) when `neuralOverload === true`
3. Per-day RPE color strip — small row of colored squares (green/yellow/orange/red) matching effective RPE zones, one per day template

## Test strategy

**`simulateGhostLoad.test.ts`** (unit tests for pure engine):
- Every TrainingType resolves to a valid Archetype; unknown types don't crash
- LoadScore × 2 mapping + intensityScale clamping to 10
- Single-day math: 60min strength loadScore 3 at scale 1.0 → RPE 6, totalLoad = 0.36, chest injection = 0.36 × coeff × 100
- 24h decay wipes ≤48% fatigue completely; preserves >48%
- Fatigue caps at 100% with extreme inputs
- Neural Overload: 3 consecutive loadScore ≥ 4 triggers; 2 does not; a rest day resets streak
- Empty inputs (no days, no archetypes) return all-zero state, no crash
- All 15 muscle groups present in output with valid status/color

**GhostLoadPanel** — tested via integration in ProgramBuilder if a component test file is warranted; at minimum verified via the engine tests + manual smoke.

## Verification

```bash
cd frontend
npm run test:run -- --reporter=verbose simulateGhostLoad
npm run test:run                        # full suite passes
npm run build                           # no TS errors
```

Manual: open ProgramBuilder → step 3 (Days) → set 4 days with loadScore 4 and strength type → body map should show upper-body glow → badge should read "Neural Overload". Change one day to walking → badge disappears.
