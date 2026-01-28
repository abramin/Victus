import { describe, it, expect } from 'vitest';
import { EXERCISE_LIBRARY, EXERCISES_BY_PHASE, getExerciseById } from './exerciseLibrary';

describe('Exercise Library Catalog', () => {
  it('has exercises in every phase', () => {
    expect(EXERCISES_BY_PHASE.prepare.length).toBeGreaterThan(0);
    expect(EXERCISES_BY_PHASE.practice.length).toBeGreaterThan(0);
    expect(EXERCISES_BY_PHASE.push.length).toBeGreaterThan(0);
  });

  it('has no duplicate IDs', () => {
    const ids = EXERCISE_LIBRARY.map((ex) => ex.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('every exercise has a non-empty id and name', () => {
    for (const ex of EXERCISE_LIBRARY) {
      expect(ex.id.length).toBeGreaterThan(0);
      expect(ex.name.length).toBeGreaterThan(0);
    }
  });

  it('every exercise has an icon', () => {
    for (const ex of EXERCISE_LIBRARY) {
      expect(ex.icon.length).toBeGreaterThan(0);
    }
  });

  it('every exercise is either timed or rep-based (not both zero)', () => {
    for (const ex of EXERCISE_LIBRARY) {
      const hasDuration = ex.defaultDurationSec > 0;
      const hasReps = ex.defaultReps > 0;
      expect(hasDuration || hasReps).toBe(true);
    }
  });

  it('getExerciseById returns the correct exercise', () => {
    const ex = getExerciseById('hip_circles');
    expect(ex).toBeDefined();
    expect(ex!.name).toBe('Hip Circles');
    expect(ex!.defaultPhase).toBe('prepare');
  });

  it('getExerciseById returns undefined for unknown id', () => {
    expect(getExerciseById('nonexistent_exercise')).toBeUndefined();
  });

  it('EXERCISES_BY_PHASE aggregates match EXERCISE_LIBRARY total', () => {
    const phaseTotal =
      EXERCISES_BY_PHASE.prepare.length +
      EXERCISES_BY_PHASE.practice.length +
      EXERCISES_BY_PHASE.push.length;
    expect(phaseTotal).toBe(EXERCISE_LIBRARY.length);
  });
});
