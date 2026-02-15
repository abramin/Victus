import { useMemo } from 'react';
import * as THREE from 'three';
import {
  BONE_TO_MUSCLES,
  MUSCLE_REGION_INDEX,
  normalizeBoneName,
  type BoneMapping,
} from './boneRegionMap';
import type { MuscleGroup } from '../../../api/types';

/**
 * Resolves which muscle group a vertex belongs to based on its dominant bone
 * and rest-pose position for disambiguation.
 */
function resolveRegion(
  mappings: BoneMapping[],
  vx: number,
  _vy: number,
  vz: number,
): MuscleGroup {
  if (mappings.length === 1) return mappings[0].muscle;

  // Disambiguate using rest-pose coordinates:
  //   Mixamo T-pose: +z = front, -z = back, +/-x = lateral
  for (const m of mappings) {
    if (!m.positionTest) return m.muscle;
    if (m.positionTest === 'front' && vz > 0) return m.muscle;
    if (m.positionTest === 'back' && vz <= 0) return m.muscle;
    if (m.positionTest === 'lateral' && Math.abs(vx) > Math.abs(vz)) return m.muscle;
  }

  return mappings[0].muscle;
}

/**
 * Builds a per-vertex Float32 attribute mapping each vertex to a muscle
 * region index (0-14) or -1 (unmapped).
 *
 * Runs once at load time. Reads skinIndex/skinWeight buffer attributes
 * to determine the dominant bone per vertex, then maps to a MuscleGroup
 * via boneRegionMap.
 *
 * The attribute is attached to the geometry as 'aRegionIndex' for the
 * custom shader to consume.
 */
export function useMuscleRegionAttribute(
  skinnedMesh: THREE.SkinnedMesh | null,
): THREE.Float32BufferAttribute | null {
  return useMemo(() => {
    if (!skinnedMesh) return null;

    const geometry = skinnedMesh.geometry;
    const skinIndexAttr = geometry.getAttribute('skinIndex') as THREE.BufferAttribute;
    const skinWeightAttr = geometry.getAttribute('skinWeight') as THREE.BufferAttribute;
    const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const skeleton = skinnedMesh.skeleton;

    if (!skinIndexAttr || !skinWeightAttr || !skeleton) return null;

    const vertexCount = positionAttr.count;
    const regionData = new Float32Array(vertexCount);

    // Build bone name lookup (normalize to strip Mixamo prefixes)
    const boneNames = skeleton.bones.map((b) => normalizeBoneName(b.name));

    for (let i = 0; i < vertexCount; i++) {
      // Find dominant bone (highest skin weight)
      let maxWeight = 0;
      let dominantBoneIdx = 0;

      for (let j = 0; j < 4; j++) {
        const w = skinWeightAttr.getComponent(i, j);
        if (w > maxWeight) {
          maxWeight = w;
          dominantBoneIdx = Math.round(skinIndexAttr.getComponent(i, j));
        }
      }

      const boneName = boneNames[dominantBoneIdx];
      const mappings = BONE_TO_MUSCLES[boneName];

      if (!mappings || mappings.length === 0) {
        regionData[i] = -1;
        continue;
      }

      const vx = positionAttr.getX(i);
      const vy = positionAttr.getY(i);
      const vz = positionAttr.getZ(i);

      const muscle = resolveRegion(mappings, vx, vy, vz);
      regionData[i] = MUSCLE_REGION_INDEX[muscle];
    }

    const attr = new THREE.Float32BufferAttribute(regionData, 1);
    geometry.setAttribute('aRegionIndex', attr);
    return attr;
  }, [skinnedMesh]);
}
