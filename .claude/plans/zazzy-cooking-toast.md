# Plan: Phase 2 Enhancements + Phase 3 Active Session UI

## Scope

Phase 2 (Block Constructor) is complete but needs polish. Phase 3 (Active Session runtime) is entirely new.

---

## Part A — Phase 2 Enhancements (Polish)

### A1. Exercise count + duration estimate badges on phase headers

**File:** `PhaseDropZone.tsx`

Add to the phase header row (after the accent label):
- Exercise count badge: `(3)` styled as a muted pill
- Estimated duration: sum `exerciseDef.defaultDurationSec` (timed) or assume ~15s per rep for rep-based; display as `~2 min`

This gives users instant feedback on session balance across phases without expanding anything.

### A2. Up/down reorder buttons on placed exercises

**File:** `ExerciseNode.tsx` + `PhaseDropZone.tsx` + `SessionFlowCanvas.tsx`

- Add optional `onMoveUp` / `onMoveDown` callbacks to `ExerciseNode` props (only passed when `inCanvas && index > 0 / index < last`)
- Render small up/down chevron buttons (left of the remove ✕), visible on hover
- `SessionFlowCanvas` provides reorder logic: swap adjacent items in the phase array, then re-assign `order` values sequentially

### A3. Move-between-phases capability on placed exercises

**File:** `ExerciseNode.tsx` + `PhaseDropZone.tsx` + `SessionFlowCanvas.tsx`

- Add a small phase-color dot button on placed exercises that cycles or opens a mini-picker to move the exercise to another phase
- `SessionFlowCanvas` exposes a `handleMove(fromPhase, toPhase, order)` callback
- This lets users correct mis-dropped exercises without removing and re-dragging

---

## Part B — Phase 3: Active Session UI (New Components)

### B1. `RPEDial.tsx` — Semi-circular RPE gauge

**File:** `frontend/src/components/training-programs/RPEDial.tsx` (new)

Props: `{ value: number; onChange: (rpe: number) => void; readOnly?: boolean }`

- SVG semi-circular arc (180°), divided into color zones:
  - Green (`#22c55e`): RPE 1–4
  - Yellow (`#eab308`): RPE 5–6
  - Orange (`#f97316`): RPE 7–8
  - Red (`#ef4444`): RPE 9–10
- 10 clickable invisible `<path>` segments (one per RPE value) as tap targets
- Center: large RPE number + zone label ("Easy" / "Moderate" / "Hard" / "Max")
- Needle/indicator dot at current value position on the arc
- `readOnly` mode hides tap targets

### B2. `RestInterventionScreen.tsx` — Full-screen rest countdown

**File:** `frontend/src/components/training-programs/RestInterventionScreen.tsx` (new)

Props: `{ remainingSeconds: number; totalSeconds: number; onSkip: () => void; nextExercise?: { def: ExerciseDef } }`

- Full-screen `bg-emerald-900` with high-contrast `bg-emerald-500` progress bar at top (width shrinks via `motion.div` animate)
- Center: large "REST" heading + `MM:SS` countdown in `text-6xl font-bold text-white`
- Bottom: "NEXT: {emoji} {name}" preview card if `nextExercise` provided
- "Skip Rest →" ghost button bottom-right (`text-emerald-300 hover:text-white`)
- Entrance via `fadeInUp` from `animations.ts`

### B3. `ExerciseCard.tsx` — Calimove-style active exercise card

**File:** `frontend/src/components/training-programs/ExerciseCard.tsx` (new)

Props:
```typescript
{
  exerciseDef: ExerciseDef;
  sessionExercise: SessionExercise;
  index: number;            // 0-based position
  total: number;            // total exercises in session
  elapsedSec: number;       // running timer (for timed exercises)
  currentRep: number;       // current rep count (for rep-based)
  rpe: number;              // current RPE setting
  onDone: () => void;
  onRpeChange: (rpe: number) => void;
  onRepIncrement: () => void;
  onAbort: () => void;
}
```

Layout (flex column, full viewport):

1. **Header** (`h-14`, dark backdrop): phase badge (amber/teal/violet pill) | `EX. {i+1} OF {total}` | back chevron → `onAbort`

2. **Hero Zone** (flex-1, centered): Large emoji (`text-9xl`) inside a rounded gradient panel whose colors match the exercise's phase. Exercise name (`text-2xl`) + tag pills beneath.
   - Emoji uses `breatheAnimation` from `animations.ts` (subtle alive pulse)

3. **Data Overlay** (2-column strip, `py-4 px-6`):
   - Left: **TM Range** — for timed exercises show target range as `"{dur}s"` or `"{min}–{max}s"` if skill progression config available. Label: `TARGET TM`
   - Right: **RPE Dial** — `<RPEDial value={rpe} onChange={onRpeChange} />`

4. **Control Bar** (sticky bottom, `h-24`, dark backdrop with top border):
   - **Timed exercise**: `MM:SS` elapsed timer on left | green "Done" pill button on right
   - **Rep-based exercise**: `{currentRep} / {totalReps}` counter with a "+" increment button | green "Done" pill (enabled only when reps reached target, or always available for manual override)

### B4. `SessionCompleteScreen.tsx` — Post-session summary

**File:** `frontend/src/components/training-programs/SessionCompleteScreen.tsx` (new)

Props: `{ completedExercises: CompletedExercise[]; totalDurationSec: number; onFinish: () => void }`

- Green checkmark circle (scale-in animation)
- "Session Complete" heading
- Stats row: total time | exercises done | phases covered
- Scrollable exercise list with icon + name + duration + RPE badge
- "Finish" button

