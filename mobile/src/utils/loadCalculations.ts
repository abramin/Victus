import type { TrainingConfig, TrainingType } from '../api/types';

/**
 * Calculate load for a single training session.
 * Formula: loadScore × (durationMin/60) × (RPE/3)
 * Ported from backend/internal/domain/training.go:SessionLoad
 */
export function calculateSessionLoad(
  loadScore: number,
  durationMin: number,
  rpe: number = 5
): number {
  const durationFactor = durationMin / 60;
  const rpeFactor = rpe / 3;
  return loadScore * durationFactor * rpeFactor;
}

/**
 * Calculate total load for a day from planned sessions.
 */
export function calculateDayLoad(
  sessions: Array<{ loadScore: number; durationMin: number; rpe?: number }>
): number {
  return sessions.reduce(
    (sum, s) => sum + calculateSessionLoad(s.loadScore, s.durationMin, s.rpe ?? 5),
    0
  );
}

/**
 * Calculate 7-day rolling average (acute load).
 * Expects data points ordered oldest first.
 */
export function calculateAcuteLoad(dailyLoads: number[]): number {
  if (dailyLoads.length === 0) return 0;
  const acuteDays = 7;
  const start = Math.max(0, dailyLoads.length - acuteDays);
  const recent = dailyLoads.slice(start);
  return recent.reduce((sum, load) => sum + load, 0) / recent.length;
}

/**
 * Calculate 28-day rolling average (chronic load).
 * Returns 0 if fewer than 7 data points.
 */
export function calculateChronicLoad(dailyLoads: number[]): number {
  const chronicDays = 28;
  const minDaysForChronic = 7;

  if (dailyLoads.length < minDaysForChronic) return 0;

  const start = Math.max(0, dailyLoads.length - chronicDays);
  const subset = dailyLoads.slice(start);
  return subset.reduce((sum, load) => sum + load, 0) / subset.length;
}

/**
 * Calculate Acute:Chronic Workload Ratio (ACR).
 * Returns 1.0 when chronic load is 0 (prevents division by zero).
 */
export function calculateACR(acuteLoad: number, chronicLoad: number): number {
  if (chronicLoad === 0) return 1.0;
  return acuteLoad / chronicLoad;
}

/**
 * Check if a day's load would cause an overload (ACR > 1.5).
 * ACR > 1.5 is considered the "spike zone" with increased injury risk.
 */
export function isOverloaded(dayLoad: number, chronicLoad: number): boolean {
  if (chronicLoad === 0) return false;
  const threshold = chronicLoad * 1.5;
  return dayLoad > threshold;
}

/**
 * Get load zone classification based on ACR.
 */
export type LoadZone = 'optimal' | 'high' | 'overload';

export function getLoadZone(acr: number): LoadZone {
  if (acr < 0.8) return 'optimal'; // Under-training zone (but safe)
  if (acr <= 1.3) return 'optimal'; // Sweet spot
  if (acr <= 1.5) return 'high'; // Approaching overload
  return 'overload'; // Spike zone
}

/**
 * Get load score for a training type from the configs.
 */
export function getLoadScoreForType(
  trainingType: TrainingType,
  configs: TrainingConfig[]
): number {
  const config = configs.find((c) => c.type === trainingType);
  return config?.loadScore ?? 0;
}

/**
 * Format load as a display string (e.g., "13.3" or "0").
 */
export function formatLoad(load: number): string {
  if (load === 0) return '0';
  return load.toFixed(1);
}
