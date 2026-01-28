# Plan: Wire ActiveSessionView into daily flow + Hook up EchoModal post-workout

## Problem Statement

Two gaps in the training flow:

1. **ActiveSessionView is unreachable from daily hub.** After installing a program, `ActiveInstallationContext` tracks today's scheduled session via `sessionsByDate`, but nothing surfaces it in the UI. The only path to ActiveSessionView is `ProgramDetailModal` → "Play Session", which plays a *template day* and discards the result (`onComplete` just clears state).

2. **EchoModal is orphaned.** `DraftSessionCard` (which hosts EchoModal) is never rendered. `LogWorkoutView` saves sessions immediately via `onUpdateActual` → `PATCH /api/logs/{date}/actual-training`. The backend echo API (`quickSubmitSession` / `submitSessionEcho` / `finalizeSession`) exists but is never called from the frontend.

## Design Decisions

- **ActiveSessionView renders inline** in MissionZone (replaces its content when a session is active)
- **ScheduledSession lacks sessionExercises.** To run exercises, MissionZone/CommandCenter must fetch the full program (`getTrainingProgram`) and resolve the matching day by `weekNumber` + `dayNumber` from the scheduled session
- **Draft creation in LogWorkoutView**: After `onUpdateActual` succeeds (sessions already persisted as actual), additionally call `quickSubmitSession` per non-rest session to create drafts eligible for Echo enrichment. This keeps the existing actual-training flow intact while adding the Echo layer on top.

## Implementation

### Part A: Surface today's program session → start inline in MissionZone

**1. `frontend/src/components/command-center/CommandCenter.tsx`**
- Import `useActiveInstallation` and `getTrainingProgram`
- In a `useEffect`: if `installation` exists, get today's `ScheduledSession` from `sessionsByDate`
- Fetch full program to resolve `sessionExercises` for today's day (match by `weekNumber` + `dayNumber`)
- Pass `todaysProgramSession: { scheduledSession, exercises: SessionExercise[] } | null` down to MissionZone

**2. `frontend/src/components/command-center/MissionZone.tsx`**
- New prop: `programSession?: { scheduledSession: ScheduledSession; exercises: SessionExercise[] }`
- New state: `activeSession: boolean` (controls whether to show ActiveSessionView inline)
- When `programSession` exists and training not yet done: render a program session card with label + "Start Session" button
- On "Start Session": set `activeSession = true`, render `<ActiveSessionView>` replacing MissionZone body
- On `onComplete(result)`: call `quickSubmitSession(today, { type, durationMin, perceivedIntensity, notes })` to persist as draft → store returned `SessionResponse` in state → show `DraftSessionCard`
- On `onAbort`: set `activeSession = false`

**3. `frontend/src/components/training-programs/ProgramDetailModal.tsx`**
- Wire `onComplete` to also call `quickSubmitSession` (same as MissionZone), then show `DraftSessionCard` temporarily before closing
- This ensures "Play Session" from the detail modal also creates a persisted draft

### Part B: DraftSessionCards after LogWorkoutView save

**4. `frontend/src/components/training/LogWorkoutView.tsx`**
- New state: `draftSessions: SessionResponse[]`
- In `handleSave`, after `onUpdateActual` succeeds: for each non-rest session, call `quickSubmitSession(log.date, session)`
- Collect responses into `draftSessions` state
- Render `DraftSessionCard` components (from `./DraftSessionCard`) below the receipt/report area
- `onUpdate` (echo success): remove that card from `draftSessions` (or update it to show finalized state)
- `onFinalize` (skip): remove that card from `draftSessions`

**5. `frontend/src/components/training/index.ts`**
- Add export for `DraftSessionCard`

## Critical Files

| File | Lines of interest | Change summary |
|------|-------------------|----------------|
| `frontend/src/components/command-center/CommandCenter.tsx` | ~112-142 (planned sessions fetch) | Add program session resolution via context + API |
| `frontend/src/components/command-center/MissionZone.tsx` | ~6-12 (props), ~44-60 (render) | New prop, inline ActiveSessionView + DraftSessionCard |
| `frontend/src/components/training-programs/ProgramDetailModal.tsx` | 88-100 (onComplete) | Persist session + show DraftSessionCard |
| `frontend/src/components/training/LogWorkoutView.tsx` | 223-315 (handleSave), 893-911 (bottom render) | Create drafts, render DraftSessionCards |
| `frontend/src/components/training/index.ts` | line 4 | Export DraftSessionCard |

## Verification

1. `cd frontend && npm run dev`
2. Install a training program with exercises, starting today, mapped to today's weekday
3. Go to CommandCenter (home) → MissionZone should show "Day X - [label]" with "Start Session" button
4. Click "Start Session" → exercises appear inline, work through them → SessionCompleteScreen → Finish
5. DraftSessionCard appears with pulsing "Pending Echo" indicator
6. Click "Submit Echo" → EchoModal opens → type a reflection → transmit → see parsed achievements
7. Separately: use LogWorkoutView to log a manual workout → Save → DraftSessionCard(s) appear for each session → same Echo flow
8. Run `npm run test:run` — no regressions
