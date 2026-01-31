import type { SessionPhase } from '../../api/types';

export type ExerciseSource = 'gmb' | 'calimove' | 'barbell' | 'bodyweight';

export interface ExerciseDef {
  id: string;
  name: string;
  defaultPhase: SessionPhase;
  icon: string;
  defaultDurationSec: number; // 0 = rep-based
  defaultReps: number; // 0 = timed
  defaultWeightKg?: number; // Optional default weight for rep-based exercises
  tags: string[];
  source: ExerciseSource;
}

// ── PREPARE: Mobility & Activation ──
const PREPARE_EXERCISES: ExerciseDef[] = [
  { id: 'hip_circles', name: 'Hip Circles', defaultPhase: 'prepare', icon: '⭕', defaultDurationSec: 30, defaultReps: 0, tags: ['hip', 'warm-up'], source: 'bodyweight' },
  { id: 'wrist_prep', name: 'Wrist Prep', defaultPhase: 'prepare', icon: '🤲', defaultDurationSec: 20, defaultReps: 0, tags: ['upper', 'warm-up'], source: 'gmb' },
  { id: 'shoulder_circles', name: 'Shoulder Circles', defaultPhase: 'prepare', icon: '🔄', defaultDurationSec: 30, defaultReps: 0, tags: ['shoulder', 'warm-up'], source: 'bodyweight' },
  { id: 'ankle_rolls', name: 'Ankle Rolls', defaultPhase: 'prepare', icon: '🦶', defaultDurationSec: 20, defaultReps: 0, tags: ['ankle', 'warm-up'], source: 'bodyweight' },
  { id: 'cat_cow', name: 'Cat-Cow', defaultPhase: 'prepare', icon: '🐱', defaultDurationSec: 0, defaultReps: 10, tags: ['spine', 'core'], source: 'bodyweight' },
  { id: 'glute_bridges', name: 'Glute Bridges', defaultPhase: 'prepare', icon: '🌉', defaultDurationSec: 0, defaultReps: 12, tags: ['glute', 'posterior'], source: 'bodyweight' },
  { id: 'inchworm_walk', name: 'Inchworm Walk', defaultPhase: 'prepare', icon: '🐛', defaultDurationSec: 0, defaultReps: 6, tags: ['full-body', 'warm-up'], source: 'bodyweight' },
  { id: 'barbell_warmup', name: 'Empty Bar Warmup', defaultPhase: 'prepare', icon: '=', defaultDurationSec: 0, defaultReps: 10, defaultWeightKg: 20, tags: ['barbell', 'warm-up'], source: 'barbell' },
  { id: 'band_pull_aparts', name: 'Band Pull-Aparts', defaultPhase: 'prepare', icon: '<>', defaultDurationSec: 0, defaultReps: 15, tags: ['upper', 'warm-up'], source: 'bodyweight' },
];

// ── PRACTICE: Skill & Transitions ──
const PRACTICE_EXERCISES: ExerciseDef[] = [
  { id: 'bear_to_monkey', name: 'Bear to Monkey', defaultPhase: 'practice', icon: '🐻', defaultDurationSec: 0, defaultReps: 8, tags: ['gmb', 'transition'], source: 'gmb' },
  { id: 'squat_to_crow', name: 'Squat to Crow', defaultPhase: 'practice', icon: '🦅', defaultDurationSec: 0, defaultReps: 6, tags: ['gmb', 'balance'], source: 'gmb' },
  { id: 'locomotion_flow', name: 'Locomotion Flow', defaultPhase: 'practice', icon: '🚶', defaultDurationSec: 40, defaultReps: 0, tags: ['gmb', 'flow'], source: 'gmb' },
  { id: 'wall_handstand', name: 'Wall Handstand', defaultPhase: 'practice', icon: '🤸', defaultDurationSec: 20, defaultReps: 0, tags: ['balance', 'upper'], source: 'calimove' },
  { id: 'l_sit_hold', name: 'L-Sit Hold', defaultPhase: 'practice', icon: 'L', defaultDurationSec: 15, defaultReps: 0, tags: ['core', 'triceps'], source: 'calimove' },
  { id: 'plank_to_push', name: 'Plank to Push-up', defaultPhase: 'practice', icon: '📐', defaultDurationSec: 0, defaultReps: 10, tags: ['core', 'push'], source: 'bodyweight' },
  { id: 'pike_stand', name: 'Pike Stand', defaultPhase: 'practice', icon: '^', defaultDurationSec: 30, defaultReps: 0, tags: ['balance', 'core'], source: 'calimove' },
  { id: 'active_hang', name: 'Active Hang', defaultPhase: 'practice', icon: 'Y', defaultDurationSec: 30, defaultReps: 0, tags: ['pull', 'shoulder'], source: 'calimove' },
  { id: 'wall_sit', name: 'Wall Sit', defaultPhase: 'practice', icon: '#', defaultDurationSec: 45, defaultReps: 0, tags: ['legs', 'isometric'], source: 'calimove' },
];

