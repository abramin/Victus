import { describe, it, expect } from 'vitest';
import { simulateGhostLoad } from './simulateGhostLoad';
import type { ProgramDayInput, ArchetypeConfig, MuscleGroup } from '../api/types';

// Invariant: This module mirrors backend/internal/domain/fatigue.go formulas.
// Client-side Ghost Load preview must match what the fatigue engine would produce
// if these sessions were actually logged, so users can trust the preview.

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/** Minimal archetype configs covering the archetypes used in tests. */
const TEST_ARCHETYPES: ArchetypeConfig[] = [
  {
    id: 1,
    name: 'upper',
    displayName: 'Upper Body',
    coefficients: {
      chest: 0.7,
      front_delt: 0.7,
      triceps: 0.5,
      side_delt: 0.3,
      lats: 0.4,
      traps: 0.3,
      biceps: 0.3,
      rear_delt: 0.2,
      forearms: 0.2,
      quads: 0.0,
      glutes: 0.0,
      hamstrings: 0.0,
      calves: 0.0,
      lower_back: 0.1,
      core: 0.3,
    },
  },
  {
    id: 2,
    name: 'full_body',
    displayName: 'Full Body',
    coefficients: {
      chest: 0.5,
      front_delt: 0.5,
      triceps: 0.4,
      side_delt: 0.3,
      lats: 0.5,
      traps: 0.4,
      biceps: 0.4,
      rear_delt: 0.3,
      forearms: 0.3,
      quads: 0.5,
      glutes: 0.5,
      hamstrings: 0.4,
      calves: 0.3,
      lower_back: 0.4,
      core: 0.5,
    },
  },
  {
    id: 3,
    name: 'cardio_low',
    displayName: 'Cardio (Low Impact)',
    coefficients: {
      chest: 0.0,
      front_delt: 0.0,
      triceps: 0.0,
      side_delt: 0.0,
      lats: 0.0,
      traps: 0.0,
      biceps: 0.0,
      rear_delt: 0.0,
      forearms: 0.0,
      quads: 0.1,
      glutes: 0.1,
      hamstrings: 0.05,
      calves: 0.1,
      lower_back: 0.05,
      core: 0.1,
    },
  },
  {
    id: 4,
    name: 'pull',
    displayName: 'Pull',
    coefficients: {
      chest: 0.1,
      front_delt: 0.2,
      triceps: 0.1,
      side_delt: 0.3,
      lats: 0.8,
      traps: 0.6,
      biceps: 0.7,
      rear_delt: 0.6,
      forearms: 0.5,
      quads: 0.0,
      glutes: 0.0,
      hamstrings: 0.0,
      calves: 0.0,
      lower_back: 0.3,
      core: 0.2,
    },
  },
  {
    id: 5,
    name: 'cardio_impact',
    displayName: 'Cardio (Impact)',
    coefficients: {
      chest: 0.1,
      front_delt: 0.1,
      triceps: 0.0,
      side_delt: 0.0,
      lats: 0.1,
      traps: 0.1,
      biceps: 0.0,
      rear_delt: 0.0,
      forearms: 0.0,
      quads: 0.6,
      glutes: 0.5,
      hamstrings: 0.5,
      calves: 0.4,
      lower_back: 0.3,
      core: 0.3,
    },
  },
];

function makeDay(
  trainingType: string,
  loadScore: number,
  durationMin: number = 60
): ProgramDayInput {
  return {
    dayNumber: 1,
    label: 'Test Day',
    trainingType: trainingType as any,
    durationMin,
    loadScore,
    nutritionDay: 'performance',
  };
}

