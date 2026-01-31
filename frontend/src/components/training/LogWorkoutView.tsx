import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RadialIntensitySelector } from './RadialIntensitySelector';
import { SessionReceipt } from './SessionReceipt';
import { SessionCard } from './SessionCard';
import { AtomicSessionCard } from './AtomicSessionCard';
import { ActualVsPlannedComparison } from './ActualVsPlannedComparison';
import { ArchetypeSelector } from '../body-map/ArchetypeSelector';
import { SessionReportModal } from '../body-map/SessionReportModal';
import { extractIssuesFromTokens } from '../semantic';
import { useSemanticFeedbackOptional } from '../../contexts/SemanticFeedbackContext';
import { applyFatigue, createBodyIssues, quickSubmitSession } from '../../api/client';
import type { DailyLog, ActualTrainingSession, TrainingSession, TrainingType, Archetype, SessionFatigueReport, SessionResponse } from '../../api/types';
import type { SemanticToken } from '../semantic/semanticDictionary';
import { TRAINING_LABELS } from '../../constants';
import { formatNumber } from '../../utils/format';
import { DraftSessionCard } from './DraftSessionCard';

type SessionWithId = Omit<ActualTrainingSession, 'sessionOrder'> & {
  _id: string;
  committed: boolean;
  archetype?: Archetype;
};

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
  const loadScore = TRAINING_LOAD_SCORES[session.type] ?? 1;
  const durationFactor = session.durationMin / 60;
  const rpeValue = session.perceivedIntensity ?? DEFAULT_RPE;
  const rpeFactor = rpeValue / 3;
  // Round to 2 decimal places for display
  return Math.round(loadScore * durationFactor * rpeFactor * 100) / 100;
};

const getTrainingLabel = (type: TrainingType) =>
  TRAINING_OPTIONS.find((option) => option.value === type)?.label ?? type;

const getLoadTone = (score: number) => {
  if (score <= 0) return { label: 'No Load', className: 'text-gray-500' };
  if (score <= 1) return { label: 'Very Low', className: 'text-emerald-400' };
  if (score <= 3) return { label: 'Low Stress', className: 'text-green-400' };
  if (score <= 6) return { label: 'Moderate Stress', className: 'text-yellow-400' };
  if (score <= 10) return { label: 'High Stress', className: 'text-orange-400' };
  return { label: 'Max Stress', className: 'text-red-400' };
};

