import type { SessionPhase } from '../../api/types';

export type ExerciseSource = 'gmb' | 'calimove' | 'barbell' | 'bodyweight';

export interface ExerciseDef {
  id: string;
  name: string;
  defaultPhase: SessionPhase;
  icon: string;
  defaultDurationSec: number; // 0 = rep-based
  defaultReps: number; // 0 = timed
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
];

// ── PRACTICE: Skill & Transitions ──
const PRACTICE_EXERCISES: ExerciseDef[] = [
  { id: 'bear_to_monkey', name: 'Bear to Monkey', defaultPhase: 'practice', icon: '🐻', defaultDurationSec: 0, defaultReps: 8, tags: ['gmb', 'transition'], source: 'gmb' },
  { id: 'squat_to_crow', name: 'Squat to Crow', defaultPhase: 'practice', icon: '🦅', defaultDurationSec: 0, defaultReps: 6, tags: ['gmb', 'balance'], source: 'gmb' },
  { id: 'locomotion_flow', name: 'Locomotion Flow', defaultPhase: 'practice', icon: '🚶', defaultDurationSec: 40, defaultReps: 0, tags: ['gmb', 'flow'], source: 'gmb' },
  { id: 'wall_handstand', name: 'Wall Handstand', defaultPhase: 'practice', icon: '🤸', defaultDurationSec: 20, defaultReps: 0, tags: ['balance', 'upper'], source: 'calimove' },
  { id: 'l_sit_hold', name: 'L-Sit Hold', defaultPhase: 'practice', icon: 'L', defaultDurationSec: 15, defaultReps: 0, tags: ['core', 'triceps'], source: 'calimove' },
  { id: 'plank_to_push', name: 'Plank to Push-up', defaultPhase: 'practice', icon: '📐', defaultDurationSec: 0, defaultReps: 10, tags: ['core', 'push'], source: 'bodyweight' },
];

// ── PUSH: Strength & Conditioning ──
const PUSH_EXERCISES: ExerciseDef[] = [
  { id: 'frogger', name: 'Frogger', defaultPhase: 'push', icon: '🐸', defaultDurationSec: 0, defaultReps: 8, tags: ['lower', 'hip'], source: 'gmb' },
  { id: 'three_point_bridge', name: '3-Point Bridge', defaultPhase: 'push', icon: '🏗️', defaultDurationSec: 0, defaultReps: 10, tags: ['glute', 'posterior'], source: 'bodyweight' },
  { id: 'hollow_hold', name: 'Hollow Body Hold', defaultPhase: 'push', icon: '🥁', defaultDurationSec: 20, defaultReps: 0, tags: ['core', 'anterior'], source: 'calimove' },
  { id: 'archer_push', name: 'Archer Push-Up', defaultPhase: 'push', icon: '🏹', defaultDurationSec: 0, defaultReps: 8, tags: ['chest', 'delt'], source: 'calimove' },
  { id: 'squat_jump', name: 'Squat Jump', defaultPhase: 'push', icon: '⬆️', defaultDurationSec: 0, defaultReps: 10, tags: ['lower', 'explosive'], source: 'bodyweight' },
  { id: 'single_leg_rdl', name: 'Single-Leg RDL', defaultPhase: 'push', icon: '🦵', defaultDurationSec: 0, defaultReps: 8, tags: ['posterior', 'balance'], source: 'barbell' },
  { id: 'plank_hold', name: 'Plank Hold', defaultPhase: 'push', icon: '🧊', defaultDurationSec: 30, defaultReps: 0, tags: ['core'], source: 'bodyweight' },
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
