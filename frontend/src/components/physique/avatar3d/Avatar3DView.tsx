import { Suspense, useState, useCallback, useRef, lazy } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ErrorBoundary } from '../../common/ErrorBoundary';
import { BodyMapVisualizer } from '../../body-map';
import type { MuscleFatigue, MuscleGroup } from '../../../api/types';

// Lazy-load the AvatarModel to avoid pulling Three.js into the main bundle
// when 3D is disabled. In practice, since Avatar3DView itself is lazy-loaded
// from PhysiqueDashboard, this is an extra level of code splitting.
const AvatarModel = lazy(() =>
  import('./AvatarModel').then((m) => ({ default: m.AvatarModel })),
);

const DEFAULT_MODEL_URL = '/models/base-avatar.glb';

interface Avatar3DViewProps {
  muscles: MuscleFatigue[];
  onMuscleClick?: (muscle: MuscleGroup) => void;
  highlightMuscles?: MuscleGroup[];
  selectedMuscle: MuscleGroup | null;
  onZoomChange?: (distance: number) => void;
}

function CameraDistanceTracker({ onChange }: { onChange?: (d: number) => void }) {
  const lastReported = useRef(Infinity);
  useFrame(({ camera }) => {
    const dist = camera.position.length();
    if (Math.abs(dist - lastReported.current) > 0.1) {
      lastReported.current = dist;
      onChange?.(dist);
    }
  });
  return null;
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full text-emerald-500 font-mono text-sm">
      LOADING_MODEL...
    </div>
  );
}

export function Avatar3DView({
  muscles,
  onMuscleClick,
  highlightMuscles = [],
  selectedMuscle,
  onZoomChange,
}: Avatar3DViewProps) {
  const [hoveredMuscle, setHoveredMuscle] = useState<MuscleGroup | null>(null);

  const handleMuscleClick = useCallback(
    (muscle: MuscleGroup) => onMuscleClick?.(muscle),
    [onMuscleClick],
  );

  // Determine the active highlight: selected takes priority over hovered
  const activeHighlight = selectedMuscle ?? hoveredMuscle;

  // Find hovered muscle data for tooltip
  const hoveredData = hoveredMuscle ? muscles.find((m) => m.muscle === hoveredMuscle) : null;

  return (
    <ErrorBoundary
      fallback={
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-2">3D view unavailable</p>
          <BodyMapVisualizer
            muscles={muscles}
            size="lg"
            onMuscleClick={onMuscleClick}
            highlightMuscles={highlightMuscles}
          />
        </div>
      }
    >
      <div className="w-full h-[500px] relative">
        <Suspense fallback={<LoadingSpinner />}>
          <Canvas
            camera={{ position: [0, 0.5, 3], fov: 35 }}
            gl={{ antialias: true, alpha: true }}
            onCreated={({ gl }) => {
              gl.setClearColor(0x000000, 0);
            }}
          >
            <ambientLight intensity={0.4} />
            <directionalLight position={[5, 5, 5]} intensity={0.8} />
            <pointLight position={[-3, 2, -3]} intensity={0.3} color="#3b82f6" />

            <Suspense fallback={null}>
              <AvatarModel
                modelUrl={DEFAULT_MODEL_URL}
                muscles={muscles}
                highlightMuscle={activeHighlight}
                onMuscleHover={setHoveredMuscle}
                onMuscleClick={handleMuscleClick}
              />
            </Suspense>

            <OrbitControls
              enablePan={false}
              minDistance={1.5}
              maxDistance={5}
              minPolarAngle={Math.PI / 6}
              maxPolarAngle={Math.PI / 1.5}
            />

            <CameraDistanceTracker onChange={onZoomChange} />
          </Canvas>
        </Suspense>

        {/* Hovered muscle tooltip */}
        {hoveredData && (
          <div className="absolute top-3 left-3 px-3 py-2 bg-gray-900/90 text-white rounded-lg border border-gray-700 text-sm pointer-events-none">
            <span className="font-medium">{hoveredData.displayName}</span>
            <span className="ml-2 text-gray-400">{hoveredData.fatiguePercent.toFixed(0)}%</span>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
