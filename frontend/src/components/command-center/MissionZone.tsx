import { Link } from 'react-router-dom';
import type { TrainingSession, ActualTrainingSession, TrainingSummary } from '../../api/types';
import { TRAINING_LABELS, TRAINING_ICONS, TRAINING_COLORS } from '../../constants';
import { Panel } from '../common/Panel';

interface MissionZoneProps {
  plannedSessions: TrainingSession[];
  actualSessions?: ActualTrainingSession[];
  trainingSummary?: TrainingSummary;
  onToggleSession?: (session: TrainingSession, completed: boolean) => void;
  saving?: boolean;
}

type MissionState = 'empty' | 'planned' | 'done';

function getMissionState(
  planned: TrainingSession[],
  actual?: ActualTrainingSession[]
): MissionState {
  // Check if it's a rest day (only rest sessions planned)
  const isRestDay = planned.every((s) => s.type === 'rest');
  if (isRestDay) return 'done'; // Rest days are always "done"

  // Check if all planned sessions have been completed
  const actualCount = actual?.length ?? 0;
  const plannedCount = planned.filter((s) => s.type !== 'rest').length;

  if (actualCount >= plannedCount && plannedCount > 0) return 'done';
  if (plannedCount === 0) return 'empty';
  return 'planned';
}

function isSessionCompleted(
  session: TrainingSession,
  actualSessions?: ActualTrainingSession[]
): boolean {
  if (!actualSessions) return false;
  return actualSessions.some(
    (actual) =>
      actual.type === session.type && actual.durationMin === session.durationMin
  );
}

export function MissionZone({
  plannedSessions,
  actualSessions,
  trainingSummary,
  onToggleSession,
  saving = false,
}: MissionZoneProps) {
  const state = getMissionState(plannedSessions, actualSessions);
  const isRestDay = plannedSessions.every((s) => s.type === 'rest');

  // Empty State
  if (state === 'empty') {
    return (
      <Panel>
        <div className="text-center py-6">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="text-lg font-medium text-white mb-2">No Training Planned</h3>
          <p className="text-sm text-gray-400 mb-4">
            Plan your workout to track progress
          </p>
          <Link
            to="/workout-planner"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Plan Workout
          </Link>
        </div>
      </Panel>
    );
  }

  // Rest Day State
  if (isRestDay) {
    return (
      <Panel>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium">Today's Mission</h3>
          <span className="px-2 py-1 text-xs rounded-full bg-gray-700 text-gray-300">
            Rest Day
          </span>
        </div>
        <div className="text-center py-4">
          <div className="text-4xl mb-2">😴</div>
          <p className="text-gray-400">Recovery day - no training scheduled</p>
        </div>
      </Panel>
    );
  }

  // Planned or Done State
  const completedCount = actualSessions?.length ?? 0;
  const totalCount = plannedSessions.filter((s) => s.type !== 'rest').length;
  const allDone = state === 'done';

  return (
    <Panel>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium">Today's Mission</h3>
        {allDone ? (
          <span className="px-2 py-1 text-xs rounded-full bg-green-900/50 text-green-400 border border-green-800">
            ✓ Complete
          </span>
        ) : (
          <span className="px-2 py-1 text-xs rounded-full bg-gray-800 text-gray-400">
            {completedCount}/{totalCount} done
          </span>
        )}
      </div>

      {/* Session List */}
      <div className="space-y-2">
        {plannedSessions
          .filter((s) => s.type !== 'rest')
          .map((session, index) => {
            const completed = isSessionCompleted(session, actualSessions);
            const colors = TRAINING_COLORS[session.type];

            return (
              <div
                key={`${session.type}-${index}`}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  completed
                    ? 'bg-green-900/20 border-green-800/50'
                    : 'bg-gray-800/50 border-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Completion checkbox */}
                  {onToggleSession && (
                    <button
                      type="button"
                      onClick={() => onToggleSession(session, !completed)}
                      disabled={saving}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        completed
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {completed && (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  )}

                  {/* Training type icon and label */}
                  <span className="text-xl">{TRAINING_ICONS[session.type]}</span>
                  <div>
                    <span
                      className={`font-medium ${
                        completed ? 'text-gray-400 line-through' : 'text-white'
                      }`}
                    >
                      {TRAINING_LABELS[session.type]}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
                      {session.durationMin} min
                    </span>
                  </div>
                </div>

                {/* Quick log button (if not completed) */}
                {!completed && (
                  <Link
                    to="/log-workout"
                    className="px-3 py-1 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                  >
                    Log
                  </Link>
                )}
              </div>
            );
          })}
      </div>

      {/* Training Summary */}
      {trainingSummary && trainingSummary.sessionCount > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between text-sm">
          <span className="text-gray-500">Total Load</span>
          <span className="text-white font-medium">{trainingSummary.totalLoadScore}</span>
        </div>
      )}

      {/* Action Button */}
      {!allDone && (
        <div className="mt-4">
          <Link
            to="/log-workout"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Log Workout
          </Link>
        </div>
      )}
    </Panel>
  );
}
