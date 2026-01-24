import type { TrainingSession, TrainingType } from '../../api/types';
import { TRAINING_ICONS, TRAINING_LABELS, TRAINING_COLORS } from '../../constants';

interface TrainingBadgeProps {
  sessions: TrainingSession[];
  compact?: boolean;
}

/**
 * Displays training session info in a compact badge format.
 * Shows the primary training type (first non-rest session) with icon and duration.
 * If multiple sessions exist, shows a "+N" badge.
 */
export function TrainingBadge({ sessions, compact = false }: TrainingBadgeProps) {
  if (!sessions || sessions.length === 0) {
    return null;
  }

  // Find primary training type (first non-rest session, or rest if all are rest)
  const primarySession = sessions.find(s => s.type !== 'rest') || sessions[0];
  const trainingType = primarySession.type;
  const totalDuration = sessions.reduce((sum, s) => sum + s.durationMin, 0);
  const additionalSessions = sessions.length - 1;

  const icon = TRAINING_ICONS[trainingType];
  const label = TRAINING_LABELS[trainingType];
  const colors = TRAINING_COLORS[trainingType];

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${colors.bg} ${colors.text}`}>
        <span>{icon}</span>
        {additionalSessions > 0 && (
          <span className="text-[10px] opacity-75">+{additionalSessions}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${colors.bg}`}>
      <span className="text-sm">{icon}</span>
      <div className="flex flex-col min-w-0">
        <span className={`text-xs font-medium ${colors.text} truncate`}>
          {label}
          {additionalSessions > 0 && (
            <span className="ml-1 opacity-75">+{additionalSessions}</span>
          )}
        </span>
        {totalDuration > 0 && (
          <span className="text-[10px] text-gray-500">{totalDuration}min</span>
        )}
      </div>
    </div>
  );
}

interface TrainingTypeIconProps {
  type: TrainingType;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Simple icon-only display for a training type.
 */
export function TrainingTypeIcon({ type, size = 'md' }: TrainingTypeIconProps) {
  const icon = TRAINING_ICONS[type];
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return <span className={sizeClasses[size]}>{icon}</span>;
}
