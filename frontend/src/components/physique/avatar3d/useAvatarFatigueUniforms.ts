import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import type { MuscleFatigue } from '../../../api/types';
import { getMuscleColor } from '../../body-map/colorSystem';
import { MUSCLE_REGION_INDEX, MUSCLE_GROUP_COUNT } from './boneRegionMap';

function hexToVec3(hex: string): THREE.Vector3 {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return new THREE.Vector3(r, g, b);
}

/**
 * Converts MuscleFatigue[] into stable shader uniform references.
 *
 * Reuses getMuscleColor() from colorSystem.ts for color computation.
 * Updates values in place (no new allocations) when muscles change,
 * so the CSM material does not need to be recreated.
 */
export function useAvatarFatigueUniforms(muscles: MuscleFatigue[]) {
  const uniformsRef = useRef({
    uFatigueValues: { value: new Float32Array(MUSCLE_GROUP_COUNT) },
    uFatigueColors: {
      value: Array.from({ length: MUSCLE_GROUP_COUNT }, () => new THREE.Vector3()),
    },
    uHighlightRegion: { value: -1 as number },
    uTime: { value: 0 },
  });

  // Update values in place when muscles data changes
  useEffect(() => {
    const vals = uniformsRef.current.uFatigueValues.value;
    const cols = uniformsRef.current.uFatigueColors.value;

    vals.fill(0);

    for (const m of muscles) {
      const idx = MUSCLE_REGION_INDEX[m.muscle];
      if (idx === undefined) continue;

      vals[idx] = m.fatiguePercent / 100;
      const color = getMuscleColor(m.fatiguePercent);
      cols[idx].copy(hexToVec3(color));
    }
  }, [muscles]);

  return uniformsRef.current;
}
