import type { ActualTrainingSession, TrainingSession, TrainingSummary } from '../../../api/types';
import { TrainingBadge } from '../../plan/TrainingBadge';

interface TrainingTicketProps {
  plannedSessions: TrainingSession[];
  actualSessions?: ActualTrainingSession[];
  trainingSummary: TrainingSummary;
}

function isRestDay(sessions: TrainingSession[]): boolean {
  return sessions.length === 0 || sessions.every((s) => s.type === 'rest');
}

function calculateAverageRpe(sessions: ActualTrainingSession[]): number | null {
  const sessionsWithRpe = sessions.filter((s) => s.perceivedIntensity != null);
  if (sessionsWithRpe.length === 0) return null;
  const sum = sessionsWithRpe.reduce((acc, s) => acc + (s.perceivedIntensity ?? 0), 0);
  return Math.round((sum / sessionsWithRpe.length) * 10) / 10;
}

export function TrainingTicket({
  plannedSessions,
  actualSessions,
  trainingSummary,
}: TrainingTicketProps) {
  const restDay = isRestDay(plannedSessions);
  const hasActualTraining = actualSessions && actualSessions.length > 0;
  const avgRpe = actualSessions ? calculateAverageRpe(actualSessions) : null;

  // Rest day banner
  if (restDay && !hasActualTraining) {
    return (
      <div className="bg-slate-900/50 rounded-lg border border-slate-700 border-dashed p-4 flex items-center justify-center gap-2">
        <span className="text-lg">😴</span>
        <span className="text-slate-500 text-sm">Rest Day - Recovery Focus</span>
      </div>
    );
  }

  // Training ticket
  const displaySessions = hasActualTraining
    ? (actualSessions as TrainingSession[])
    : plannedSessions;

  return (
    <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
      <div className="flex items-center justify-between">
        {/* Left: Training badge */}
        <div className="flex items-center gap-3">
          <TrainingBadge sessions={displaySessions} />
          {!hasActualTraining && plannedSessions.length > 0 && (
            <span className="text-xs text-slate-500">(planned)</span>
          )}
        </div>

        {/* Right: Stats */}
        <div className="flex items-center gap-4 text-xs">
          {trainingSummary.totalLoadScore > 0 && (
            <div className="text-slate-400">
              <span className="text-slate-500">Load</span>{' '}
              <span className="text-white font-mono">
                {trainingSummary.totalLoadScore.toFixed(1)}
              </span>
            </div>
          )}
          {avgRpe !== null && (
            <div className="text-slate-400">
              <span className="text-slate-500">RPE</span>{' '}
              <span className="text-white font-mono">{avgRpe}</span>
            </div>
          )}
        </div>
      </div>

      {/* Session count summary */}
      {trainingSummary.sessionCount > 0 && (
        <div className="mt-2 text-xs text-slate-500">
          {trainingSummary.summary}
        </div>
      )}
    </div>
  );
}
