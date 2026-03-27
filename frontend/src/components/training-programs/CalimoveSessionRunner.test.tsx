/**
 * CalimoveSessionRunner — session navigation contract tests.
 *
 * Guards the 6-state machine:
 *   pre_session → exercising → set_rest → exercising
 *                           → resting → exercising
 *                           → complete
 * Plus pause/resume and abort.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CalimoveSessionRunner } from './CalimoveSessionRunner';
import type { CalisthenicsSession } from '../../api/types';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('framer-motion', () => ({
  motion: {
    div:    ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    h1:     ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => <h1 {...props}>{children}</h1>,
    p:      ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => <p {...props}>{children}</p>,
    circle: (props: React.SVGProps<SVGCircleElement>) => <circle {...props} />,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./calimoveCheckpoint', () => ({
  saveCalimoveCheckpoint: vi.fn(),
  clearCalimoveCheckpoint: vi.fn(),
}));

vi.mock('../../api/client', () => ({
  applyMuscleFatigue: vi.fn().mockResolvedValue(undefined),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** A 2-exercise strength session. Exercise 1 has 3 sets; exercise 2 has 2 sets. */
const TWO_EXERCISE_SESSION: CalisthenicsSession = {
  level: '1',
  sessionType: 'strength',
  restBetweenExercises: '90 sec',
  exerciseCount: 2,
  seed: 1,
  exercises: [
    {
      order: 1,
      name: 'Push-Up',
      type: 'strength',
      sets: 3,
      reps: '8-12',
      rep_type: 'RM',
      assisted: false,
      muscles: { primary: ['chest'], secondary: ['triceps'] },
      pattern: 'push',
    },
    {
      order: 2,
      name: 'Squat',
      type: 'strength',
      sets: 2,
      reps: '10-15',
      rep_type: 'RM',
      assisted: false,
      muscles: { primary: ['quads'], secondary: ['glutes'] },
      pattern: 'squat',
    },
  ],
};

