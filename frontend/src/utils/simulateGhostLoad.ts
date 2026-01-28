import type {
  ProgramDayInput,
  ArchetypeConfig,
  MuscleFatigue,
  MuscleGroup,
  Archetype,
  TrainingType,
  FatigueStatus,
} from '../api/types';
import { getMuscleColor } from '../components/body-map/colorSystem';

// =============================================================================
// CONSTANTS & MAPPINGS
// =============================================================================

/** All 15 tracked muscle groups (mirrors backend domain.ValidMuscleGroups). */
const ALL_MUSCLE_GROUPS: MuscleGroup[] = [
  'chest',
  'front_delt',
  'triceps',
  'side_delt',
  'lats',
  'traps',
  'biceps',
  'rear_delt',
  'forearms',
  'quads',
  'glutes',
  'hamstrings',
  'calves',
  'lower_back',
  'core',
];

/** Human-readable display names (mirrors backend MuscleGroupDisplayNames). */
const MUSCLE_DISPLAY_NAMES: Record<MuscleGroup, string> = {
  chest: 'Chest',
  front_delt: 'Front Delts',
  triceps: 'Triceps',
  side_delt: 'Side Delts',
  lats: 'Lats',
  traps: 'Traps',
  biceps: 'Biceps',
  rear_delt: 'Rear Delts',
  forearms: 'Forearms',
  quads: 'Quads',
  glutes: 'Glutes',
  hamstrings: 'Hamstrings',
  calves: 'Calves',
  lower_back: 'Lower Back',
  core: 'Core/Abs',
};

/** Maps each TrainingType to the archetype that best represents its muscle loading pattern. */
const TRAINING_TYPE_TO_ARCHETYPE: Record<string, Archetype> = {
  strength: 'upper',
  calisthenics: 'full_body',
  hiit: 'full_body',
  run: 'cardio_impact',
  row: 'pull',
  cycle: 'cardio_low',
  mobility: 'cardio_low',
  gmb: 'full_body',
  walking: 'cardio_low',
  qigong: 'cardio_low',
  rest: 'cardio_low',
  mixed: 'full_body',
};

/** Fatigue decay rate per hour (mirrors backend FatigueDecayPercentPerHour = 2.0). */
const FATIGUE_DECAY_PER_HOUR = 2.0;

/** Assumed hours between consecutive training days in a weekly schedule. */
const HOURS_BETWEEN_DAYS = 24;

/** Consecutive days at or above this effective RPE that triggers Neural Overload. */
const NEURAL_OVERLOAD_RPE_THRESHOLD = 8;

/** Number of consecutive high-RPE days required to trigger Neural Overload. */
const NEURAL_OVERLOAD_STREAK_REQUIRED = 3;

// =============================================================================
// HELPERS (mirror backend pure functions)
// =============================================================================

/** LoadScore (1-5) to RPE (2-10) linear mapping. */
function loadScoreToRPE(loadScore: number): number {
  return loadScore * 2;
}

/** Mirrors CalculateFatigueSessionLoad: Duration(min) × (RPE / 10) / 10 */
function calculateSessionLoad(durationMin: number, effectiveRPE: number): number {
  return durationMin * (effectiveRPE / 10) / 10;
}

/** Mirrors ApplyFatigueDecay: max(0, current - hoursElapsed × decayRate) */
function applyDecay(currentPercent: number, hoursElapsed: number): number {
  const decayed = currentPercent - hoursElapsed * FATIGUE_DECAY_PER_HOUR;
  return decayed < 0 ? 0 : decayed;
}

/** Mirrors GetFatigueStatus thresholds. */
function getFatigueStatus(percent: number): FatigueStatus {
  if (percent <= 25) return 'fresh';
  if (percent <= 50) return 'stimulated';
  if (percent <= 75) return 'fatigued';
  return 'overreached';
}

/** Detects 3+ consecutive days with effectiveRPE ≥ threshold. */
function detectNeuralOverload(dailyRPEs: number[]): boolean {
  let streak = 0;
  for (const rpe of dailyRPEs) {
    if (rpe >= NEURAL_OVERLOAD_RPE_THRESHOLD) {
      streak++;
      if (streak >= NEURAL_OVERLOAD_STREAK_REQUIRED) return true;
    } else {
      streak = 0;
    }
  }
  return false;
}

