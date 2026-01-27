import { useMemo } from 'react';
import type { MuscleGroup, MuscleFatigue, TrainingType } from '../../api/types';
import { TRAINING_TO_MUSCLES, FATIGUE_THRESHOLDS, getMuscleRegion, type MuscleRegion } from './trainingArchetypeMap';
import type { PlannedSessionDraft } from './DayDropZone';

/**
 * Recovery warning for a specific day.
 */
export interface DayRecoveryWarning {
  date: string;
  severity: 'caution' | 'warning';
  conflictingMuscles: MuscleGroup[];
  maxFatigue: number;
}

/**
 * Aggregated region recovery state.
 */
export interface RegionRecovery {
  region: MuscleRegion;
  label: string;
  avgFatigue: number;
  status: 'fresh' | 'stimulated' | 'fatigued' | 'overreached';
  color: string;
}

interface PlannedDayWithSessions {
  sessions: PlannedSessionDraft[];
}

/**
 * Simulated fatigue decay rate per day (percentage points).
 * Muscles recover roughly 10-15% per day at rest.
 */
const FATIGUE_DECAY_PER_DAY = 12;

/**
 * Simulated fatigue injection per session (based on load and duration).
 * This is a simplified model for planning purposes.
 */
function estimateSessionFatigue(session: PlannedSessionDraft): number {
  // Base fatigue from load score (0-5) scaled to percentage
  const baseFatigue = session.loadScore * 10; // 0-50%
  // Duration modifier (longer sessions = more fatigue)
  const durationMod = Math.min(1.5, session.durationMin / 60);
  // RPE modifier (higher intensity = more fatigue)
  const rpeMod = session.rpe / 5; // 0.2-2.0
  return baseFatigue * durationMod * rpeMod;
}

/**
 * Get fatigue status from percentage.
 */
function getFatigueStatus(fatigue: number): 'fresh' | 'stimulated' | 'fatigued' | 'overreached' {
  if (fatigue < 30) return 'fresh';
  if (fatigue < 60) return 'stimulated';
  if (fatigue < 85) return 'fatigued';
  return 'overreached';
}

/**
 * Get color for fatigue status.
 */
function getFatigueColor(status: 'fresh' | 'stimulated' | 'fatigued' | 'overreached'): string {
  switch (status) {
    case 'fresh':
      return '#22c55e'; // green-500
    case 'stimulated':
      return '#3b82f6'; // blue-500
    case 'fatigued':
      return '#f59e0b'; // amber-500
    case 'overreached':
      return '#ef4444'; // red-500
  }
}

/**
 * Hook to analyze recovery context for the planner.
 * Projects muscle fatigue based on current status and planned sessions.
 */
export function useRecoveryContext(
  currentBodyStatus: MuscleFatigue[] | null,
  plannedDays: Map<string, PlannedDayWithSessions>,
  weekDates: string[]
): {
  warnings: Map<string, DayRecoveryWarning>;
  regionRecovery: RegionRecovery[];
  overallScore: number;
} {
  return useMemo(() => {
    // Initialize muscle fatigue map from current status or defaults
    const muscleFatigue = new Map<MuscleGroup, number>();

    if (currentBodyStatus && currentBodyStatus.length > 0) {
      currentBodyStatus.forEach((muscle) => {
        muscleFatigue.set(muscle.muscle, muscle.fatiguePercent);
      });
    }

    // Warnings map
    const warnings = new Map<string, DayRecoveryWarning>();

    // Project fatigue day by day
    weekDates.forEach((date, dayIndex) => {
      // First, apply decay from previous day (except for first day)
      if (dayIndex > 0) {
        muscleFatigue.forEach((fatigue, muscle) => {
          const decayed = Math.max(0, fatigue - FATIGUE_DECAY_PER_DAY);
          muscleFatigue.set(muscle, decayed);
        });
      }

      const dayData = plannedDays.get(date);
      if (!dayData || dayData.sessions.length === 0) return;

      // Check for conflicts before adding new fatigue
      const conflictingMuscles: MuscleGroup[] = [];
      let maxFatigue = 0;

      dayData.sessions.forEach((session) => {
        const targetMuscles = TRAINING_TO_MUSCLES[session.trainingType] || [];
        targetMuscles.forEach((muscle) => {
          const currentFatigue = muscleFatigue.get(muscle) || 0;
          if (currentFatigue >= FATIGUE_THRESHOLDS.caution) {
            if (!conflictingMuscles.includes(muscle)) {
              conflictingMuscles.push(muscle);
            }
            maxFatigue = Math.max(maxFatigue, currentFatigue);
          }
        });
      });

      // Add warning if there are conflicts
      if (conflictingMuscles.length > 0) {
        warnings.set(date, {
          date,
          severity: maxFatigue >= FATIGUE_THRESHOLDS.warning ? 'warning' : 'caution',
          conflictingMuscles,
          maxFatigue,
        });
      }

      // Now inject fatigue from planned sessions
      dayData.sessions.forEach((session) => {
        const targetMuscles = TRAINING_TO_MUSCLES[session.trainingType] || [];
        const fatigueInjection = estimateSessionFatigue(session);

        targetMuscles.forEach((muscle) => {
          const current = muscleFatigue.get(muscle) || 0;
          muscleFatigue.set(muscle, Math.min(100, current + fatigueInjection));
        });
      });
    });

    // Calculate region recovery from current body status (not projected)
    const regionRecovery: RegionRecovery[] = [];
    const regions: { region: MuscleRegion; label: string }[] = [
      { region: 'upper', label: 'Upper' },
      { region: 'core', label: 'Core' },
      { region: 'lower', label: 'Lower' },
    ];

    if (currentBodyStatus && currentBodyStatus.length > 0) {
      regions.forEach(({ region, label }) => {
        const regionMuscles = currentBodyStatus.filter(
          (m) => getMuscleRegion(m.muscle) === region
        );

        if (regionMuscles.length > 0) {
          const avgFatigue =
            regionMuscles.reduce((sum, m) => sum + m.fatiguePercent, 0) /
            regionMuscles.length;
          const status = getFatigueStatus(avgFatigue);

          regionRecovery.push({
            region,
            label,
            avgFatigue: Math.round(avgFatigue),
            status,
            color: getFatigueColor(status),
          });
        } else {
          // Default to fresh if no data
          regionRecovery.push({
            region,
            label,
            avgFatigue: 0,
            status: 'fresh',
            color: getFatigueColor('fresh'),
          });
        }
      });
    } else {
      // No body status available - return fresh defaults
      regions.forEach(({ region, label }) => {
        regionRecovery.push({
          region,
          label,
          avgFatigue: 0,
          status: 'fresh',
          color: getFatigueColor('fresh'),
        });
      });
    }

    // Calculate overall recovery score (inverse of average fatigue)
    const overallAvgFatigue =
      regionRecovery.reduce((sum, r) => sum + r.avgFatigue, 0) /
      regionRecovery.length;
    const overallScore = Math.round(100 - overallAvgFatigue);

    return { warnings, regionRecovery, overallScore };
  }, [currentBodyStatus, plannedDays, weekDates]);
}
