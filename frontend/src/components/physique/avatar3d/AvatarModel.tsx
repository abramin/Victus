import { useRef, useEffect, useCallback, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
import type { MuscleFatigue, MuscleGroup } from '../../../api/types';
import { useMuscleRegionAttribute } from './useMuscleRegionAttribute';
import { useAvatarFatigueUniforms } from './useAvatarFatigueUniforms';
import { vertexShader, fragmentShader } from './muscleShader';
import { MUSCLE_REGION_INDEX, INDEX_TO_MUSCLE } from './boneRegionMap';

interface AvatarModelProps {
  modelUrl: string;
  muscles: MuscleFatigue[];
  highlightMuscle: MuscleGroup | null;
  onMuscleHover?: (muscle: MuscleGroup | null) => void;
  onMuscleClick?: (muscle: MuscleGroup) => void;
}

/** Find the primary skinned mesh in an RPM model scene */
function findBodyMesh(scene: THREE.Object3D): THREE.SkinnedMesh | null {
  let found: THREE.SkinnedMesh | null = null;

  scene.traverse((child) => {
    if (found) return;
    if (child instanceof THREE.SkinnedMesh) {
      // Prefer Wolf3D_Body by name, fall back to any SkinnedMesh
      if (child.name === 'Wolf3D_Body') {
        found = child;
      } else if (!found) {
        found = child;
      }
    }
  });

  return found;
}

function getBodyHit(
  intersections: THREE.Intersection[] | undefined,
  skinnedMesh: THREE.SkinnedMesh,
): THREE.Intersection | null {
  if (!intersections?.length) return null;
  return intersections.find((hit) => hit.object === skinnedMesh) ?? null;
}

function getRegionFromHit(
  hit: THREE.Intersection,
  skinnedMesh: THREE.SkinnedMesh,
): MuscleGroup | null {
  if (hit.faceIndex == null) return null;

  const geometry = skinnedMesh.geometry;
  const regionAttr = geometry.getAttribute('aRegionIndex') as THREE.BufferAttribute | null;
  const index = geometry.index;
  if (!regionAttr || !index) return null;

  const vertIdx = index.getX(hit.faceIndex * 3);
  const regionIdx = Math.round(regionAttr.getX(vertIdx));

  if (regionIdx < 0 || regionIdx > 14) return null;
  return INDEX_TO_MUSCLE[regionIdx];
}

export function AvatarModel({
  modelUrl,
  muscles,
  highlightMuscle,
  onMuscleHover,
  onMuscleClick,
}: AvatarModelProps) {
  const { scene } = useGLTF(modelUrl);
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<CustomShaderMaterial | null>(null);
  const originalMaterialRef = useRef<THREE.Material | THREE.Material[] | null>(null);
  const [skinnedMesh, setSkinnedMesh] = useState<THREE.SkinnedMesh | null>(null);

  // Find the body mesh once on load
  useEffect(() => {
    const mesh = findBodyMesh(scene);
    if (mesh) {
      originalMaterialRef.current = mesh.material;
      setSkinnedMesh(mesh);
    }
  }, [scene]);

  // Build per-vertex region attribute (runs once)
  useMuscleRegionAttribute(skinnedMesh);

  // Build shader uniforms (updates in place when muscles change)
  const uniforms = useAvatarFatigueUniforms(muscles);

  // Apply CSM material to the mesh
  useEffect(() => {
    if (!skinnedMesh) return;

    const baseMat = Array.isArray(skinnedMesh.material)
      ? skinnedMesh.material[0]
      : skinnedMesh.material;
    const stdMat = baseMat as THREE.MeshStandardMaterial;

    const csm = new CustomShaderMaterial({
      baseMaterial: THREE.MeshStandardMaterial,
      vertexShader,
      fragmentShader,
      uniforms,
      color: stdMat.color ?? new THREE.Color(0xffffff),
      map: stdMat.map ?? null,
      normalMap: stdMat.normalMap ?? null,
      roughness: stdMat.roughness ?? 0.8,
      metalness: stdMat.metalness ?? 0.0,
    });

    skinnedMesh.material = csm;
    materialRef.current = csm;

    return () => {
      csm.dispose();
      if (originalMaterialRef.current) {
        skinnedMesh.material = originalMaterialRef.current;
      }
      materialRef.current = null;
    };
  }, [skinnedMesh, uniforms]);

  // Update highlight uniform
  useEffect(() => {
    uniforms.uHighlightRegion.value =
      highlightMuscle != null ? (MUSCLE_REGION_INDEX[highlightMuscle] ?? -1) : -1;
  }, [highlightMuscle, uniforms]);

  // Animate time uniform for pulse effects
  useFrame((_, delta) => {
    uniforms.uTime.value += delta;
  });

  // Raycast hover: read aRegionIndex from hit vertex
  const handlePointerMove = useCallback(
    (e: THREE.Event & { intersections?: THREE.Intersection[] }) => {
      if (!skinnedMesh || !onMuscleHover) return;

      const intersections = (e as unknown as { intersections: THREE.Intersection[] }).intersections;
      const hit = getBodyHit(intersections, skinnedMesh);
      onMuscleHover(hit ? getRegionFromHit(hit, skinnedMesh) : null);
    },
    [skinnedMesh, onMuscleHover],
  );

  const handlePointerOut = useCallback(() => {
    onMuscleHover?.(null);
  }, [onMuscleHover]);

  const handleClick = useCallback(
    (e: THREE.Event & { intersections?: THREE.Intersection[] }) => {
      if (!skinnedMesh || !onMuscleClick) return;

      const intersections = (e as unknown as { intersections: THREE.Intersection[] }).intersections;
      const hit = getBodyHit(intersections, skinnedMesh);
      if (!hit) return;

      const region = getRegionFromHit(hit, skinnedMesh);
      if (region) onMuscleClick(region);
    },
    [skinnedMesh, onMuscleClick],
  );

  return (
    <group
      ref={groupRef}
      position={[0, -1, 0]}
      onPointerMove={handlePointerMove as unknown as (e: THREE.Event) => void}
      onPointerOut={handlePointerOut as unknown as (e: THREE.Event) => void}
      onClick={handleClick as unknown as (e: THREE.Event) => void}
    >
      <primitive object={scene} />
    </group>
  );
}
