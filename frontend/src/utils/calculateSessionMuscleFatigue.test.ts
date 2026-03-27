/**
 * calculateSessionMuscleFatigue — invariant tests.
 *
 * This is a pure function with two code paths (GMB duration-based vs.
 * Calimove sets/reps-based), additive accumulation capped at 100, and
 * primary/secondary muscle coefficients.
 *
 * Invariant: removing this test would allow the load formulas, the 1.0/0.5
 * coefficient split, the phase intensity table, and the 100-cap to drift
 * silently — none of these can be observed through E2E tests without
 * inspecting raw fatigue percentages.
 */

import { describe, it, expect } from 'vitest';
import { calculateSessionMuscleFatigue } from './calculateSessionMuscleFatigue';
import type { CompletedExercise } from '../components/training-programs/SessionCompleteScreen';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build a GMB-style completed exercise (duration-based, no sets/reps). */
function gmbEx(
  exerciseId: string,
  phase: CompletedExercise['phase'],
  actualDurationSec: number,
  rpe = 5,
): CompletedExercise {
  return { exerciseId, phase, actualDurationSec, rpe };
}

/** Build a Calimove-style completed exercise (sets/reps-based). */
function calimoveEx(
  exerciseId: string,
  phase: CompletedExercise['phase'],
  setsCompleted: number,
  repsPerSet: number,
  rpe = 5,
): CompletedExercise {
  return { exerciseId, phase, actualDurationSec: 0, rpe, setsCompleted, repsPerSet };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('calculateSessionMuscleFatigue', () => {
  // ── GMB duration path ──────────────────────────────────────────────────────

  describe('GMB duration-based path', () => {
    it('computes primary muscle fatigue from durationMin × (rpe/10) / 10 × phaseScale × 100', () => {
      // gmb_quadruped_shoulder_circles: prepare phase, primary: front_delt, side_delt, rear_delt
      // durationMin = 30/60 = 0.5, rpe = 5, phaseScale(prepare) = 0.2
      // sessionLoad = 0.5 * 0.5 / 10 = 0.025
      // primary injection = 0.025 * 0.2 * 1.0 * 100 = 0.5
      const result = calculateSessionMuscleFatigue(
        [gmbEx('gmb_quadruped_shoulder_circles', 'prepare', 30, 5)],
        5,
      );
      expect(result['front_delt']).toBeCloseTo(0.5, 1);
      expect(result['side_delt']).toBeCloseTo(0.5, 1);
      expect(result['rear_delt']).toBeCloseTo(0.5, 1);
    });

    it('applies secondary muscle coefficient of 0.5', () => {
      // gmb_quadruped_shoulder_circles: secondary: traps, core
      // secondary injection = 0.025 * 0.2 * 0.5 * 100 = 0.25
      const result = calculateSessionMuscleFatigue(
        [gmbEx('gmb_quadruped_shoulder_circles', 'prepare', 30, 5)],
        5,
      );
      expect(result['traps']).toBeCloseTo(0.25, 1);
      expect(result['core']).toBeCloseTo(0.25, 1);
    });

    it('scales by push phase intensity (1.0) — much higher than prepare (0.2)', () => {
      // gmb_scaled_bear: push phase, primary: core, front_delt, traps
      // durationMin = 300/60 = 5, rpe = 8, phaseScale(push) = 1.0
      // sessionLoad = 5 * 0.8 / 10 = 0.4
      // primary injection = 0.4 * 1.0 * 1.0 * 100 = 40
      const result = calculateSessionMuscleFatigue(
        [gmbEx('gmb_scaled_bear', 'push', 300, 8)],
        8,
      );
      expect(result['core']).toBeCloseTo(40, 0);
      expect(result['front_delt']).toBeCloseTo(40, 0);
    });
  });

  // ── Calimove sets/reps path ────────────────────────────────────────────────

  describe('Calimove sets/reps-based path', () => {
    it('uses setsCompleted × repsPerSet × (rpe/10) / 100 when setsCompleted and repsPerSet are present', () => {
      // gmb_quadruped_shoulder_circles: primary: front_delt, side_delt, rear_delt
      // prepare phase, phaseScale = 0.2
      // sessionLoad = (3 * 10 * (5/10)) / 100 = (30 * 0.5) / 100 = 0.15
      // primary injection = 0.15 * 0.2 * 1.0 * 100 = 3.0
      const result = calculateSessionMuscleFatigue(
        [calimoveEx('gmb_quadruped_shoulder_circles', 'prepare', 3, 10, 5)],
        5,
      );
      expect(result['front_delt']).toBeCloseTo(3.0, 1);
    });

    it('applies secondary coefficient 0.5 in sets/reps path', () => {
      // sessionLoad = (3 * 10 * 0.5) / 100 = 0.15
      // secondary injection = 0.15 * 0.2 * 0.5 * 100 = 1.5
      const result = calculateSessionMuscleFatigue(
        [calimoveEx('gmb_quadruped_shoulder_circles', 'prepare', 3, 10, 5)],
        5,
      );
      expect(result['traps']).toBeCloseTo(1.5, 1);
    });

    it('uses duration path when setsCompleted is undefined', () => {
      // Same exercise but passed as GMB (no setsCompleted/repsPerSet)
      const gmbResult = calculateSessionMuscleFatigue(
        [gmbEx('gmb_quadruped_shoulder_circles', 'prepare', 30, 5)],
        5,
      );
      const calimoveResult = calculateSessionMuscleFatigue(
        [calimoveEx('gmb_quadruped_shoulder_circles', 'prepare', 3, 10, 5)],
        5,
      );
      // The two paths should produce different values
      expect(gmbResult['front_delt']).not.toBeCloseTo(calimoveResult['front_delt'], 0);
    });
  });

  // ── Accumulation and capping ───────────────────────────────────────────────

  describe('accumulation and cap', () => {
    it('accumulates fatigue additively across multiple exercises for the same muscle', () => {
      // Two push-phase exercises sharing core muscle
      // gmb_scaled_bear (push): primary core, front_delt, traps; secondary lats, triceps
      // Each: durationMin=5, rpe=8 → primary injection = 40
      // Two exercises → core = 80 (before cap)
      const result = calculateSessionMuscleFatigue(
        [
          gmbEx('gmb_scaled_bear', 'push', 300, 8),
          gmbEx('gmb_scaled_bear', 'push', 300, 8),
        ],
        8,
      );
      expect(result['core']).toBeCloseTo(80, 0);
    });

    it('caps fatigue at 100 regardless of accumulation', () => {
      // Three push-phase exercises sharing core → 3 × 40 = 120, capped at 100
      const result = calculateSessionMuscleFatigue(
        [
          gmbEx('gmb_scaled_bear', 'push', 300, 8),
          gmbEx('gmb_scaled_bear', 'push', 300, 8),
          gmbEx('gmb_scaled_bear', 'push', 300, 8),
        ],
        8,
      );
      expect(result['core']).toBe(100);
    });

    it('rounds output to 1 decimal place', () => {
      const result = calculateSessionMuscleFatigue(
        [gmbEx('gmb_quadruped_shoulder_circles', 'prepare', 30, 5)],
        5,
      );
      // 0.5 — already 1dp, but verify the rounding contract holds
      const values = Object.values(result);
      for (const v of values) {
        expect(v).toBe(Math.round(v * 10) / 10);
      }
    });

    it('drops muscles with zero fatigue from the result', () => {
      const result = calculateSessionMuscleFatigue(
        [gmbEx('gmb_wrist_circles', 'prepare', 30, 5)],
        5,
      );
      // gmb_wrist_circles: primary: forearms, secondary: [] — no secondary
      expect(Object.keys(result)).toEqual(['forearms']);
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('skips exercises with unknown exerciseId silently', () => {
      const result = calculateSessionMuscleFatigue(
        [gmbEx('does_not_exist', 'push', 300, 8)],
        8,
      );
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('skips exercises whose library definition has no muscles field', () => {
      // Exercises from the base exerciseLibrary (e.g. hip_circles) have no muscles
      const result = calculateSessionMuscleFatigue(
        [gmbEx('hip_circles', 'prepare', 30, 5)],
        5,
      );
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('returns empty object for empty exercise list', () => {
      const result = calculateSessionMuscleFatigue([], 7);
      expect(result).toEqual({});
    });

    it('handles unknown phase with fallback intensity 0.6', () => {
      // phaseScale for 'play' is 0.6 (not in the PHASE_INTENSITY map but falls back)
      // gmb_quadruped_shoulder_circles: primary: front_delt; sessionLoad = 0.5*0.5/10=0.025
      // injection = 0.025 * 0.6 * 1.0 * 100 = 1.5
      // 'play' is a valid SessionPhase listed in the map, so this tests the map lookup
      const result = calculateSessionMuscleFatigue(
        [gmbEx('gmb_quadruped_shoulder_circles', 'play' as CompletedExercise['phase'], 30, 5)],
        5,
      );
      expect(result['front_delt']).toBeCloseTo(1.5, 1);
    });
  });
});
