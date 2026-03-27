import type { SessionPhase } from '../api/types';
import type { CompletedExercise } from '../components/training-programs/SessionCompleteScreen';
import { getExerciseById } from '../components/training-programs/exerciseLibrary';

/**
 * Phase intensity multipliers.
 * Scales the effective load contribution of exercises based on their session phase.
 */
const PHASE_INTENSITY: Record<SessionPhase, number> = {
  prepare: 0.2,  // Very low — warmup/mobility
  practice: 0.6, // Moderate — skill work
  play: 0.6,     // Same as practice
  push: 1.0,     // High — strength/conditioning
  ponder: 0.3,   // Low — cool-down/stretching
};

const PRIMARY_COEFF = 1.0;
const SECONDARY_COEFF = 0.5;

/**
 * Computes per-muscle fatigue percentages from a completed GMB session.
 *
 * Uses the same base formula as the backend archetype system:
 *   sessionLoad = durationMin × (RPE / 10) / 10
 *   injection = sessionLoad × phaseMultiplier × muscleCoeff × 100
 *
 * Fatigue is additive across exercises and capped at 100.
 * Exercises without muscle data (non-GMB) are skipped silently.
 */
export function calculateSessionMuscleFatigue(
  exercises: CompletedExercise[],
  overallRpe: number,
): Record<string, number> {
  const fatigue: Record<string, number> = {};

  for (const ex of exercises) {
    const def = getExerciseById(ex.exerciseId);
    if (!def?.muscles) continue;

    // Sets/reps formula for calimove; duration formula for GMB
    let sessionLoad: number;
    if (ex.setsCompleted !== undefined && ex.repsPerSet !== undefined) {
      sessionLoad = (ex.setsCompleted * ex.repsPerSet * (overallRpe / 10)) / 100;
    } else {
      const durationMin = ex.actualDurationSec / 60;
      sessionLoad = durationMin * (overallRpe / 10) / 10;
    }
    const phaseScale = PHASE_INTENSITY[ex.phase] ?? 0.6;

    for (const muscle of def.muscles.primary) {
      const injection = sessionLoad * phaseScale * PRIMARY_COEFF * 100;
      fatigue[muscle] = Math.min(100, (fatigue[muscle] ?? 0) + injection);
    }
    for (const muscle of def.muscles.secondary) {
      const injection = sessionLoad * phaseScale * SECONDARY_COEFF * 100;
      fatigue[muscle] = Math.min(100, (fatigue[muscle] ?? 0) + injection);
    }
  }

  // Round to 1 decimal place, drop zeros
  const result: Record<string, number> = {};
  for (const [muscle, value] of Object.entries(fatigue)) {
    if (value > 0) result[muscle] = Math.round(value * 10) / 10;
  }
  return result;
}
