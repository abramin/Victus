import { useState, useEffect, useCallback, useRef } from 'react';
import { Modal } from '../common/Modal';
import { IntensitySelector } from './IntensitySelector';
import type { TrainingSession, ActualTrainingSession, TrainingType } from '../../api/types';

// Internal type with stable ID for React keys
type SessionWithId = Omit<ActualTrainingSession, 'sessionOrder'> & { _id: string };

const TRAINING_OPTIONS = [
  { value: 'rest', label: 'Rest Day' },
  { value: 'qigong', label: 'Qigong' },
  { value: 'walking', label: 'Walking' },
  { value: 'gmb', label: 'GMB' },
  { value: 'run', label: 'Running' },
  { value: 'row', label: 'Rowing' },
  { value: 'cycle', label: 'Cycling' },
  { value: 'hiit', label: 'HIIT' },
  { value: 'strength', label: 'Strength' },
  { value: 'calisthenics', label: 'Calisthenics' },
  { value: 'mobility', label: 'Mobility' },
  { value: 'mixed', label: 'Mixed' },
];

const DEFAULT_RPE = 5;

// Load score coefficients matching backend (backend/internal/domain/targets.go)
const TRAINING_LOAD_SCORES: Record<TrainingType, number> = {
  rest: 0,
  qigong: 0.5,
  mobility: 0.5,
  walking: 1,
  cycle: 2,
  gmb: 3,
  run: 3,
  row: 3,
  calisthenics: 3,
  mixed: 4,
  strength: 5,
  hiit: 5,
};

const getSessionLoadScore = (type: TrainingType, durationMin: number, rpe: number): number => {
  if (type === 'rest') return 0;
  const loadScore = TRAINING_LOAD_SCORES[type] ?? 1;
  const durationFactor = durationMin / 60;
  const rpeFactor = rpe / 3;
  return Math.round(loadScore * durationFactor * rpeFactor * 100) / 100;
};

const getSessionPerceivedIntensity = (
  session: TrainingSession | ActualTrainingSession
): number | undefined => {
  if ('perceivedIntensity' in session) {
    return session.perceivedIntensity;
  }
  return undefined;
};

const getTrainingLabel = (type: TrainingType) =>
  TRAINING_OPTIONS.find((option) => option.value === type)?.label ?? type;

const getLoadTone = (score: number) => {
  if (score <= 0) {
    return { label: 'No Load', className: 'text-gray-500' };
  }
  if (score <= 1) {
    return { label: 'Very Low', className: 'text-emerald-400' };
  }
  if (score <= 3) {
    return { label: 'Low Stress', className: 'text-green-400' };
  }
  if (score <= 6) {
    return { label: 'Moderate Stress', className: 'text-yellow-400' };
  }
  if (score <= 10) {
    return { label: 'High Stress', className: 'text-orange-400' };
  }
  return { label: 'Max Stress', className: 'text-red-400' };
};

interface ActualTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'quick' | 'detail';
  plannedSessions: TrainingSession[];
  actualSessions?: ActualTrainingSession[];
  onSave: (sessions: Omit<ActualTrainingSession, 'sessionOrder'>[]) => Promise<boolean>;
  saving: boolean;
}

