import type { TrainingSession, ActualTrainingSession } from '../../api/types';

export type AdherenceStatus = 'complete' | 'partial' | 'missed' | 'rest' | 'future';

interface AdherenceIndicatorProps {
  status: AdherenceStatus;
  compact?: boolean;
}

/**
 * Visual indicator for training compliance.
 * - Complete (green checkmark): Actual training logged matches or exceeds planned
 * - Partial (yellow half): Some training logged but less than planned
 * - Missed (red X): No actual training logged when training was planned
 * - Rest (gray): Rest day - no training expected
 * - Future: No indicator shown
 */
export function AdherenceIndicator({ status, compact = false }: AdherenceIndicatorProps) {
  if (status === 'future') return null;

  const configs: Record<Exclude<AdherenceStatus, 'future'>, { icon: JSX.Element; bg: string; title: string }> = {
    complete: {
      icon: (
        <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ),
      bg: 'bg-green-500/20 text-green-400',
      title: 'Training completed',
    },
    partial: {
      icon: (
        <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
          <path d="M10 4a6 6 0 016 6h-6V4z" />
        </svg>
      ),
      bg: 'bg-yellow-500/20 text-yellow-400',
      title: 'Partial training completed',
    },
    missed: {
      icon: (
        <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      ),
      bg: 'bg-red-500/20 text-red-400',
      title: 'Training missed',
    },
    rest: {
      icon: (
        <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      ),
      bg: 'bg-gray-500/20 text-gray-400',
      title: 'Rest day',
    },
  };

  const config = configs[status];
  const sizeClasses = compact ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <div
      className={`${sizeClasses} rounded-full ${config.bg} flex items-center justify-center p-0.5`}
      title={config.title}
    >
      {config.icon}
    </div>
  );
}

/**
 * Calculate adherence status based on planned vs actual training sessions.
 */
export function calculateAdherenceStatus(
  plannedSessions: TrainingSession[] | undefined,
  actualSessions: ActualTrainingSession[] | undefined,
  isPast: boolean
): AdherenceStatus {
  // Future days have no adherence status
  if (!isPast) return 'future';

  // Filter out rest sessions for comparison
  const plannedNonRest = plannedSessions?.filter(s => s.type !== 'rest') || [];
  const actualNonRest = actualSessions?.filter(s => s.type !== 'rest') || [];

  // If no training was planned, it's a rest day
  if (plannedNonRest.length === 0) {
    return 'rest';
  }

  // If no actual training was logged, training was missed
  if (actualNonRest.length === 0) {
    return 'missed';
  }

  // Compare total duration
  const plannedDuration = plannedNonRest.reduce((sum, s) => sum + s.durationMin, 0);
  const actualDuration = actualNonRest.reduce((sum, s) => sum + s.durationMin, 0);

  // If actual >= 90% of planned, consider it complete
  if (actualDuration >= plannedDuration * 0.9) {
    return 'complete';
  }

  // Otherwise it's partial
  return 'partial';
}
