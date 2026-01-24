import { useState, useEffect, useCallback, useRef } from 'react';
import { IntensitySelector } from './IntensitySelector';
import { ActualVsPlannedComparison } from './ActualVsPlannedComparison';
import type { DailyLog, ActualTrainingSession, TrainingSession, TrainingType } from '../../api/types';
import { TRAINING_LABELS } from '../../constants';

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

const getSessionPerceivedIntensity = (
  session: TrainingSession | ActualTrainingSession
): number | undefined => {
  if ('perceivedIntensity' in session) {
    return session.perceivedIntensity;
  }
  return undefined;
};

const getSessionLoadScore = (session: ActualTrainingSession) => {
  if (session.type === 'rest') return 0;
  const rpeValue = session.perceivedIntensity ?? DEFAULT_RPE;
  return Math.round(session.durationMin * rpeValue);
};

const getTrainingLabel = (type: TrainingType) =>
  TRAINING_OPTIONS.find((option) => option.value === type)?.label ?? type;

const getLoadTone = (score: number) => {
  if (score <= 0) return { label: 'No Load', className: 'text-gray-500' };
  if (score <= 60) return { label: 'Very Low', className: 'text-emerald-400' };
  if (score <= 120) return { label: 'Low Stress', className: 'text-green-400' };
  if (score <= 200) return { label: 'Moderate Stress', className: 'text-yellow-400' };
  if (score <= 300) return { label: 'High Stress', className: 'text-orange-400' };
  return { label: 'Max Stress', className: 'text-red-400' };
};

const getDailyLoadTone = (score: number) => {
  if (score <= 0) return { label: 'Rest Day', className: 'text-gray-400' };
  if (score <= 150) return { label: 'Light Day', className: 'text-emerald-300' };
  if (score <= 300) return { label: 'Moderate Day', className: 'text-yellow-300' };
  if (score <= 450) return { label: 'Hard Day', className: 'text-orange-300' };
  return { label: 'Max Day', className: 'text-red-400' };
};

const EVENING_START_HOUR = 18;

const isAfterEvening = (date: Date) => date.getHours() >= EVENING_START_HOUR;

const getTrainingAdherence = (
  planned: TrainingSession[],
  actual?: ActualTrainingSession[]
) => {
  if (!actual || actual.length === 0) {
    return { label: 'Pending', isExact: false };
  }

  const plannedTotal = planned.reduce((sum, s) => sum + s.durationMin, 0);
  const actualTotal = actual.reduce((sum, s) => sum + s.durationMin, 0);
  const hasChanges =
    planned.length !== actual.length ||
    plannedTotal !== actualTotal ||
    planned.some((p, i) => actual[i]?.type !== p.type);

  if (!hasChanges) {
    return { label: '100% Adherence', isExact: true };
  }

  const diffMinutes = actualTotal - plannedTotal;
  const label =
    diffMinutes === 0
      ? 'Adjusted vs Plan'
      : `${diffMinutes > 0 ? '+' : ''}${diffMinutes} min vs plan`;

  return { label, isExact: false };
};

interface LogWorkoutViewProps {
  log: DailyLog | null;
  onUpdateActual: (sessions: Omit<ActualTrainingSession, 'sessionOrder'>[]) => Promise<DailyLog | null>;
  saving: boolean;
}

