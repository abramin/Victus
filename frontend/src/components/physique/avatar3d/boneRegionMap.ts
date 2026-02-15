import type { MuscleGroup } from '../../../api/types';

/** Stable integer index for each MuscleGroup, used as shader uniform array index */
export const MUSCLE_REGION_INDEX: Record<MuscleGroup, number> = {
  chest: 0,
  front_delt: 1,
  triceps: 2,
  side_delt: 3,
  lats: 4,
  traps: 5,
  biceps: 6,
  rear_delt: 7,
  forearms: 8,
  quads: 9,
  glutes: 10,
  hamstrings: 11,
  calves: 12,
  lower_back: 13,
  core: 14,
};

export const MUSCLE_GROUP_COUNT = 15;

/** Reverse lookup: region index -> MuscleGroup */
export const INDEX_TO_MUSCLE: MuscleGroup[] = Object.entries(MUSCLE_REGION_INDEX)
  .sort(([, a], [, b]) => a - b)
  .map(([k]) => k as MuscleGroup);

/** Position test for disambiguating bones that cover multiple muscle groups */
export type PositionTest = 'front' | 'back' | 'lateral';

export interface BoneMapping {
  muscle: MuscleGroup;
  positionTest?: PositionTest;
}

/**
 * Maps Mixamo skeleton bone names to muscle group(s).
 *
 * When multiple mappings exist for a bone, vertex rest-pose position
 * is used to disambiguate (z > 0 = front, z <= 0 = back, |x| > |z| = lateral).
 *
 * Bones not listed here (Head, Jaw, Eye, Hand, Foot, Toes) get region -1 (no highlight).
 */
export const BONE_TO_MUSCLES: Record<string, BoneMapping[]> = {
  Spine2: [
    { muscle: 'chest', positionTest: 'front' },
    { muscle: 'traps', positionTest: 'back' },
  ],
  Spine1: [
    { muscle: 'core', positionTest: 'front' },
    { muscle: 'lower_back', positionTest: 'back' },
    { muscle: 'lats', positionTest: 'lateral' },
  ],
  Spine: [
    { muscle: 'core', positionTest: 'front' },
    { muscle: 'lower_back', positionTest: 'back' },
  ],
  Neck: [{ muscle: 'traps' }],
  LeftShoulder: [
    { muscle: 'front_delt', positionTest: 'front' },
    { muscle: 'side_delt', positionTest: 'lateral' },
    { muscle: 'rear_delt', positionTest: 'back' },
  ],
  RightShoulder: [
    { muscle: 'front_delt', positionTest: 'front' },
    { muscle: 'side_delt', positionTest: 'lateral' },
    { muscle: 'rear_delt', positionTest: 'back' },
  ],
  LeftArm: [
    { muscle: 'biceps', positionTest: 'front' },
    { muscle: 'triceps', positionTest: 'back' },
  ],
  RightArm: [
    { muscle: 'biceps', positionTest: 'front' },
    { muscle: 'triceps', positionTest: 'back' },
  ],
  LeftForeArm: [{ muscle: 'forearms' }],
  RightForeArm: [{ muscle: 'forearms' }],
  LeftUpLeg: [
    { muscle: 'quads', positionTest: 'front' },
    { muscle: 'hamstrings', positionTest: 'back' },
  ],
  RightUpLeg: [
    { muscle: 'quads', positionTest: 'front' },
    { muscle: 'hamstrings', positionTest: 'back' },
  ],
  Hips: [
    { muscle: 'glutes', positionTest: 'back' },
    { muscle: 'core', positionTest: 'front' },
  ],
  LeftLeg: [{ muscle: 'calves' }],
  RightLeg: [{ muscle: 'calves' }],
};

/**
 * Strip common Mixamo prefixes from bone names for lookup.
 * RPM models may use "mixamorig:", "mixamorig1:", or no prefix.
 */
export function normalizeBoneName(name: string): string {
  return name.replace(/^mixamorig\d?:/, '');
}
