import { Panel } from '../common/Panel';
import type { TrainingSession, ActualTrainingSession } from '../../api/types';
import { TRAINING_LABELS } from '../../constants';

interface TrainingLogCardProps {
  /** Planned training sessions for the day */
  plannedSessions: TrainingSession[];
  /** Actual completed training sessions */
  actualSessions?: ActualTrainingSession[];
  /** Callback when a session is marked complete/incomplete */
  onToggleSession: (session: TrainingSession, completed: boolean) => void;
  /** Whether the update is in progress */
  saving?: boolean;
}

/**
 * Training log card showing each planned session with completion checkboxes.
 */
export function TrainingLogCard({
  plannedSessions,
  actualSessions = [],
  onToggleSession,
  saving = false,
}: TrainingLogCardProps) {
  const isRestDay =
    plannedSessions.length === 0 ||
    plannedSessions.every((s) => s.type === 'rest');

  // Check if a planned session has been completed
  const isSessionCompleted = (planned: TrainingSession): boolean => {
    return actualSessions.some(
      (actual) =>
        actual.type === planned.type && actual.durationMin === planned.durationMin
    );
  };

  if (isRestDay) {
    return (
      <Panel title="Training">
        <div className="flex items-center justify-center py-4">
          <span className="text-gray-400 text-sm">Rest day - no training planned</span>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Training">
      <div className="space-y-2">
        {plannedSessions
          .filter((s) => s.type !== 'rest')
          .map((session, index) => {
            const completed = isSessionCompleted(session);
            return (
              <div
                key={`${session.type}-${index}`}
                className="flex items-center justify-between py-2 px-3 bg-gray-800/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onToggleSession(session, !completed)}
                    disabled={saving}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      completed
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-gray-600 hover:border-gray-500'
                    } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {completed && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </button>
                  <span
                    className={`text-sm font-medium ${
                      completed ? 'text-gray-400 line-through' : 'text-white'
                    }`}
                  >
                    {TRAINING_LABELS[session.type]}
                  </span>
                </div>
                <span className="text-sm text-gray-400">{session.durationMin}m</span>
              </div>
            );
          })}
      </div>
    </Panel>
  );
}