export function LogWorkoutView({ log, onUpdateActual, saving }: LogWorkoutViewProps) {
  const [sessions, setSessions] = useState<SessionWithId[]>([]);
  const [mode, setMode] = useState<'quick' | 'detail'>('detail');
  const [globalRpe, setGlobalRpe] = useState(DEFAULT_RPE);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [isWorkoutExpanded, setIsWorkoutExpanded] = useState(() => isAfterEvening(new Date()));
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState<Record<string, boolean>>({});
  const idCounterRef = useRef(0);

  const generateId = useCallback(() => {
    idCounterRef.current += 1;
    return `session-${idCounterRef.current}`;
  }, []);

  // Initialize sessions from log
  useEffect(() => {
    if (!log) return;

    idCounterRef.current = 0;
    const baseSessions =
      log.actualTrainingSessions && log.actualTrainingSessions.length > 0
        ? log.actualTrainingSessions
        : log.plannedTrainingSessions;

    setSessions(
      baseSessions.map((session) => ({
        _id: generateId(),
        type: session.type,
        durationMin: session.durationMin,
        perceivedIntensity: getSessionPerceivedIntensity(session),
        notes: session.notes ?? '',
      }))
    );
    setHasUnsavedChanges(false);
  }, [log, generateId]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isAfterEvening(now)) {
      setIsWorkoutExpanded(true);
    }
  }, [now]);

  useEffect(() => {
    setNotesExpanded((prev) => {
      const next: Record<string, boolean> = {};
      sessions.forEach((session) => {
        const hasNotes = (session.notes ?? '').trim().length > 0;
        next[session._id] = prev[session._id] ?? hasNotes;
      });
      return next;
    });
  }, [sessions]);

  const updateSession = useCallback((id: string, updates: Partial<ActualTrainingSession>) => {
    setSessions((prev) =>
      prev.map((s) => (s._id === id ? { ...s, ...updates } : s))
    );
    setHasUnsavedChanges(true);
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
    setHasUnsavedChanges(true);
  }, [sessions.length, generateId, mode, globalRpe]);

  const removeSession = useCallback((id: string) => {
    setSessions((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((s) => s._id !== id);
    });
    setHasUnsavedChanges(true);
  }, []);

  const isQuickMode = mode === 'quick';

  useEffect(() => {
    if (!isQuickMode) return;
    setSessions((prev) =>
      prev.map((session) =>
        session.type === 'rest'
          ? { ...session, perceivedIntensity: undefined }
          : { ...session, perceivedIntensity: globalRpe }
      )
    );
  }, [globalRpe, isQuickMode]);

  const handleSave = async () => {
    const sessionsWithoutId = sessions.map(({ _id, ...rest }) => rest);
    const result = await onUpdateActual(sessionsWithoutId);
    if (result) {
      setHasUnsavedChanges(false);
    }
  };

  const handleQuickComplete = () => {
    if (!log) return;
    setMode('quick');
    idCounterRef.current = 0;
    setSessions(
      log.plannedTrainingSessions.map((session) => ({
        _id: generateId(),
        type: session.type,
        durationMin: session.durationMin,
        perceivedIntensity: session.type === 'rest' ? undefined : DEFAULT_RPE,
        notes: '',
      }))
    );
    setHasUnsavedChanges(true);
  };

  const handleGlobalRpeChange = (value: number | undefined) => {
    setGlobalRpe(value ?? DEFAULT_RPE);
    setHasUnsavedChanges(true);
  };

  const hasActiveSessions = sessions.some((session) => session.type !== 'rest');
  const sessionCount = sessions.length;
  const totalDurationMin = sessions.reduce((sum, session) => sum + session.durationMin, 0);
  const actualSessionCount = log?.actualTrainingSessions?.length ?? 0;
  const actualDurationTotal =
    log?.actualTrainingSessions?.reduce((sum, session) => sum + session.durationMin, 0) ?? 0;
  const loggedSessionCount = sessionCount || actualSessionCount;
  const loggedDurationMin = totalDurationMin || actualDurationTotal;
  const hasActualTraining = actualSessionCount > 0;
  const adherence = log
    ? getTrainingAdherence(log.plannedTrainingSessions, log.actualTrainingSessions)
    : null;
  const loadSource = sessionCount > 0 ? sessions : log?.actualTrainingSessions ?? [];
  const totalLoadScore = loadSource.reduce((sum, session) => sum + getSessionLoadScore(session), 0);
  const totalLoadTone = getDailyLoadTone(totalLoadScore);
  const isEvening = isAfterEvening(now);
  const shouldShowWorkoutDetails = isEvening || isWorkoutExpanded || hasActualTraining;
  const shouldCollapseDetails = hasActualTraining && Boolean(adherence?.isExact);

  useEffect(() => {
    if (!log) {
      setIsDetailsCollapsed(false);
      return;
    }
    setIsDetailsCollapsed(shouldCollapseDetails);
  }, [log, shouldCollapseDetails]);

  const todayLabel = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // No log exists - show locked state
  if (!log) {
    return (
      <div className="p-6 max-w-4xl" data-testid="log-workout-view">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white">Log Workout</h1>
          <p className="text-gray-400 text-sm">{todayLabel}</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="text-center py-8">
            <svg
              className="w-16 h-16 mx-auto text-gray-700 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <h2 className="text-lg font-semibold text-white mb-2">Complete Morning Check-in First</h2>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              Log your morning weight and planned training in the Daily Update to unlock workout logging.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl" data-testid="log-workout-view">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Log Workout</h1>
          <p className="text-gray-400 text-sm">{todayLabel}</p>
        </div>
        {shouldShowWorkoutDetails && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2 ${
                hasUnsavedChanges
                  ? 'bg-white text-black hover:bg-gray-200'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {saving ? (
                'Saving...'
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Workout
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {!shouldShowWorkoutDetails ? (
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setIsWorkoutExpanded(true)}
            className="w-full flex items-center justify-between gap-4 bg-gray-900/60 border border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-200 hover:text-white hover:border-gray-700 transition-colors"
          >
            <span className="font-medium">Log Workout (Evening)</span>
            <span className="text-xs text-gray-500">Available after 6 PM</span>
          </button>
        </div>
      ) : (
        <>
          {/* Status Banner */}
          <div className={`rounded-xl p-4 border mb-6 ${
            hasActualTraining ? 'bg-emerald-900/20 border-emerald-800' : 'bg-gray-900 border-gray-800'
          }`}>
            {hasActualTraining ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-emerald-100">
                    <svg className="w-4 h-4 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Training Logged: {adherence?.label ?? 'Logged'}</span>
                    <span className={`text-xs font-semibold ${totalLoadTone.className}`}>
                      Load: {totalLoadScore} ({totalLoadTone.label})
                    </span>
                  </div>
                  <p className="text-xs text-emerald-200/70 mt-1">
                    Logged: {loggedSessionCount} session{loggedSessionCount !== 1 ? 's' : ''}, {loggedDurationMin} min
                  </p>
                </div>
                {isDetailsCollapsed && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailsCollapsed(false);
                      setMode('detail');
                    }}
                    className="text-xs text-emerald-100/80 hover:text-white border border-emerald-800/60 px-3 py-1.5 rounded-full transition-colors"
                    disabled={saving}
                  >
                    Edit Details
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">No workout logged yet</p>
                  <div className="mt-2">
                    <ActualVsPlannedComparison
                      planned={log.plannedTrainingSessions}
                      actual={log.actualTrainingSessions}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleQuickComplete}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg font-medium bg-white text-black hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Yes, All Complete
                </button>
              </div>
            )}
          </div>

          {/* Planned Training Reference */}
          <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800 mb-6">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Planned Training</h3>
            <div className="flex flex-wrap gap-2">
              {log.plannedTrainingSessions.length === 0 ||
              log.plannedTrainingSessions.every((s) => s.type === 'rest') ? (
                <span className="text-sm text-gray-500">Rest day</span>
              ) : (
                log.plannedTrainingSessions
                  .filter((s) => s.type !== 'rest')
                  .map((session, index) => (
                    <span
                      key={`planned-${session.type}-${index}`}
                      className="px-3 py-1.5 bg-gray-800 rounded-lg text-sm text-gray-300"
                    >
                      {TRAINING_LABELS[session.type]} {session.durationMin}m
                    </span>
                  ))
              )}
            </div>
          </div>

          {isDetailsCollapsed ? (
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-400">Logged Sessions</h3>
                <span className="text-xs text-gray-500">{loggedDurationMin} min total</span>
              </div>
              <div className="space-y-2">
                {sessions.length === 0 ? (
                  <span className="text-sm text-gray-500">No sessions logged.</span>
                ) : (
                  sessions.map((session, index) => {
                    const rpeValue =
                      session.type === 'rest'
                        ? DEFAULT_RPE
                        : session.perceivedIntensity ?? DEFAULT_RPE;
                    const loadScore = getSessionLoadScore(session);
                    const loadTone = getLoadTone(loadScore);
                    const trainingLabel = getTrainingLabel(session.type);

                    return (
                      <div
                        key={`summary-${session._id}`}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm"
                      >
                        <div className="flex flex-wrap items-center gap-2 text-gray-200">
                          <span className="text-xs text-gray-500">Session {index + 1}</span>
                          <span className="font-medium">{trainingLabel}</span>
                          {session.type !== 'rest' && (
                            <>
                              <span className="text-gray-500">•</span>
                              <span className="text-gray-400">{session.durationMin} min</span>
                              <span className="text-gray-500">•</span>
                              <span className="text-gray-400">RPE {rpeValue}</span>
                            </>
                          )}
                        </div>
                        {session.type !== 'rest' && (
                          <span className={`text-xs ${loadTone.className}`}>Load {loadScore}</span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Quick Mode Banner */}
              {isQuickMode && (
                <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 mb-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-white font-medium">Quick mode: All sessions marked complete</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Set one intensity for today. Switch to detail mode to edit individual sessions.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMode('detail')}
                      className="text-xs text-gray-400 hover:text-white whitespace-nowrap"
                      disabled={saving}
                    >
                      Edit details
                    </button>
                  </div>
                  {hasActiveSessions && (
                    <div className="mt-4">
                      <IntensitySelector
                        value={globalRpe}
                        onChange={handleGlobalRpeChange}
                        disabled={saving}
                        allowClear={false}
                      />
                      <p className="text-xs text-gray-500 mt-2">Applies to all non-rest sessions.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Sessions Summary */}
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-400 text-sm">
                  {!hasActiveSessions
                    ? 'Rest day'
                    : `${sessionCount} session${sessionCount > 1 ? 's' : ''}, ${totalDurationMin} min total`}
                </span>
                {!isQuickMode && sessionCount < 10 && (
                  <button
                    type="button"
                    onClick={addSession}
                    className="text-sm text-white hover:text-gray-300 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Session
                  </button>
                )}
              </div>

              {/* Session List */}
              <div className="space-y-4">
                {sessions.map((session, index) => {
                  const rpeValue =
                    session.type === 'rest' ? DEFAULT_RPE : session.perceivedIntensity ?? DEFAULT_RPE;
                  const loadScore = getSessionLoadScore(session);
                  const loadTone = getLoadTone(loadScore);
                  const isEstimatedRpe =
                    session.type !== 'rest' && session.perceivedIntensity === undefined;
                  const trainingLabel = getTrainingLabel(session.type);
                  const hasNotes = (session.notes ?? '').trim().length > 0;
                  const isNotesVisible = notesExpanded[session._id] || hasNotes;

                  return (
                    <div
                      key={session._id}
                      className="bg-gray-900 rounded-xl p-4 border border-gray-800 relative"
                    >
                      {/* Delete button */}
                      {!isQuickMode && sessions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSession(session._id)}
                          className="absolute top-3 right-3 text-gray-500 hover:text-red-400 p-1"
                          title="Remove session"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}

                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs text-gray-500">Session {index + 1}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {isQuickMode ? (
                              <span className="text-sm font-medium text-gray-100">{trainingLabel}</span>
                            ) : (
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
                                aria-label="Session type"
                                className="h-8 pl-2 pr-7 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                            )}
                            <span className="text-gray-500">•</span>
                            {isQuickMode ? (
                              <span className="text-sm text-gray-400">
                                {session.type === 'rest' ? 'Rest day' : `${session.durationMin} min`}
                              </span>
                            ) : (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  value={session.type === 'rest' ? '' : session.durationMin}
                                  onChange={(e) =>
                                    updateSession(session._id, {
                                      durationMin: parseInt(e.target.value) || 0,
                                    })
                                  }
                                  disabled={session.type === 'rest'}
                                  placeholder={session.type === 'rest' ? 'N/A' : 'min'}
                                  min={0}
                                  max={480}
                                  step={5}
                                  aria-label="Duration in minutes"
                                  className="h-8 w-16 px-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <span className="text-xs text-gray-500">min</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Intensity */}
                      {session.type !== 'rest' && (
                        <div className="mt-3">
                          {isQuickMode ? (
                            <p className="text-xs text-gray-400">Global RPE {globalRpe} applied.</p>
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
                      {isNotesVisible ? (
                        <div className="mt-3">
                          <label className="block text-sm text-gray-400 mb-2">Notes</label>
                          <textarea
                            value={session.notes || ''}
                            onChange={(e) => updateSession(session._id, { notes: e.target.value })}
                            placeholder="How did it feel? Any observations..."
                            rows={2}
                            disabled={isQuickMode}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                      ) : (
                        !isQuickMode && (
                          <button
                            type="button"
                            onClick={() =>
                              setNotesExpanded((prev) => ({ ...prev, [session._id]: true }))
                            }
                            className="mt-3 text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={saving}
                          >
                            + Add Note
                          </button>
                        )
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Save Button */}
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !hasUnsavedChanges}
                  className={`px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2 ${
                    hasUnsavedChanges ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {saving ? (
                    'Saving...'
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Workout
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