const getDailyLoadTone = (score: number) => {
  if (score <= 0) return { label: 'Rest Day', className: 'text-gray-400' };
  if (score <= 3) return { label: 'Light Day', className: 'text-emerald-300' };
  if (score <= 8) return { label: 'Moderate Day', className: 'text-yellow-300' };
  if (score <= 15) return { label: 'Hard Day', className: 'text-orange-300' };
  return { label: 'Max Day', className: 'text-red-400' };
};

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
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(false);
  const [selectedArchetype, setSelectedArchetype] = useState<Archetype | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [savedLoadScore, setSavedLoadScore] = useState(0);
  const [fatigueReport, setFatigueReport] = useState<SessionFatigueReport | null>(null);
  const [showFatigueReport, setShowFatigueReport] = useState(false);
  const [sessionTokens, setSessionTokens] = useState<Record<string, SemanticToken[]>>({});
  const [draftSessions, setDraftSessions] = useState<SessionResponse[]>([]);
  const idCounterRef = useRef(0);
  const notesContainerRef = useRef<HTMLDivElement>(null);
  const semanticFeedback = useSemanticFeedbackOptional();
  const [searchParams] = useSearchParams();
  const urlParamsConsumed = useRef(false);

  const generateId = useCallback(() => {
    idCounterRef.current += 1;
    return `session-${idCounterRef.current}`;
  }, []);

  // Initialize sessions from log, consuming URL params only once on first mount
  useEffect(() => {
    if (!log) return;

    idCounterRef.current = 0;

    const paramType = searchParams.get('type');
    const paramDuration = searchParams.get('duration');

    if (paramType && paramDuration && !urlParamsConsumed.current) {
      // First mount with URL params: preserve existing actuals, prepend the new session
      urlParamsConsumed.current = true;
      const existingSessions = (log.actualTrainingSessions ?? []).map((session) => ({
        _id: generateId(),
        type: session.type,
        durationMin: session.durationMin,
        perceivedIntensity: getSessionPerceivedIntensity(session),
        notes: session.notes ?? '',
        committed: true, // Existing sessions are already persisted
      }));
      setSessions([
        {
          _id: generateId(),
          type: paramType as TrainingType,
          durationMin: parseInt(paramDuration, 10),
          perceivedIntensity: DEFAULT_RPE,
          notes: '',
          committed: false, // New session from URL starts uncommitted
        },
        ...existingSessions, // Prepend: new session at top
      ]);
      setHasUnsavedChanges(true);
    } else {
      // Normal init: use actuals if present, otherwise planned sessions
      const hasActuals = log.actualTrainingSessions && log.actualTrainingSessions.length > 0;
      const baseSessions = hasActuals
        ? log.actualTrainingSessions
        : log.plannedTrainingSessions;

      setSessions(
        baseSessions.map((session) => ({
          _id: generateId(),
          type: session.type,
          durationMin: session.durationMin,
          perceivedIntensity: getSessionPerceivedIntensity(session),
          notes: session.notes ?? '',
          committed: hasActuals, // Sessions from actuals are committed, from planned are not
        }))
      );
      setHasUnsavedChanges(false);
    }
  }, [log, generateId, searchParams]);

  const updateSession = useCallback((id: string, updates: Partial<ActualTrainingSession>) => {
    setSessions((prev) =>
      prev.map((s) => (s._id === id ? { ...s, ...updates } : s))
    );
    setHasUnsavedChanges(true);
  }, []);

  const addSession = useCallback(() => {
    if (sessions.length >= 10) return;
    setSessions((prev) => [
      {
        _id: generateId(),
        type: 'walking',
        durationMin: 30,
        perceivedIntensity: mode === 'quick' ? globalRpe : undefined,
        notes: '',
        committed: false, // New sessions start uncommitted
      },
      ...prev, // Prepend: new session appears at top
    ]);
    setHasUnsavedChanges(true);
  }, [sessions.length, generateId, mode, globalRpe]);

  const removeSession = useCallback((id: string) => {
    setSessions((prev) => {
      // Allow removing the last session - empty state will show "No sessions logged"
      return prev.filter((s) => s._id !== id);
    });
    setHasUnsavedChanges(true);
  }, []);

  const commitSession = useCallback((id: string) => {
    setSessions((prev) =>
      prev.map((s) => (s._id === id ? { ...s, committed: true } : s))
    );
  }, []);

  const uncommitSession = useCallback((id: string) => {
    setSessions((prev) =>
      prev.map((s) => (s._id === id ? { ...s, committed: false } : s))
    );
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
    // Strip internal fields before sending to backend
    const sessionsForApi = sessions.map(({ _id, committed, archetype, ...rest }) => rest);
    const result = await onUpdateActual(sessionsForApi);
    if (result) {
      setHasUnsavedChanges(false);

      // Collect all semantic tokens and create body issues
      const allTokens: SemanticToken[] = [];
      const allIssues: Array<{ bodyPart: string; symptom: string; rawText: string }> = [];

      sessions.forEach((session) => {
        const tokens = sessionTokens[session._id] || [];
        if (tokens.length > 0 && session.notes) {
          allTokens.push(...tokens);
          const issues = extractIssuesFromTokens(session.notes, tokens);
          allIssues.push(...issues);
        }
      });

      // If we have semantic detections, call the body issues API and trigger animation
      if (allIssues.length > 0 && log?.date) {
        try {
          await createBodyIssues({
            date: log.date,
            issues: allIssues,
          });

          // Trigger the particle animation
          if (semanticFeedback && notesContainerRef.current && allTokens.length > 0) {
            semanticFeedback.triggerAnimation(allTokens, notesContainerRef.current);
          }
        } catch (err) {
          console.error('Failed to save body issues:', err);
        }
      }

      // Apply fatigue if archetype selected
      const activeSessions = sessions.filter((s) => s.type !== 'rest');
      const totalDuration = Math.min(
        activeSessions.reduce((sum, s) => sum + s.durationMin, 0),
        480
      );
      const rpeValues = activeSessions.map((s) => s.perceivedIntensity ?? DEFAULT_RPE);
      const avgRpe = rpeValues.length > 0
        ? Math.round(rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length)
        : DEFAULT_RPE;

      if (selectedArchetype && totalDuration > 0) {
        try {
          const report = await applyFatigue({
            archetype: selectedArchetype,
            durationMin: totalDuration,
            rpe: avgRpe,
          });
          setFatigueReport(report);
          setShowFatigueReport(true);
        } catch (error) {
          console.error('Failed to apply fatigue:', error);
          const totalLoad = sessions.reduce((sum, session) => sum + getSessionLoadScore(session), 0);
          if (totalLoad > 0) {
            setSavedLoadScore(totalLoad);
            setShowReceipt(true);
          }
        }
      } else {
        // No archetype selected, show simple receipt
        const totalLoad = sessions.reduce((sum, session) => sum + getSessionLoadScore(session), 0);
        if (totalLoad > 0) {
          setSavedLoadScore(totalLoad);
          setShowReceipt(true);
        }
      }

      // Mark all sessions as committed after successful save
      setSessions((prev) => prev.map((s) => ({ ...s, committed: true })));

      // Create draft sessions for Echo enrichment
      if (log?.date) {
        const nonRestSessions = sessions.filter((s) => s.type !== 'rest');
        const drafts: SessionResponse[] = [];
        for (const session of nonRestSessions) {
          try {
            const draft = await quickSubmitSession(log.date, {
              type: session.type,
              durationMin: session.durationMin,
              perceivedIntensity: session.perceivedIntensity,
              notes: session.notes || undefined,
            });
            drafts.push(draft);
          } catch (err) {
            console.error('Failed to create draft session for echo:', err);
          }
        }
        if (drafts.length > 0) {
          setDraftSessions(drafts);
        }
      }
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
        committed: false, // Quick complete sessions start uncommitted
      }))
    );
    setHasUnsavedChanges(true);
  };

  const handleConfirmRestDay = async () => {
    // Log a rest session to confirm rest day
    const restSession = {
      type: 'rest' as const,
      durationMin: 0,
      perceivedIntensity: undefined,
      notes: '',
    };
    await onUpdateActual([restSession]);
  };

  const handleLogActiveRecovery = () => {
    // Pre-populate with a light activity for active recovery
    idCounterRef.current = 0;
    setSessions([
      {
        _id: generateId(),
        type: 'walking',
        durationMin: 30,
        perceivedIntensity: undefined,
        notes: '',
        committed: false, // Active recovery sessions start uncommitted
      },
    ]);
    setMode('detail');
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
  // Workout logging is always available (6 PM lock removed)
  const shouldShowWorkoutDetails = true;
  const shouldCollapseDetails = hasActualTraining && Boolean(adherence?.isExact);
  const isPlannedRestDay = log
    ? log.plannedTrainingSessions.length === 0 ||
    log.plannedTrainingSessions.every((s) => s.type === 'rest')
    : false;

  useEffect(() => {
    if (!log) {
      setIsDetailsCollapsed(false);
      return;
    }
    setIsDetailsCollapsed(shouldCollapseDetails);
  }, [log, shouldCollapseDetails]);

  const todayLabel = new Date().toLocaleDateString('en-US', {
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
      </div>

      {shouldShowWorkoutDetails && (
        <>
          {/* Status Banner */}
          <div className={`rounded-xl p-4 border mb-6 ${hasActualTraining ? 'bg-emerald-900/20 border-emerald-800' : 'bg-gray-900 border-gray-800'
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
                      Load: {formatNumber(totalLoadScore, 1)} ({totalLoadTone.label})
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
                  <p className="text-sm text-gray-400">
                    {isPlannedRestDay ? 'Rest day planned' : 'No workout logged yet'}
                  </p>
                  {!isPlannedRestDay && (
                    <div className="mt-2">
                      <ActualVsPlannedComparison
                        planned={log.plannedTrainingSessions}
                        actual={log.actualTrainingSessions}
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {isPlannedRestDay ? (
                    <>
                      <button
                        type="button"
                        onClick={handleConfirmRestDay}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg font-medium bg-gray-700 text-white hover:bg-gray-600 transition-colors disabled:opacity-50"
                      >
                        Confirm Rest Day
                      </button>
                      <button
                        type="button"
                        onClick={handleLogActiveRecovery}
                        disabled={saving}
                        className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        Or log active recovery
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleQuickComplete}
                      disabled={saving}
                      className="px-4 py-2 rounded-lg font-medium bg-white text-black hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      Yes, All Complete
                    </button>
                  )}
                </div>
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
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-400">Logged Sessions</h3>
                <span className="text-xs text-gray-500">{loggedDurationMin} min total</span>
              </div>
              <div className="space-y-3">
                {sessions.length === 0 ? (
                  <span className="text-sm text-gray-500">No sessions logged.</span>
                ) : (
                  sessions.map((session) => (
                    <SessionCard
                      key={`card-${session._id}`}
                      type={session.type}
                      durationMin={session.durationMin}
                      rpe={session.perceivedIntensity}
                      notes={session.notes}
                      onEdit={() => {
                        setIsDetailsCollapsed(false);
                        setMode('detail');
                      }}
                    />
                  ))
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
                      <RadialIntensitySelector
                        value={globalRpe}
                        onChange={handleGlobalRpeChange}
                        disabled={saving}
                      />
                      <p className="text-xs text-gray-500 mt-2 text-center">Applies to all non-rest sessions.</p>
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

              {/* Archetype Selector - above session cards */}
              {!isQuickMode && hasActiveSessions && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-400">Workout Type (Optional)</h3>
                    {selectedArchetype && (
                      <button
                        type="button"
                        onClick={() => setSelectedArchetype(null)}
                        className="text-xs text-gray-500 hover:text-gray-300"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <ArchetypeSelector
                    selected={selectedArchetype}
                    onSelect={setSelectedArchetype}
                    disabled={saving}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Select a workout type to track muscle fatigue on the Body Map.
                  </p>
                </div>
              )}

              {/* Session List */}
              <div className="space-y-4">
                {isQuickMode ? (
                  /* Quick Mode: Simple read-only cards */
                  sessions.map((session, index) => {
                    const loadScore = getSessionLoadScore(session);
                    const loadTone = getLoadTone(loadScore);
                    const trainingLabel = getTrainingLabel(session.type);

                    return (
                      <div
                        key={session._id}
                        className="bg-gray-900 rounded-xl p-4 border border-gray-800"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm font-medium text-gray-400">Session {index + 1}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <span className="px-4 py-2 bg-gray-800 rounded-lg text-sm font-medium text-white">
                            {trainingLabel}
                          </span>
                          {session.type !== 'rest' && (
                            <span className="px-4 py-2 bg-gray-800 rounded-lg text-sm text-gray-300 flex items-center gap-2">
                              <span className="text-gray-400">⏱</span>
                              {session.durationMin} min
                            </span>
                          )}
                        </div>
                        {session.type !== 'rest' && (
                          <>
                            <p className="text-center text-sm text-gray-400 my-4">
                              Global RPE {globalRpe} applied
                            </p>
                            <div className="text-center mt-6 p-3 bg-slate-800 rounded-lg border border-slate-700">
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-lg">⚡</span>
                                <span className="text-xl font-bold text-white">LOAD: {formatNumber(loadScore, 1)}</span>
                              </div>
                              <p className={`text-xs mt-1 ${loadTone.className}`}>
                                ({loadTone.label})
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
                ) : (
                  /* Detail Mode: Atomic Session Cards */
                  sessions.map((session, index) => (
                    <AtomicSessionCard
                      key={session._id}
                      session={session}
                      index={index}
                      totalCount={sessions.length}
                      saving={saving}
                      onUpdate={updateSession}
                      onCommit={commitSession}
                      onUncommit={uncommitSession}
                      onRemove={removeSession}
                      onTokensChange={(id, tokens) =>
                        setSessionTokens((prev) => ({ ...prev, [id]: tokens }))
                      }
                    />
                  ))
                )}
              </div>

              {/* Quick Mode: Bottom Save Button */}
              {isQuickMode && (
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !hasUnsavedChanges}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2 ${hasUnsavedChanges ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-700 text-gray-400'
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
            </>
          )}
        </>
      )}

      {/* Session Receipt Animation */}
      <SessionReceipt
        loadScore={savedLoadScore}
        isVisible={showReceipt}
        onComplete={() => setShowReceipt(false)}
      />

      {/* Fatigue Report Modal (when archetype selected) */}
      <SessionReportModal
        report={fatigueReport}
        isVisible={showFatigueReport}
        onClose={() => {
          setShowFatigueReport(false);
          setFatigueReport(null);
        }}
      />

      {/* Draft Sessions - Echo enrichment cards */}
      {draftSessions.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Post-Workout Echo</h4>
          {draftSessions.map((draft) => (
            <DraftSessionCard
              key={draft.id}
              session={draft}
              onUpdate={() => {
                setDraftSessions((prev) => prev.filter((d) => d.id !== draft.id));
              }}
              onFinalize={() => {
                setDraftSessions((prev) => prev.filter((d) => d.id !== draft.id));
              }}
            />
          ))}
        </div>
      )}

      {/* Floating "Commit All" FAB - Detail Mode only, deactivates after persist */}
      {/* Floating "Commit All" / "Save Changes" FAB - Detail Mode only */}
      {!isQuickMode && hasUnsavedChanges && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={`fixed bottom-6 right-6 px-6 py-3 font-medium rounded-full shadow-lg transition-all
                     flex items-center gap-2 z-50 disabled:opacity-50 ${sessions.length === 0
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
        >
          {saving ? (
            'Saving...'
          ) : (
            <>
              {sessions.length === 0 ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Confirm Deletion
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Commit All ({sessions.filter((s) => s.committed).length || sessions.length})
                </>
              )}
            </>
          )}
        </button>
      )}
    </div>
  );
}