// ── PUSH: Strength & Conditioning ──
const PUSH_EXERCISES: ExerciseDef[] = [
  { id: 'frogger', name: 'Frogger', defaultPhase: 'push', icon: '🐸', defaultDurationSec: 0, defaultReps: 8, tags: ['lower', 'hip'], source: 'gmb' },
  { id: 'three_point_bridge', name: '3-Point Bridge', defaultPhase: 'push', icon: '🏗️', defaultDurationSec: 0, defaultReps: 10, tags: ['glute', 'posterior'], source: 'bodyweight' },
  { id: 'hollow_hold', name: 'Hollow Body Hold', defaultPhase: 'push', icon: '🥁', defaultDurationSec: 20, defaultReps: 0, tags: ['core', 'anterior'], source: 'calimove' },
  { id: 'archer_push', name: 'Archer Push-Up', defaultPhase: 'push', icon: '🏹', defaultDurationSec: 0, defaultReps: 8, tags: ['chest', 'delt'], source: 'calimove' },
  { id: 'squat_jump', name: 'Squat Jump', defaultPhase: 'push', icon: '⬆️', defaultDurationSec: 0, defaultReps: 10, tags: ['lower', 'explosive'], source: 'bodyweight' },
  { id: 'single_leg_rdl', name: 'Single-Leg RDL', defaultPhase: 'push', icon: '🦵', defaultDurationSec: 0, defaultReps: 8, defaultWeightKg: 20, tags: ['posterior', 'balance'], source: 'barbell' },
  { id: 'plank_hold', name: 'Plank Hold', defaultPhase: 'push', icon: '🧊', defaultDurationSec: 30, defaultReps: 0, tags: ['core'], source: 'bodyweight' },
  // Barbell lifts
  { id: 'back_squat', name: 'Barbell Back Squat', defaultPhase: 'push', icon: 'S', defaultDurationSec: 0, defaultReps: 5, defaultWeightKg: 60, tags: ['legs', 'compound'], source: 'barbell' },
  { id: 'bench_press', name: 'Bench Press', defaultPhase: 'push', icon: 'B', defaultDurationSec: 0, defaultReps: 5, defaultWeightKg: 40, tags: ['chest', 'compound'], source: 'barbell' },
  { id: 'barbell_row', name: 'Barbell Row', defaultPhase: 'push', icon: 'R', defaultDurationSec: 0, defaultReps: 5, defaultWeightKg: 40, tags: ['back', 'compound'], source: 'barbell' },
  { id: 'overhead_press', name: 'Overhead Press', defaultPhase: 'push', icon: 'O', defaultDurationSec: 0, defaultReps: 5, defaultWeightKg: 30, tags: ['shoulder', 'compound'], source: 'barbell' },
  { id: 'deadlift', name: 'Deadlift', defaultPhase: 'push', icon: 'D', defaultDurationSec: 0, defaultReps: 5, defaultWeightKg: 60, tags: ['posterior', 'compound'], source: 'barbell' },
  // HIIT exercises
  { id: 'burpees', name: 'Burpees', defaultPhase: 'push', icon: '!', defaultDurationSec: 0, defaultReps: 10, tags: ['full-body', 'explosive'], source: 'bodyweight' },
  { id: 'lunges', name: 'Lunges', defaultPhase: 'push', icon: '/', defaultDurationSec: 0, defaultReps: 20, tags: ['legs', 'unilateral'], source: 'bodyweight' },
  { id: 'mountain_climbers', name: 'Mountain Climbers', defaultPhase: 'push', icon: 'M', defaultDurationSec: 30, defaultReps: 0, tags: ['core', 'cardio'], source: 'bodyweight' },
  { id: 'high_knees', name: 'High Knees', defaultPhase: 'push', icon: 'K', defaultDurationSec: 30, defaultReps: 0, tags: ['cardio', 'explosive'], source: 'bodyweight' },
  { id: 'tuck_jumps', name: 'Tuck Jumps', defaultPhase: 'push', icon: 'T', defaultDurationSec: 0, defaultReps: 10, tags: ['explosive', 'legs'], source: 'bodyweight' },
];

export const EXERCISE_LIBRARY: ExerciseDef[] = [
  ...PREPARE_EXERCISES,
  ...PRACTICE_EXERCISES,
  ...PUSH_EXERCISES,
];

export const EXERCISES_BY_PHASE: Record<SessionPhase, ExerciseDef[]> = {
  prepare: PREPARE_EXERCISES,
  practice: PRACTICE_EXERCISES,
  push: PUSH_EXERCISES,
};

export function getExerciseById(id: string): ExerciseDef | undefined {
  return EXERCISE_LIBRARY.find((ex) => ex.id === id);
}

export const EXERCISES_BY_SOURCE: Record<ExerciseSource, ExerciseDef[]> = {
  gmb: EXERCISE_LIBRARY.filter((ex) => ex.source === 'gmb'),
  calimove: EXERCISE_LIBRARY.filter((ex) => ex.source === 'calimove'),
  barbell: EXERCISE_LIBRARY.filter((ex) => ex.source === 'barbell'),
  bodyweight: EXERCISE_LIBRARY.filter((ex) => ex.source === 'bodyweight'),
};

export const SOURCE_LABELS: Record<ExerciseSource, string> = {
  gmb: 'GMB',
  calimove: 'CaliMove',
  barbell: 'Barbell',
  bodyweight: 'Bodyweight',
};