### B5. `ActiveSessionView.tsx` — Session state machine orchestrator

**File:** `frontend/src/components/training-programs/ActiveSessionView.tsx` (new)

Props:
```typescript
{
  exercises: SessionExercise[];
  onComplete: (result: SessionResult) => void;
  onAbort: () => void;
}
```

**State machine:**
```
EXERCISING ──(Done)──► RESTING ──(timer=0 | Skip)──► EXERCISING (next index)
     │                                                        │
     └──(Done on last exercise)──► COMPLETE                   │
                                                              └─► (loop)
```

**Key internal state:**
- `currentIndex: number` — which exercise in the resolved queue
- `sessionState: 'exercising' | 'resting' | 'complete'`
- `elapsedSec: number` — counts up during exercising (useRef interval, cleaned up on state change)
- `restRemaining: number` — counts down from `DEFAULT_REST_SEC` (90)
- `currentRep: number` — rep counter for rep-based exercises
- `rpeValues: Record<string, number>` — per-exercise RPE (keyed by exerciseId)
- `completedExercises: CompletedExercise[]` — accumulates as exercises finish

**Exercise resolution** (stable via `useMemo`):
- Filter `exercises` to those resolvable via `getExerciseById`
- Sort by phase order (prepare → practice → push), then by `order` within phase
- Merge `SessionExercise` overrides (`durationSec`, `reps`) with `ExerciseDef` defaults

**Timer pattern** (useRef + useEffect with cleanup):
- Exercise timer: `setInterval` incrementing `elapsedSec` every 1s; starts when `sessionState === 'exercising'`
- Rest timer: `setInterval` decrementing `restRemaining` every 1s; starts when `sessionState === 'resting'`; auto-transitions to next exercise when hits 0
- Both intervals cleared in useEffect cleanup on state/index change

**Rendering:** `<AnimatePresence>` wraps the three sub-views; transitions use `motion.div` with `fadeInUp` / `scaleIn`

### B6. Integration: `ProgramDetailModal.tsx`

**File:** `frontend/src/components/training-programs/ProgramDetailModal.tsx` (modify)

Changes:
- Add state: `showActiveSession: boolean`, `sessionDay: ProgramDay | null`
- In the Actions footer, add a green "▶ Play Session" button (conditionally rendered when at least one day in `program.weeks` has `sessionExercises`)
- On click: if multiple days have exercises, show a small inline day-picker (list of day labels with exercise counts). On selection, mount `<ActiveSessionView>` as a full-screen overlay (same `fixed inset-0 z-50` pattern as `ProgramBuilder`)
- If only one day has exercises, launch directly

---

## Part C — Tests

### C1. `ActiveSessionView.test.tsx`
- Renders ExerciseCard for first resolved exercise
- Advances to next exercise on Done
- Shows RestInterventionScreen between exercises
- Skips rest on Skip button
- Shows SessionCompleteScreen after final Done
- `onComplete` receives correct `SessionResult` shape
- `onAbort` fires on back button
- Handles empty exercises array (immediate complete)
- Resolves exercises in phase order (prepare → practice → push)
- Ignores unknown exerciseIds without crash

### C2. `RPEDial.test.tsx`
- Renders with initial value
- Correct color zone per RPE range
- `onChange` fires on segment tap
- `readOnly` mode hides tap targets

### C3. `RestInterventionScreen.test.tsx`
- Displays countdown from provided seconds
- `onSkip` fires on Skip button press
- Shows next exercise preview when prop provided

---

## Critical Files

| File | Action |
|------|--------|
| `frontend/src/components/training-programs/PhaseDropZone.tsx` | Modify — add count/duration badges to header |
| `frontend/src/components/training-programs/ExerciseNode.tsx` | Modify — add reorder arrows + move-phase button (canvas mode) |
| `frontend/src/components/training-programs/SessionFlowCanvas.tsx` | Modify — add reorder + move handlers |
| `frontend/src/components/training-programs/RPEDial.tsx` | New |
| `frontend/src/components/training-programs/RestInterventionScreen.tsx` | New |
| `frontend/src/components/training-programs/ExerciseCard.tsx` | New |
| `frontend/src/components/training-programs/SessionCompleteScreen.tsx` | New |
| `frontend/src/components/training-programs/ActiveSessionView.tsx` | New |
| `frontend/src/components/training-programs/ProgramDetailModal.tsx` | Modify — add Play Session trigger |
| `frontend/src/components/training-programs/ActiveSessionView.test.tsx` | New |
| `frontend/src/components/training-programs/RPEDial.test.tsx` | New |
| `frontend/src/components/training-programs/RestInterventionScreen.test.tsx` | New |

---

## Verification

1. **Phase 2 polish**: Open ProgramBuilder → Days step → expand a day → verify phase headers show exercise count + duration; drag an exercise into a phase, verify up/down arrows and move-to-phase button appear
2. **Phase 3 active session**: Open ProgramDetailModal on a program with session exercises → click "Play Session" → step through exercises with timer → verify rest screen appears between exercises → complete all exercises → verify summary screen
3. **Tests**: `cd frontend && npm run test:run` — all new test files pass
4. **Build**: `cd frontend && npm run build` — no TypeScript errors

## Implementation Order

1. Phase 2 enhancements (A1 → A2 → A3) — foundational polish
2. RPEDial (B1) — leaf component, no dependencies
3. RestInterventionScreen (B2) — leaf component
4. ExerciseCard (B3) — composes RPEDial
5. SessionCompleteScreen (B4) — leaf component
6. ActiveSessionView (B5) — composes all above
7. ProgramDetailModal integration (B6) — wires it all together
8. Tests (C) — validate behavior
