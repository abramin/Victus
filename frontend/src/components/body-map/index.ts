// 2D Components (SVG-based)
export { BodyMapVisualizer } from './BodyMapVisualizer';
export { ArchetypeSelector } from './ArchetypeSelector';
export { SessionReportModal } from './SessionReportModal';

// 3D Components (React Three Fiber)
export { BodyMap3D } from './BodyMap3D';
export { BodyModel } from './BodyModel';
export { MuscleHighlight, MuscleGlow } from './MuscleHighlight';
export { NeuralOverlay } from './NeuralOverlay';

// Utilities
export { useWebGLSupport, isWebGLSupported, getWebGLCapabilities } from './useWebGLSupport';
export {
  getMuscleColor,
  getGlowColor,
  getGlowIntensity,
  getRadialGradientStops,
  getAnimationParams,
  getStatusDisplay,
  SKIN_TONES,
} from './colorSystem';