// =============================================================================
// SIMULATION RESULT TYPE
// =============================================================================

export interface GhostLoadResult {
  /** Predicted muscle fatigue states after one simulated week. Ready for BodyMapVisualizer. */
  muscleFatigues: MuscleFatigue[];
  /** True when 3+ consecutive days have effective RPE ≥ 8. */
  neuralOverload: boolean;
  /** Effective RPE per day (after intensityScale), in template order. */
  dailyEffectiveRPEs: number[];
}

// =============================================================================
// CORE SIMULATION
// =============================================================================

/**
 * Simulates one week of fatigue accumulation from a set of day templates.
 *
 * Pure function: no side effects, no I/O. Mirrors the backend fatigue engine
 * (domain/fatigue.go) exactly so predictions match what would happen if these
 * sessions were actually logged.
 *
 * @param dayTemplates - The day templates to simulate (in weekly order).
 * @param intensityScale - Week-level intensity multiplier (1.0 = baseline).
 * @param archetypes - Archetype configs fetched from GET /api/archetypes.
 */
export function simulateGhostLoad(
  dayTemplates: ProgramDayInput[],
  intensityScale: number,
  archetypes: ArchetypeConfig[]
): GhostLoadResult {
  // Build archetype lookup
  const archetypeMap = new Map<Archetype, Record<MuscleGroup, number>>();
  for (const config of archetypes) {
    archetypeMap.set(config.name, config.coefficients);
  }

  // Initialize all muscle states at 0%
  const muscleState: Record<MuscleGroup, number> = {} as Record<MuscleGroup, number>;
  for (const muscle of ALL_MUSCLE_GROUPS) {
    muscleState[muscle] = 0;
  }

  const dailyEffectiveRPEs: number[] = [];

  // Simulate each training day sequentially
  for (let i = 0; i < dayTemplates.length; i++) {
    const template = dayTemplates[i];

    // Apply decay since previous day (skip first day — muscles start fresh)
    if (i > 0) {
      for (const muscle of ALL_MUSCLE_GROUPS) {
        muscleState[muscle] = applyDecay(muscleState[muscle], HOURS_BETWEEN_DAYS);
      }
    }

    // Compute effective RPE with intensity scale, clamped to [1, 10]
    const baseRPE = loadScoreToRPE(template.loadScore);
    const effectiveRPE = Math.min(10, Math.max(1, baseRPE * intensityScale));
    dailyEffectiveRPEs.push(effectiveRPE);

    // Resolve archetype for this training type
    const archetypeName = TRAINING_TYPE_TO_ARCHETYPE[template.trainingType] ?? 'cardio_low';
    const coefficients = archetypeMap.get(archetypeName) ?? {};

    // Calculate session load (mirrors CalculateFatigueSessionLoad)
    const totalLoad = calculateSessionLoad(template.durationMin, effectiveRPE);

    // Inject fatigue per muscle (mirrors CalculateFatigueInjection + AddFatigue)
    for (const [muscle, coefficient] of Object.entries(coefficients)) {
      const m = muscle as MuscleGroup;
      const injection = totalLoad * coefficient * 100;
      muscleState[m] = Math.min(100, muscleState[m] + injection);
    }
  }

  // Detect Neural Overload warning
  const neuralOverload = detectNeuralOverload(dailyEffectiveRPEs);

  // Convert muscle state to MuscleFatigue[] for BodyMapVisualizer
  const muscleFatigues: MuscleFatigue[] = ALL_MUSCLE_GROUPS.map((muscle, idx) => {
    const percent = Math.round(muscleState[muscle] * 10) / 10;
    return {
      muscleGroupId: idx + 1,
      muscle,
      displayName: MUSCLE_DISPLAY_NAMES[muscle],
      fatiguePercent: percent,
      status: getFatigueStatus(percent),
      color: getMuscleColor(percent),
    };
  });

  return { muscleFatigues, neuralOverload, dailyEffectiveRPEs };
}
