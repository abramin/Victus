# Tactical Briefing — Readability & Logic Fixes

## Issues & Fixes

### 1. Mission Summary contrast (TacticalBriefing.tsx)

**File:** `frontend/src/components/plan/TacticalBriefing.tsx` lines 256–263

Current state:
- Generated insight: `text-gray-300` — readable but muted
- Fallback (non-generated): `text-gray-600 italic` — near-invisible on `bg-gray-950`
- `font-mono` already present on the container (line 256) — keep it

Fix:
- Both branches → `text-slate-200`
- Remove `italic` from fallback so both paths render consistently as a system log

### 2. Sleep duration: decimal → "Xh Ym" (two sites)

**File A:** `frontend/src/components/plan/TacticalBriefing.tsx` line 196
```tsx
// Current
{log.sleepHours ? `${formatNumber(log.sleepHours, WEIGHT_DECIMALS)}h` : log.sleepQuality}
// Renders: "6.36h"
```

**File B:** `frontend/src/components/debrief/DayDetailModal.tsx` line 71
```tsx
// Current
value={day.sleepHours ? `${day.sleepHours.toFixed(1)} hrs` : '—'}
// Renders: "7.6 hrs"
```

A `formatSleepHours` helper already exists locally in `BiometricsStrip.tsx` (lines 25–30). Extract it into `frontend/src/utils/format.ts` so it can be shared:

```typescript
export function formatSleepHours(hours: number | undefined | null): string {
  if (hours == null) return '—';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
```

Then import and use it in both sites. Also update `BiometricsStrip.tsx` to use the shared version (delete local copy).

### 3. "0% protein intake" — denominator short-circuit bug

**File:** `backend/internal/service/dailylog.go` lines 869–873

```go
proteinPercent := 0
if log.CalculatedTargets.TotalCalories > 0 {
    proteinPercent = (log.ConsumedProteinG * 4 * 100) / log.CalculatedTargets.TotalCalories
}
```

**Root cause confirmed:** The store query (store/dailylog.go lines 71, 114) correctly populates `ConsumedProteinG`. The service `GetByDate` (service/dailylog.go line 225) passes through cleanly. The bug is the guard condition: when `CalculatedTargets.TotalCalories` is 0 (targets not yet calculated for this log), the entire block is skipped and `proteinPercent` remains 0 — even though consumed macros exist and the macro chart renders them.

**Fix:** Fall back to `ConsumedCalories` as denominator when target is 0:

```go
proteinPercent := 0
denominator := log.CalculatedTargets.TotalCalories
if denominator == 0 {
    denominator = log.ConsumedCalories
}
if denominator > 0 {
    proteinPercent = (log.ConsumedProteinG * 4 * 100) / denominator
}
```

Also: the templated insight (line 963) should say "actual protein intake" to make it unambiguous that it's reporting consumed, not planned.

### 4. Macro chart legend overflow (MacroStackedBar.tsx)

**File:** `frontend/src/components/plan/MacroStackedBar.tsx` line 97

```tsx
<div className="flex gap-3 mt-2 text-[10px]">
```

Three legend items ("Protein 157g", "Carbs 236g", "Fat 57g") with `gap-3` can overflow the panel on narrow widths. The stacked bar itself is fine (percentage-based widths inside `overflow-hidden`), but the legend has no wrapping.

Fix: add `flex-wrap` to the legend container.

## Files to modify

| File | Change |
|------|--------|
| `frontend/src/utils/format.ts` | Add exported `formatSleepHours` |
| `frontend/src/components/plan/TacticalBriefing.tsx` | (1) Mission Summary contrast, (2) sleep format |
| `frontend/src/components/debrief/DayDetailModal.tsx` | Sleep format |
| `frontend/src/components/history/components/BiometricsStrip.tsx` | Remove local `formatSleepHours`, import shared |
| `frontend/src/components/plan/MacroStackedBar.tsx` | Add `flex-wrap` to legend row |
| `backend/internal/service/dailylog.go` | Floor proteinPercent; clarify "actual" in template |

## Verification

```bash
cd frontend
npm run build          # no TS errors
npm run test:run       # unit suite passes

cd backend
go test ./internal/service/... -run Insight -v   # insight logic
go build ./...                                    # compiles
```

Manual: open Tactical Briefing for a day with consumed macros → confirm [RESULT] text is bright `slate-200`, sleep reads "Xh Ym", macro legend wraps on narrow drawer, protein % is non-zero when macros exist.