/** Single isometric exercise — renders "Done" instead of "Set Complete". */
const ISOMETRIC_SESSION: CalisthenicsSession = {
  level: '1',
  sessionType: 'isometric',
  restBetweenExercises: '60 sec',
  exerciseCount: 1,
  seed: 2,
  exercises: [
    {
      order: 1,
      name: 'Plank Hold',
      type: 'isometric',
      sets: null,
      reps: '30 sec',
      rep_type: 'TM',
      assisted: false,
      muscles: { primary: ['core'], secondary: ['lower_back'] },
      pattern: 'isometric_core',
    },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderRunner(
  session: CalisthenicsSession = TWO_EXERCISE_SESSION,
  overrides: { onComplete?: ReturnType<typeof vi.fn>; onAbort?: ReturnType<typeof vi.fn> } = {},
) {
  const onComplete = overrides.onComplete ?? vi.fn();
  const onAbort    = overrides.onAbort    ?? vi.fn();
  render(
    <CalimoveSessionRunner
      session={session}
      onComplete={onComplete}
      onAbort={onAbort}
    />,
  );
  return { onComplete, onAbort };
}

function startSession() {
  fireEvent.click(screen.getByText('Start Session'));
}

function clickMainAction() {
  // Main action button: "Set Complete", "Exercise Done", or "Done" (isometric)
  const btn =
    screen.queryByText('Set Complete') ??
    screen.queryByText('Exercise Done') ??
    screen.queryByText('Done');
  if (!btn) throw new Error('No main action button found');
  fireEvent.click(btn);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CalimoveSessionRunner — session navigation contract', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  // ── Pre-session ────────────────────────────────────────────────────────────

  it('shows the session preview before starting', () => {
    renderRunner();
    expect(screen.getByText('Start Session')).toBeDefined();
    expect(screen.getByText('Session Preview')).toBeDefined();
  });

  it('renders the exercise list in the preview', () => {
    renderRunner();
    expect(screen.getByText('Push-Up')).toBeDefined();
    expect(screen.getByText('Squat')).toBeDefined();
  });

  // ── exercising ────────────────────────────────────────────────────────────

  it('transitions to exercising on Start and shows the first exercise', () => {
    renderRunner();
    startSession();
    expect(screen.getByRole('heading', { name: /push-up/i })).toBeDefined();
  });

  it('shows "Set Complete" when sets remain for the current exercise', () => {
    renderRunner();
    startSession();
    // Push-Up has 3 sets; on set 1 of 3, button reads "Set Complete"
    expect(screen.getByText('Set Complete')).toBeDefined();
  });

  it('shows "Exercise Done" on the last set', () => {
    renderRunner();
    startSession();
    // Complete sets 1 and 2 via set_rest
    fireEvent.click(screen.getByText('Set Complete')); // → set_rest (set 2)
    act(() => { vi.advanceTimersByTime(60_000); });    // auto-advance → exercising
    fireEvent.click(screen.getByText('Set Complete')); // → set_rest (set 3)
    act(() => { vi.advanceTimersByTime(60_000); });    // auto-advance → exercising
    // Now on set 3/3 — button should read "Exercise Done"
    expect(screen.getByText('Exercise Done')).toBeDefined();
  });

  it('shows "Done" for isometric exercises regardless of sets', () => {
    renderRunner(ISOMETRIC_SESSION);
    startSession();
    expect(screen.getByText('Done')).toBeDefined();
  });

  // ── set_rest ──────────────────────────────────────────────────────────────

  it('Set Complete on a non-final set transitions to set_rest', () => {
    renderRunner();
    startSession();
    fireEvent.click(screen.getByText('Set Complete'));
    // set_rest: shows "Rest between sets" label
    expect(screen.getByText(/rest between sets/i)).toBeDefined();
  });

  it('set_rest countdown auto-advances back to exercising', () => {
    renderRunner();
    startSession();
    fireEvent.click(screen.getByText('Set Complete'));
    expect(screen.getByText(/rest between sets/i)).toBeDefined();
    act(() => { vi.advanceTimersByTime(60_000); }); // setRestSec = 60
    // Back to exercising: heading visible again
    expect(screen.getByRole('heading', { name: /push-up/i })).toBeDefined();
  });

  it('Skip Rest in set_rest immediately returns to exercising', () => {
    renderRunner();
    startSession();
    fireEvent.click(screen.getByText('Set Complete'));
    fireEvent.click(screen.getByText('Skip Rest'));
    expect(screen.getByRole('heading', { name: /push-up/i })).toBeDefined();
  });

  // ── resting (between exercises) ──────────────────────────────────────────

  it('Exercise Done on last set transitions to resting with "Next:" label', () => {
    renderRunner();
    startSession();
    // Complete all 3 sets of Push-Up
    fireEvent.click(screen.getByText('Set Complete')); // set 1 → set_rest
    act(() => { vi.advanceTimersByTime(60_000); });    // → exercising set 2
    fireEvent.click(screen.getByText('Set Complete')); // set 2 → set_rest
    act(() => { vi.advanceTimersByTime(60_000); });    // → exercising set 3
    fireEvent.click(screen.getByText('Exercise Done')); // → resting
    expect(screen.getByText(/next:/i)).toBeDefined();
  });

  it('resting countdown auto-advances to the next exercise', () => {
    renderRunner();
    startSession();
    // Quick path: skip sets via set_rest to get to the between-exercise rest
    fireEvent.click(screen.getByText('Set Complete'));
    act(() => { vi.advanceTimersByTime(60_000); });
    fireEvent.click(screen.getByText('Set Complete'));
    act(() => { vi.advanceTimersByTime(60_000); });
    fireEvent.click(screen.getByText('Exercise Done'));
    expect(screen.getByText(/next:/i)).toBeDefined();
    act(() => { vi.advanceTimersByTime(90_000); }); // restBetweenExercises = 90 sec
    expect(screen.getByRole('heading', { name: /squat/i })).toBeDefined();
  });

  it('Skip Rest in resting immediately advances to the next exercise', () => {
    renderRunner();
    startSession();
    fireEvent.click(screen.getByText('Set Complete'));
    act(() => { vi.advanceTimersByTime(60_000); });
    fireEvent.click(screen.getByText('Set Complete'));
    act(() => { vi.advanceTimersByTime(60_000); });
    fireEvent.click(screen.getByText('Exercise Done'));
    fireEvent.click(screen.getByText('Skip Rest'));
    expect(screen.getByRole('heading', { name: /squat/i })).toBeDefined();
  });

  // ── complete ──────────────────────────────────────────────────────────────

  it('Exercise Done on the last exercise of the last set → complete screen', () => {
    // Use a single-exercise session for simplicity
    const oneEx: CalisthenicsSession = {
      level: '1',
      sessionType: 'strength',
      restBetweenExercises: '90 sec',
      exerciseCount: 1,
      seed: 1,
      exercises: [{
        order: 1,
        name: 'Push-Up',
        type: 'strength',
        sets: 1,
        reps: '8-12',
        rep_type: 'RM',
        assisted: false,
        muscles: { primary: ['chest'], secondary: [] },
        pattern: 'push',
      }],
    };
    renderRunner(oneEx);
    startSession();
    // Single set → "Exercise Done"
    fireEvent.click(screen.getByText('Exercise Done'));
    expect(screen.getByText('Session Complete')).toBeDefined();
  });

  it('isometric Done on last exercise → complete screen', () => {
    renderRunner(ISOMETRIC_SESSION);
    startSession();
    fireEvent.click(screen.getByText('Done'));
    expect(screen.getByText('Session Complete')).toBeDefined();
  });

  it('onComplete is called after RPE selection and Finish', async () => {
    const oneEx: CalisthenicsSession = {
      level: '1',
      sessionType: 'strength',
      restBetweenExercises: '90 sec',
      exerciseCount: 1,
      seed: 1,
      exercises: [{
        order: 1,
        name: 'Push-Up',
        type: 'strength',
        sets: 1,
        reps: '8-12',
        rep_type: 'RM',
        assisted: false,
        muscles: { primary: ['chest'], secondary: [] },
        pattern: 'push',
      }],
    };
    const { onComplete } = renderRunner(oneEx);
    startSession();
    fireEvent.click(screen.getByText('Exercise Done'));
    await act(async () => {
      fireEvent.click(screen.getByText('Finish'));
    });
    expect(onComplete).toHaveBeenCalledOnce();
  });

  // ── Back navigation ────────────────────────────────────────────────────────

  it('Back button is disabled on the first exercise', () => {
    renderRunner();
    startSession();
    const backBtn = screen.getByLabelText('Previous exercise') as HTMLButtonElement;
    expect(backBtn.disabled).toBe(true);
  });

  it('Back during exercising returns to the previous exercise (resets set to 1)', () => {
    renderRunner();
    startSession();
    // Skip to exercise 2 via resting
    fireEvent.click(screen.getByText('Set Complete'));
    act(() => { vi.advanceTimersByTime(60_000); });
    fireEvent.click(screen.getByText('Set Complete'));
    act(() => { vi.advanceTimersByTime(60_000); });
    fireEvent.click(screen.getByText('Exercise Done'));
    fireEvent.click(screen.getByText('Skip Rest'));
    expect(screen.getByRole('heading', { name: /squat/i })).toBeDefined();
    // Go back to Push-Up
    fireEvent.click(screen.getByLabelText('Previous exercise'));
    expect(screen.getByRole('heading', { name: /push-up/i })).toBeDefined();
    // Should restart at set 1
    expect(screen.getByText('SET 1/3')).toBeDefined();
  });

  // ── Skip navigation ────────────────────────────────────────────────────────

  it('Skip during exercising advances to the next exercise', () => {
    renderRunner();
    startSession();
    fireEvent.click(screen.getByLabelText('Skip exercise'));
    expect(screen.getByRole('heading', { name: /squat/i })).toBeDefined();
  });

  it('Skip is disabled on the last exercise', () => {
    // Start on single-exercise session
    const oneEx: CalisthenicsSession = {
      level: '1',
      sessionType: 'strength',
      restBetweenExercises: '90 sec',
      exerciseCount: 1,
      seed: 1,
      exercises: [{
        order: 1,
        name: 'Push-Up',
        type: 'strength',
        sets: 1,
        reps: '8-12',
        rep_type: 'RM',
        assisted: false,
        muscles: { primary: ['chest'], secondary: [] },
        pattern: 'push',
      }],
    };
    renderRunner(oneEx);
    startSession();
    const skipBtn = screen.getByLabelText('Skip exercise') as HTMLButtonElement;
    expect(skipBtn.disabled).toBe(true);
  });

  // ── Pause / Resume ─────────────────────────────────────────────────────────

  it('Pause shows the paused screen', () => {
    renderRunner();
    startSession();
    fireEvent.click(screen.getByLabelText('Pause'));
    expect(screen.getByText('Paused')).toBeDefined();
  });

  it('Resume from paused returns to exercising', () => {
    renderRunner();
    startSession();
    fireEvent.click(screen.getByLabelText('Pause'));
    fireEvent.click(screen.getByText('Resume'));
    expect(screen.getByRole('heading', { name: /push-up/i })).toBeDefined();
  });

  // ── Abort ─────────────────────────────────────────────────────────────────

  it('abort from pre_session calls onAbort without saving a checkpoint', async () => {
    const { saveCalimoveCheckpoint } = await import('./calimoveCheckpoint');
    const { onAbort } = renderRunner();
    // The back arrow on the preview screen
    fireEvent.click(screen.getByRole('button', { name: '' })); // first button is back arrow
    expect(onAbort).toHaveBeenCalledOnce();
    // Should NOT save checkpoint when aborting from pre_session
    expect(saveCalimoveCheckpoint).not.toHaveBeenCalled();
  });

  it('abort during exercising calls onAbort', () => {
    const { onAbort } = renderRunner();
    startSession();
    // The × button at the top
    fireEvent.click(screen.getByText('×'));
    expect(onAbort).toHaveBeenCalledOnce();
  });
});