function getMusclePercent(result: ReturnType<typeof simulateGhostLoad>, muscle: MuscleGroup): number {
  return result.muscleFatigues.find((m) => m.muscle === muscle)?.fatiguePercent ?? 0;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('simulateGhostLoad', () => {
  describe('output shape', () => {
    it('returns all 15 muscle groups', () => {
      const result = simulateGhostLoad([makeDay('strength', 3)], 1.0, TEST_ARCHETYPES);
      expect(result.muscleFatigues).toHaveLength(15);
    });

    it('each muscle has valid status and non-negative fatiguePercent', () => {
      const result = simulateGhostLoad([makeDay('strength', 3)], 1.0, TEST_ARCHETYPES);
      for (const m of result.muscleFatigues) {
        expect(m.fatiguePercent).toBeGreaterThanOrEqual(0);
        expect(m.fatiguePercent).toBeLessThanOrEqual(100);
        expect(['fresh', 'stimulated', 'fatigued', 'overreached']).toContain(m.status);
        expect(m.color).toMatch(/^#[0-9a-f]{6}$/i);
        expect(m.displayName).toBeTruthy();
      }
    });

    it('dailyEffectiveRPEs has one entry per day template', () => {
      const days = [makeDay('strength', 3), makeDay('run', 4), makeDay('walking', 1)];
      const result = simulateGhostLoad(days, 1.0, TEST_ARCHETYPES);
      expect(result.dailyEffectiveRPEs).toHaveLength(3);
    });
  });

  describe('empty inputs', () => {
    it('returns all-zero fatigue with no day templates', () => {
      const result = simulateGhostLoad([], 1.0, TEST_ARCHETYPES);
      expect(result.muscleFatigues).toHaveLength(15);
      expect(result.muscleFatigues.every((m) => m.fatiguePercent === 0)).toBe(true);
      expect(result.neuralOverload).toBe(false);
      expect(result.dailyEffectiveRPEs).toHaveLength(0);
    });

    it('returns all-zero fatigue with empty archetypes (no coefficients to inject)', () => {
      const result = simulateGhostLoad([makeDay('strength', 5)], 1.0, []);
      expect(result.muscleFatigues.every((m) => m.fatiguePercent === 0)).toBe(true);
    });
  });

  describe('loadScore to RPE mapping', () => {
    it('loadScore 1 → effective RPE 2 at baseline intensity', () => {
      const result = simulateGhostLoad([makeDay('strength', 1)], 1.0, TEST_ARCHETYPES);
      expect(result.dailyEffectiveRPEs[0]).toBe(2);
    });

    it('loadScore 5 → effective RPE 10 at baseline intensity', () => {
      const result = simulateGhostLoad([makeDay('strength', 5)], 1.0, TEST_ARCHETYPES);
      expect(result.dailyEffectiveRPEs[0]).toBe(10);
    });

    it('intensityScale 1.5 on loadScore 4 (base RPE 8) clamps to 10', () => {
      const result = simulateGhostLoad([makeDay('strength', 4)], 1.5, TEST_ARCHETYPES);
      expect(result.dailyEffectiveRPEs[0]).toBe(10);
    });

    it('intensityScale 0.5 halves the effective RPE', () => {
      const result = simulateGhostLoad([makeDay('strength', 4)], 0.5, TEST_ARCHETYPES);
      expect(result.dailyEffectiveRPEs[0]).toBe(4); // 8 * 0.5 = 4
    });
  });

  describe('single-day fatigue injection math', () => {
    it('strength day at loadScore 3, 60min, scale 1.0 produces expected chest injection', () => {
      // strength → upper archetype, chest coefficient = 0.7
      // effectiveRPE = 3 * 2 * 1.0 = 6
      // totalLoad = 60 * (6 / 10) / 10 = 3.6 (note: 60 * 0.6 / 10 = 3.6)
      // Wait: 60 * (6/10) / 10 = 60 * 0.6 / 10 = 36 / 10 = 3.6
      // injection = 3.6 * 0.7 * 100 = 252 → capped at 100
      // Hmm, that's too high. Let me recalculate.
      // Actually: totalLoad = durationMin * (effectiveRPE / 10) / 10
      //         = 60 * (6 / 10) / 10
      //         = 60 * 0.6 / 10
      //         = 36 / 10
      //         = 3.6
      // injection = totalLoad * coefficient * 100
      //           = 3.6 * 0.7 * 100
      //           = 252
      // That exceeds 100, so it caps at 100.
      // Let's use a shorter duration to get a testable value.
      const result = simulateGhostLoad([makeDay('strength', 3, 10)], 1.0, TEST_ARCHETYPES);
      // totalLoad = 10 * (6 / 10) / 10 = 0.6
      // chest injection = 0.6 * 0.7 * 100 = 42
      expect(getMusclePercent(result, 'chest')).toBeCloseTo(42, 1);
    });

    it('quads remain at 0 for upper archetype (coefficient = 0)', () => {
      const result = simulateGhostLoad([makeDay('strength', 3, 10)], 1.0, TEST_ARCHETYPES);
      expect(getMusclePercent(result, 'quads')).toBe(0);
    });

    it('run maps to cardio_impact archetype, loading quads', () => {
      const result = simulateGhostLoad([makeDay('run', 3, 10)], 1.0, TEST_ARCHETYPES);
      // cardio_impact quads coefficient = 0.6
      // totalLoad = 10 * (6/10) / 10 = 0.6
      // injection = 0.6 * 0.6 * 100 = 36
      expect(getMusclePercent(result, 'quads')).toBeCloseTo(36, 1);
    });

    it('row maps to pull archetype, loading lats', () => {
      const result = simulateGhostLoad([makeDay('row', 3, 10)], 1.0, TEST_ARCHETYPES);
      // pull lats coefficient = 0.8
      // totalLoad = 0.6
      // injection = 0.6 * 0.8 * 100 = 48
      expect(getMusclePercent(result, 'lats')).toBeCloseTo(48, 1);
    });
  });

  describe('fatigue caps at 100%', () => {
    it('extreme load does not exceed 100% on any muscle', () => {
      // 5 consecutive full_body days at max RPE, 120min each
      const days = Array.from({ length: 5 }, () => makeDay('calisthenics', 5, 120));
      const result = simulateGhostLoad(days, 1.0, TEST_ARCHETYPES);
      for (const m of result.muscleFatigues) {
        expect(m.fatiguePercent).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('fatigue decay between days', () => {
    it('24h decay wipes fatigue ≤ 48% completely (24h × 2%/h = 48% decay)', () => {
      // Day 1: strength loadScore 2, 10min → chest injection small enough to be < 48%
      // effectiveRPE = 4, totalLoad = 10 * (4/10) / 10 = 0.4
      // chest injection = 0.4 * 0.7 * 100 = 28%
      // After 24h decay: max(0, 28 - 48) = 0
      // Day 2: same → chest should equal just day 2's injection (28%)
      const days = [makeDay('strength', 2, 10), makeDay('strength', 2, 10)];
      const result = simulateGhostLoad(days, 1.0, TEST_ARCHETYPES);
      expect(getMusclePercent(result, 'chest')).toBeCloseTo(28, 1);
    });

    it('fatigue > 48% survives 24h decay partially', () => {
      // Day 1: strength loadScore 3, 30min
      // effectiveRPE = 6, totalLoad = 30 * 0.6 / 10 = 1.8
      // chest injection = 1.8 * 0.7 * 100 = 126 → capped at 100
      // After 24h: max(0, 100 - 48) = 52
      // Day 2: same injection attempt → min(100, 52 + 126) = 100
      const days = [makeDay('strength', 3, 30), makeDay('strength', 3, 30)];
      const result = simulateGhostLoad(days, 1.0, TEST_ARCHETYPES);
      expect(getMusclePercent(result, 'chest')).toBe(100);
    });
  });

  describe('TrainingType to Archetype mapping', () => {
    const typeToExpectedMuscle: [string, MuscleGroup][] = [
      ['strength', 'chest'],       // → upper
      ['calisthenics', 'core'],    // → full_body
      ['hiit', 'glutes'],          // → full_body
      ['run', 'quads'],            // → cardio_impact
      ['row', 'lats'],             // → pull
      ['gmb', 'hamstrings'],       // → full_body
    ];

    for (const [type, muscle] of typeToExpectedMuscle) {
      it(`${type} produces fatigue on ${muscle}`, () => {
        const result = simulateGhostLoad([makeDay(type, 3, 10)], 1.0, TEST_ARCHETYPES);
        expect(getMusclePercent(result, muscle)).toBeGreaterThan(0);
      });
    }

    it('unknown training type falls back to cardio_low (minimal impact)', () => {
      const result = simulateGhostLoad([makeDay('unknown_type', 5, 60)], 1.0, TEST_ARCHETYPES);
      // cardio_low has very low coefficients; chest should be 0
      expect(getMusclePercent(result, 'chest')).toBe(0);
    });
  });

  describe('Neural Overload detection', () => {
    it('3 consecutive days at loadScore 4 (RPE 8) triggers overload', () => {
      const days = [
        makeDay('strength', 4, 30),
        makeDay('strength', 4, 30),
        makeDay('strength', 4, 30),
      ];
      const result = simulateGhostLoad(days, 1.0, TEST_ARCHETYPES);
      expect(result.neuralOverload).toBe(true);
    });

    it('2 consecutive days at loadScore 4 does NOT trigger overload', () => {
      const days = [
        makeDay('strength', 4, 30),
        makeDay('strength', 4, 30),
      ];
      const result = simulateGhostLoad(days, 1.0, TEST_ARCHETYPES);
      expect(result.neuralOverload).toBe(false);
    });

    it('a low-load day breaks the streak', () => {
      const days = [
        makeDay('strength', 4, 30),
        makeDay('strength', 4, 30),
        makeDay('walking', 1, 30),  // RPE 2 — breaks streak
        makeDay('strength', 4, 30),
        makeDay('strength', 4, 30),
      ];
      const result = simulateGhostLoad(days, 1.0, TEST_ARCHETYPES);
      expect(result.neuralOverload).toBe(false);
    });

    it('intensityScale can push loadScore 3 into overload territory', () => {
      // loadScore 3 → base RPE 6; scale 1.4 → effectiveRPE 8.4 ≥ 8
      const days = [
        makeDay('strength', 3, 30),
        makeDay('strength', 3, 30),
        makeDay('strength', 3, 30),
      ];
      const result = simulateGhostLoad(days, 1.4, TEST_ARCHETYPES);
      expect(result.neuralOverload).toBe(true);
    });

    it('loadScore 5 at 3 consecutive days triggers overload (RPE 10)', () => {
      const days = [
        makeDay('hiit', 5, 45),
        makeDay('hiit', 5, 45),
        makeDay('hiit', 5, 45),
      ];
      const result = simulateGhostLoad(days, 1.0, TEST_ARCHETYPES);
      expect(result.neuralOverload).toBe(true);
    });

    it('does not trigger with only loadScore ≤ 3 days (RPE ≤ 6)', () => {
      const days = Array.from({ length: 5 }, () => makeDay('strength', 3, 60));
      const result = simulateGhostLoad(days, 1.0, TEST_ARCHETYPES);
      expect(result.neuralOverload).toBe(false);
    });
  });

  describe('fatigue status classification', () => {
    it('0% fatigue → fresh status', () => {
      const result = simulateGhostLoad([makeDay('walking', 1, 10)], 1.0, TEST_ARCHETYPES);
      const chest = result.muscleFatigues.find((m) => m.muscle === 'chest')!;
      expect(chest.status).toBe('fresh');
    });

    it('muscle at ~30% → stimulated status', () => {
      // strength loadScore 2, 10min: chest = 0.4 * 0.7 * 100 = 28% → fresh (≤25 boundary)
      // Use loadScore 3 at shorter duration to land in stimulated range
      // loadScore 3, 12min: totalLoad = 12 * 0.6 / 10 = 0.72
      // chest = 0.72 * 0.7 * 100 = 50.4 → stimulated (26-50)
      // Actually 50.4 is right at the boundary of stimulated. Let's use 11min:
      // totalLoad = 11 * 0.6 / 10 = 0.66
      // chest = 0.66 * 0.7 * 100 = 46.2 → stimulated
      const result = simulateGhostLoad([makeDay('strength', 3, 11)], 1.0, TEST_ARCHETYPES);
      const chest = result.muscleFatigues.find((m) => m.muscle === 'chest')!;
      expect(chest.status).toBe('stimulated');
      expect(chest.fatiguePercent).toBeGreaterThan(25);
      expect(chest.fatiguePercent).toBeLessThanOrEqual(50);
    });
  });
});