export function ActualTrainingModal({
  isOpen,
  onClose,
  initialMode = 'detail',
  plannedSessions,
  actualSessions,
  onSave,
  saving,
}: ActualTrainingModalProps) {
  const [sessions, setSessions] = useState<SessionWithId[]>([]);
  const [mode, setMode] = useState<'quick' | 'detail'>('detail');
  const [globalRpe, setGlobalRpe] = useState(DEFAULT_RPE);
  const idCounterRef = useRef(0);

  // Generate a unique ID (stable within component instance)
  const generateId = useCallback(() => {
    idCounterRef.current += 1;
    return `session-${idCounterRef.current}`;
  }, []);

  // Reset when modal opens - pre-fill with actual if exists, otherwise use planned
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // Reset counter when modal opens for clean IDs
    idCounterRef.current = 0;
    setMode(initialMode);
    setGlobalRpe(DEFAULT_RPE);

    const baseSessions =
      initialMode === 'quick'
        ? plannedSessions
        : actualSessions && actualSessions.length > 0
        ? actualSessions
        : plannedSessions;

    setSessions(
      baseSessions.map((session) => ({
        _id: generateId(),
        type: session.type,
        durationMin: session.durationMin,
        perceivedIntensity:
          initialMode === 'quick'
            ? session.type === 'rest'
              ? undefined
              : DEFAULT_RPE
            : getSessionPerceivedIntensity(session),
        notes: session.notes ?? '',
      }))
    );
  }, [isOpen, plannedSessions, actualSessions, generateId, initialMode]);

  const updateSession = useCallback((id: string, updates: Partial<ActualTrainingSession>) => {
    setSessions((prev) =>
      prev.map((s) => (s._id === id ? { ...s, ...updates } : s))
    );
  }, []);

  const addSession = useCallback(() => {
    if (sessions.length >= 10) return;
    setSessions((prev) => [
      ...prev,
      {
        _id: generateId(),
        type: 'walking',
        durationMin: 30,
        perceivedIntensity: mode === 'quick' ? globalRpe : undefined,
        notes: '',
      },
    ]);
  }, [sessions.length, generateId, mode, globalRpe]);

  const removeSession = useCallback((id: string) => {
    setSessions((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((s) => s._id !== id);
    });
  }, []);

  const isQuickMode = mode === 'quick';

  useEffect(() => {
    if (!isQuickMode) {
      return;
    }
    setSessions((prev) =>
      prev.map((session) =>
        session.type === 'rest'
          ? { ...session, perceivedIntensity: undefined }
          : { ...session, perceivedIntensity: globalRpe }
      )
    );
  }, [globalRpe, isQuickMode]);

  const handleSave = async () => {
    // Strip _id before saving
    const sessionsWithoutId = sessions.map(({ _id, ...rest }) => rest);
    const didSave = await onSave(sessionsWithoutId);
    if (didSave) {
      onClose();
    }
  };

  const handleGlobalRpeChange = (value: number | undefined) => {
    setGlobalRpe(value ?? DEFAULT_RPE);
  };

  const hasActiveSessions = sessions.some((session) => session.type !== 'rest');

  const getPlannedComparison = (index: number) => {
    const planned = plannedSessions[index];
    if (!planned) return null;
    const actual = sessions[index];
    if (!actual) return null;

    const typeDiff = planned.type !== actual.type;
    const durationDiff = planned.durationMin !== actual.durationMin;

    if (!typeDiff && !durationDiff) return null;

    return (
      <div className="text-xs text-yellow-400 mt-2 flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span>
          Planned: {getTrainingLabel(planned.type)}, {planned.durationMin} min
        </span>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Workout">
      <div className="space-y-4">
        {isQuickMode && (
          <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-white font-medium">All sessions marked complete</p>
                <p className="text-xs text-gray-500">
                  Set one intensity for today. You can edit details if needed.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMode('detail')}
                className="text-xs text-gray-400 hover:text-white"
                disabled={saving}
              >
                Edit details instead
              </button>
            </div>
            <div className="mt-3">
              {hasActiveSessions ? (
                <>
                  <IntensitySelector
                    value={globalRpe}
                    onChange={handleGlobalRpeChange}
                    disabled={saving}
                    allowClear={false}
                  />
                  <p className="text-xs text-gray-500 mt-2">Applies to all non-rest sessions.</p>
                </>
              ) : (
                <p className="text-xs text-gray-500">Rest day - no intensity needed.</p>
              )}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">
            {sessions.filter((s) => s.type !== 'rest').length === 0
              ? 'Rest day'
              : `${sessions.length} session${sessions.length > 1 ? 's' : ''}, ${sessions.reduce(
                  (sum, s) => sum + s.durationMin,
                  0
                )} min total`}
          </span>
          {!isQuickMode && sessions.length < 10 && (
            <button
              type="button"
              onClick={addSession}
              className="text-sm text-white hover:text-gray-300 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Session
            </button>
          )}
        </div>

        {/* Session list */}
        <div className="space-y-4 max-h-[50vh] overflow-y-auto">
          {sessions.map((session, index) => {
            const rpeValue =
              session.type === 'rest'
                ? DEFAULT_RPE
                : session.perceivedIntensity ?? DEFAULT_RPE;
            const loadScore = getSessionLoadScore(session.type, session.durationMin, rpeValue);
            const loadTone = getLoadTone(loadScore);
            const isEstimatedRpe = session.type !== 'rest' && session.perceivedIntensity === undefined;
            const trainingLabel = getTrainingLabel(session.type);

            return (
              <div
                key={session._id}
                className="bg-gray-800/50 rounded-lg p-4 relative border border-gray-700"
              >
                {/* Delete button */}
                {!isQuickMode && sessions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSession(session._id)}
                    className="absolute top-2 right-2 text-gray-500 hover:text-red-400 p-1"
                    title="Remove session"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}

                {/* Session number */}
                <div className="text-xs text-gray-500 mb-3">Session {index + 1}</div>

                {/* Type and Duration */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Type</label>
                    <select
                      value={session.type}
                      onChange={(e) => {
                        const newType = e.target.value as TrainingType;
                        updateSession(session._id, {
                          type: newType,
                          durationMin: newType === 'rest' ? 0 : session.durationMin || 30,
                          perceivedIntensity:
                            newType === 'rest'
                              ? undefined
                              : session.perceivedIntensity ??
                                (isQuickMode ? globalRpe : undefined),
                        });
                      }}
                      disabled={isQuickMode}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0.5rem center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1.25em 1.25em',
                      }}
                    >
                      {TRAINING_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Duration</label>
                    <input
                      type="number"
                      value={session.type === 'rest' ? '' : session.durationMin}
                      onChange={(e) =>
                        updateSession(session._id, { durationMin: parseInt(e.target.value) || 0 })
                      }
                      disabled={isQuickMode || session.type === 'rest'}
                      placeholder={session.type === 'rest' ? 'N/A' : 'min'}
                      min={0}
                      max={480}
                      step={5}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Intensity */}
                {session.type !== 'rest' && (
                  <div className="mb-4">
                    {isQuickMode ? (
                      <p className="text-xs text-gray-400">
                        Global RPE {globalRpe} applied.
                      </p>
                    ) : (
                      <IntensitySelector
                        value={session.perceivedIntensity}
                        onChange={(val) => updateSession(session._id, { perceivedIntensity: val })}
                        disabled={saving}
                      />
                    )}
                    <div className="mt-2 text-xs text-gray-400">
                      {trainingLabel} - {session.durationMin}m - RPE {rpeValue}
                      {isEstimatedRpe && <span className="text-gray-500"> (default)</span>}
                      <span className={`ml-2 ${loadTone.className}`}>
                        Load: {loadScore} ({loadTone.label})
                      </span>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Notes</label>
                  <textarea
                    value={session.notes || ''}
                    onChange={(e) => updateSession(session._id, { notes: e.target.value })}
                    placeholder="How did it feel? Any observations..."
                    rows={2}
                    disabled={isQuickMode}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Planned comparison */}
                {getPlannedComparison(index)}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white text-sm transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-white hover:bg-gray-200 rounded-lg text-black text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Workout'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
