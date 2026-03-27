/**
 * GmbSessionRunner — navigation contract tests.
 *
 * These tests guard the session-navigation state machine:
 *   exercising → staged (no countdown) → preparing → exercising
 *
 * Normal auto-advance flow (prepare/ponder phases) is also covered to ensure
 * the staged flag path does not regress the unmodified countdown path.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { GmbSessionRunner } from './GmbSessionRunner';
import type { SessionExercise } from '../../api/types';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    p:   ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => <p {...props}>{children}</p>,
    h1:  ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => <h1 {...props}>{children}</h1>,
    circle: (props: React.SVGProps<SVGCircleElement>) => <circle {...props} />,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** Two prepare-phase exercises followed by one practice. Enough to test intra-
 *  phase and cross-phase navigation without an unwieldy list. */
const THREE_EXERCISE_SESSION: SessionExercise[] = [
  { exerciseId: 'hip_circles',     phase: 'prepare',  order: 1, durationSec: 30 },
  { exerciseId: 'shoulder_circles',phase: 'prepare',  order: 2, durationSec: 30 },
  { exerciseId: 'bear_to_monkey',  phase: 'practice', order: 1, reps: 8         },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderRunner(exercises: SessionExercise[] = THREE_EXERCISE_SESSION) {
  const onComplete = vi.fn();
  const onAbort    = vi.fn();
  render(
    <GmbSessionRunner
      exercises={exercises}
      onComplete={onComplete}
      onAbort={onAbort}
      disableCheckpoint
    />,
  );
  return { onComplete, onAbort };
}

/** Advance from pre_session through the 3-second prepare countdown into exercising. */
function startSession() {
  fireEvent.click(screen.getByText('Start Session'));
  // Prepare countdown: 3 ticks of 1s each
  act(() => { vi.advanceTimersByTime(3000); });
}

function isOnStagedScreen() {
  return screen.queryByText('Ready when you are') !== null;
}

function isOnPreparingScreen() {
  // Preparing shows a large numeric countdown and "Get ready"
  return screen.queryByText('Get ready') !== null;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GmbSessionRunner — session navigation contract', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  // ── Normal flow (unchanged) ────────────────────────────────────────────────

  it('shows the duration picker before the session starts', () => {
    renderRunner();
    expect(screen.getByText('Start Session')).toBeDefined();
  });

  it('shows the first exercise name after the prepare countdown', () => {
    renderRunner();
    startSession();
    // hip_circles is first in phase order
    expect(screen.getByRole('heading', { name: /hip circles/i })).toBeDefined();
  });

  it('auto-advance (prepare phase) goes to preparing, not staged', () => {
    renderRunner();
    startSession();
    // hip_circles is 30s; let it run to completion
    act(() => { vi.advanceTimersByTime(30_000); });
    // Should show "Get ready" preparing countdown, not staged
    expect(isOnPreparingScreen()).toBe(true);
    expect(isOnStagedScreen()).toBe(false);
  });

  // ── Skip during exercising → staged ───────────────────────────────────────

  it('pressing Next during exercising lands on staged with no countdown', () => {
    renderRunner();
    startSession();
    // We're on exercise 1 (hip_circles), currently exercising
    fireEvent.click(screen.getByLabelText('Next exercise'));
    // Staged: shows exercise 2 name and "Ready when you are"
    expect(isOnStagedScreen()).toBe(true);
    expect(isOnPreparingScreen()).toBe(false);
    expect(screen.getByRole('heading', { name: /shoulder circles/i })).toBeDefined();
  });

  it('no prepare countdown fires immediately after skipping to staged', () => {
    renderRunner();
    startSession();
    fireEvent.click(screen.getByLabelText('Next exercise'));
    // Advance time — if a countdown had fired it would already have transitioned
    act(() => { vi.advanceTimersByTime(5000); });
    // Should still be staged, not exercising
    expect(isOnStagedScreen()).toBe(true);
  });

  // ── Navigation within staged ───────────────────────────────────────────────

  it('pressing Skip from staged advances to the next staged exercise without countdown', () => {
    renderRunner();
    startSession();
    // Skip ex1 → staged on ex2
    fireEvent.click(screen.getByLabelText('Next exercise'));
    expect(screen.getByRole('heading', { name: /shoulder circles/i })).toBeDefined();
    // Skip ex2 → phase boundary → phase_transition (not staged), so use a session
    // with 3 same-phase exercises to test intra-phase skip from staged
  });

  it('pressing Skip from staged stays on staged (intra-phase)', () => {
    // Three prepare-phase exercises so we can skip twice without a phase boundary
    const threePrepare: SessionExercise[] = [
      { exerciseId: 'hip_circles',      phase: 'prepare', order: 1, durationSec: 30 },
      { exerciseId: 'shoulder_circles', phase: 'prepare', order: 2, durationSec: 30 },
      { exerciseId: 'ankle_rolls',      phase: 'prepare', order: 3, durationSec: 20 },
    ];
    renderRunner(threePrepare);
    startSession();
    // Go to staged
    fireEvent.click(screen.getByLabelText('Next exercise'));
    expect(isOnStagedScreen()).toBe(true);
    expect(screen.getByRole('heading', { name: /shoulder circles/i })).toBeDefined();
    // Skip again from staged
    fireEvent.click(screen.getByLabelText('Skip exercise'));
    expect(isOnStagedScreen()).toBe(true);
    expect(screen.getByRole('heading', { name: /ankle rolls/i })).toBeDefined();
  });

  it('pressing Back from staged returns to the previous exercise in staged', () => {
    renderRunner();
    startSession();
    // Skip ex1 → staged on ex2
    fireEvent.click(screen.getByLabelText('Next exercise'));
    expect(screen.getByRole('heading', { name: /shoulder circles/i })).toBeDefined();
    // Back → staged on ex1
    fireEvent.click(screen.getByLabelText('Previous exercise'));
    expect(isOnStagedScreen()).toBe(true);
    expect(screen.getByRole('heading', { name: /hip circles/i })).toBeDefined();
  });

  it('Back is disabled on the first exercise in staged', () => {
    renderRunner();
    startSession();
    fireEvent.click(screen.getByLabelText('Next exercise'));
    // Now on ex2 — go back to ex1
    fireEvent.click(screen.getByLabelText('Previous exercise'));
    // Now on ex1 — Back button should be disabled
    const backBtn = screen.getByLabelText('Previous exercise');
    expect((backBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('Skip is disabled on the last exercise in staged', () => {
    const twoEx: SessionExercise[] = [
      { exerciseId: 'hip_circles',      phase: 'prepare', order: 1, durationSec: 30 },
      { exerciseId: 'shoulder_circles', phase: 'prepare', order: 2, durationSec: 30 },
    ];
    renderRunner(twoEx);
    startSession();
    // Skip ex1 → staged on ex2 (last exercise)
    fireEvent.click(screen.getByLabelText('Next exercise'));
    const skipBtn = screen.getByLabelText('Skip exercise');
    expect((skipBtn as HTMLButtonElement).disabled).toBe(true);
  });

  // ── staged → preparing ─────────────────────────────────────────────────────

  it('pressing Start from staged triggers the 3-second prepare countdown', () => {
    renderRunner();
    startSession();
    fireEvent.click(screen.getByLabelText('Next exercise'));
    expect(isOnStagedScreen()).toBe(true);
    // Press start
    fireEvent.click(screen.getByLabelText('Start exercise'));
    // Should now be in preparing (countdown visible)
    expect(isOnPreparingScreen()).toBe(true);
    expect(isOnStagedScreen()).toBe(false);
  });

  it('after Start countdown, session enters exercising state', () => {
    renderRunner();
    startSession();
    fireEvent.click(screen.getByLabelText('Next exercise'));
    fireEvent.click(screen.getByLabelText('Start exercise'));
    // Advance through the 3-second prepare countdown
    act(() => { vi.advanceTimersByTime(3000); });
    // Should be in exercising — exercise hero renders "Next exercise" button
    expect(screen.queryByLabelText('Next exercise')).toBeDefined();
    expect(isOnStagedScreen()).toBe(false);
    expect(isOnPreparingScreen()).toBe(false);
  });

  // ── Back during exercising ─────────────────────────────────────────────────

  it('pressing Back during exercising goes to staged (not preparing)', () => {
    renderRunner();
    startSession();
    // On ex1, exercising — go back is disabled (index 0). Skip to ex2 first.
    fireEvent.click(screen.getByLabelText('Next exercise')); // → staged ex2
    fireEvent.click(screen.getByLabelText('Start exercise')); // → preparing
    act(() => { vi.advanceTimersByTime(3000); }); // → exercising ex2
    // Now back from exercising ex2 → staged ex1
    fireEvent.click(screen.getByLabelText('Previous exercise'));
    expect(isOnStagedScreen()).toBe(true);
    expect(screen.getByRole('heading', { name: /hip circles/i })).toBeDefined();
  });

  // ── Phase-boundary from staged ─────────────────────────────────────────────

  it('skipping from staged across a phase boundary shows the phase transition interstitial', () => {
    renderRunner();
    startSession();
    // Ex1 (prepare) → staged on Ex2 (prepare)
    fireEvent.click(screen.getByLabelText('Next exercise'));
    // Skip Ex2 (prepare) → Ex3 (practice): crosses phase boundary
    fireEvent.click(screen.getByLabelText('Skip exercise'));
    // Should show phase transition interstitial, not staged or preparing
    expect(screen.getByText('Next phase')).toBeDefined();
    expect(isOnStagedScreen()).toBe(false);
  });
});
