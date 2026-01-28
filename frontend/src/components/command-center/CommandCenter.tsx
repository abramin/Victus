import { useCallback, useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type {
  DailyLog,
  UserProfile,
  CreateDailyLogRequest,
  ActualTrainingSession,
  NutritionPlan,
  TrainingSession,
  SolverSolution,
  ScheduledSession,
  SessionExercise,
} from '../../api/types';
import { addConsumedMacros, getPlannedSessions, getTrainingProgram } from '../../api/client';
import { useCheckinState } from '../../hooks/useCheckinState';
import { useFluxNotification } from '../../hooks/useFluxNotification';
import { useActiveInstallation } from '../../contexts/ActiveInstallationContext';
import { MorningCheckinModal, type CheckinData } from './MorningCheckinModal';
import { StatusZone } from './StatusZone';
import { MissionZone } from './MissionZone';
import { FuelZone } from './FuelZone';
import { SetupAlertCard } from './SetupAlertCard';
import { WeeklyStrategyModal } from '../metabolic/WeeklyStrategyModal';
import { TrainingOverrideAlert } from '../cns';
import { staggerContainer, fadeInUp } from '../../lib/animations';

interface CommandCenterProps {
  profile: UserProfile;
  log: DailyLog | null;
  yesterdayLog?: DailyLog | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  activePlan: NutritionPlan | null;
  onCreate: (data: CreateDailyLogRequest) => Promise<DailyLog | null>;
  onReplace?: (data: CreateDailyLogRequest) => Promise<DailyLog | null>;
  onUpdateActual?: (sessions: Omit<ActualTrainingSession, 'sessionOrder'>[]) => Promise<DailyLog | null>;
  onRefresh?: () => void;
}

export function CommandCenter({
  profile,
  log,
  yesterdayLog,
  loading,
  saving,
  error,
  activePlan,
  onCreate,
  onReplace,
  onUpdateActual,
  onRefresh,
}: CommandCenterProps) {
  const { shouldShowModal, dismissModal, resetDismissal } = useCheckinState({
    hasLogToday: log !== null,
    loading,
  });

  // Error state for meal logging
  const [mealLogError, setMealLogError] = useState<string | null>(null);

  // Handler for logging a solver solution (meal)
  const handleLogSolution = useCallback(async (solution: SolverSolution) => {
    if (!log) return;

    setMealLogError(null);
    try {
      await addConsumedMacros(log.date, {
        calories: Math.round(solution.totalMacros.caloriesKcal),
        proteinG: Math.round(solution.totalMacros.proteinG),
        carbsG: Math.round(solution.totalMacros.carbsG),
        fatG: Math.round(solution.totalMacros.fatG),
      });
      // Refresh the log to show updated consumed macros
      onRefresh?.();
    } catch (err) {
      console.error('Failed to log meal:', err);
      setMealLogError('Failed to log meal. Please try again.');
    }
  }, [log, onRefresh]);

  // Flux Engine notification
  const {
    notification: fluxNotification,
    dismiss: dismissFluxNotification,
  } = useFluxNotification();

  // Track whether to show the Flux notification modal
  const [showFluxModal, setShowFluxModal] = useState(false);

  // Track whether to show the edit check-in modal
  const [showEditCheckin, setShowEditCheckin] = useState(false);

  // Show Flux modal when notification arrives (only if check-in modal isn't showing)
  useEffect(() => {
    if (fluxNotification && !shouldShowModal && log) {
      setShowFluxModal(true);
    }
  }, [fluxNotification, shouldShowModal, log]);

  const handleFluxAccept = useCallback(() => {
    if (fluxNotification) {
      dismissFluxNotification(fluxNotification.id);
      setShowFluxModal(false);
    }
  }, [fluxNotification, dismissFluxNotification]);

  const handleFluxIgnore = useCallback(() => {
    if (fluxNotification) {
      dismissFluxNotification(fluxNotification.id);
      setShowFluxModal(false);
    }
  }, [fluxNotification, dismissFluxNotification]);

  // Get sessions from active program installation
  const { installation: activeInstallation, sessionsByDate } = useActiveInstallation();

  // Fetch planned sessions from workout planner (always, not just when no log)
  const [workoutPlannerSessions, setWorkoutPlannerSessions] = useState<TrainingSession[]>([]);

  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const controller = new AbortController();

    getPlannedSessions(todayStr, controller.signal)
      .then((sessions) => {
        setWorkoutPlannerSessions(sessions.map(s => ({
          type: s.trainingType,
          durationMin: s.durationMin,
        })));
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.warn('Failed to fetch planned sessions:', err);
        }
      });

    return () => controller.abort();
  }, []);

  // Get today's program sessions and convert to TrainingSession format
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const programSessions = useMemo((): TrainingSession[] => {
    const todaySessions = sessionsByDate.get(todayStr);
    if (!todaySessions || todaySessions.length === 0) return [];
    return todaySessions.map(s => ({
      type: s.trainingType,
      durationMin: s.durationMin,
    }));
  }, [sessionsByDate, todayStr]);

  // Combine all session sources: (program + workout planner) > log > default rest
  // Priority: planner/program sessions are the "source of truth" for what's planned
  const effectivePlannedSessions = useMemo((): TrainingSession[] => {
    // Combine program sessions + workout planner sessions (avoiding duplicates)
    const combined: TrainingSession[] = [...programSessions];
    for (const wpSession of workoutPlannerSessions) {
      if (!combined.some(s => s.type === wpSession.type && s.durationMin === wpSession.durationMin)) {
        combined.push(wpSession);
      }
    }
    // If we have sessions from planner/program, use them
    if (combined.length > 0) {
      return combined;
    }
    // Fall back to log's sessions if no planner/program sessions
    if (log?.plannedTrainingSessions && log.plannedTrainingSessions.length > 0) {
      return log.plannedTrainingSessions;
    }
    // Default to rest
    return [{ type: 'rest', durationMin: 0 }];
  }, [log, programSessions, workoutPlannerSessions]);

  // Resolve today's scheduled program session (with exercises) from active installation
  const [todaysProgramSession, setTodaysProgramSession] = useState<{
    scheduledSession: ScheduledSession;
    exercises: SessionExercise[];
  } | null>(null);

  useEffect(() => {
    if (!activeInstallation || !log) {
      setTodaysProgramSession(null);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const todaySessions = sessionsByDate.get(today);
    if (!todaySessions || todaySessions.length === 0) {
      setTodaysProgramSession(null);
      return;
    }

    const controller = new AbortController();
    const scheduledSession = todaySessions[0];

    getTrainingProgram(activeInstallation.programId, controller.signal)
      .then((program) => {
        if (controller.signal.aborted) return;
        // Find the matching day by weekNumber and dayNumber
        const week = program.weeks?.find((w) => w.weekNumber === scheduledSession.weekNumber);
        const day = week?.days.find((d) => d.dayNumber === scheduledSession.dayNumber);
        if (day?.sessionExercises && day.sessionExercises.length > 0) {
          setTodaysProgramSession({ scheduledSession, exercises: day.sessionExercises });
        } else {
          setTodaysProgramSession(null);
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.warn('Failed to resolve program session exercises:', err);
        }
      });

    return () => controller.abort();
  }, [activeInstallation, sessionsByDate, log]);

  const handleCheckinComplete = useCallback(
    async (data: CheckinData) => {
      const request: CreateDailyLogRequest = {
        weightKg: data.weightKg,
        sleepQuality: data.sleepQuality,
        sleepHours: data.sleepHours,
        hrvMs: data.hrvMs,
        restingHeartRate: data.restingHeartRate,
        dayType: data.dayType,
        plannedTrainingSessions: data.plannedTrainingSessions,
      };

      const result = await onCreate(request);
      if (result) {
        dismissModal();
      }
    },
    [onCreate, dismissModal]
  );

  // Handler for edit check-in completion
  const handleEditCheckinComplete = useCallback(
    async (data: CheckinData) => {
      const request: CreateDailyLogRequest = {
        weightKg: data.weightKg,
        sleepQuality: data.sleepQuality,
        sleepHours: data.sleepHours,
        hrvMs: data.hrvMs,
        restingHeartRate: data.restingHeartRate,
        dayType: data.dayType,
        plannedTrainingSessions: data.plannedTrainingSessions,
      };

      // Use replace when editing an existing log, fallback to create
      const handler = onReplace ?? onCreate;
      const result = await handler(request);
      if (result) {
        setShowEditCheckin(false);
      }
    },
    [onCreate, onReplace]
  );

  // Prepare initial data from current log for edit mode
  const editInitialData = log ? {
    weightKg: log.weightKg,
    sleepHours: log.sleepHours ?? 7,
    sleepQuality: log.sleepQuality ?? 70,
    hrvMs: log.hrvMs,
    restingHeartRate: log.restingHeartRate,
    dayType: log.dayType,
  } : undefined;

  const handleToggleSession = useCallback(
    (session: TrainingSession, completed: boolean) => {
      if (!onUpdateActual || !log) return;

      const currentActual = log.actualTrainingSessions ?? [];

      if (completed) {
        const newActual: Omit<ActualTrainingSession, 'sessionOrder'>[] = [
          ...currentActual.map(({ sessionOrder, ...rest }) => rest),
          { type: session.type, durationMin: session.durationMin },
        ];
        onUpdateActual(newActual);
      } else {
        const newActual = currentActual
          .filter(
            (actual) =>
              !(actual.type === session.type && actual.durationMin === session.durationMin)
          )
          .map(({ sessionOrder, ...rest }) => rest);
        onUpdateActual(newActual);
      }
    },
    [onUpdateActual, log]
  );

  const today = new Date();
  const todayLabel = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Determine which setup alerts to show
  const showStrategyAlert = !activePlan;

  return (
    <div className="p-6" data-testid="command-center">
      {/* Morning Check-In Modal */}
      <MorningCheckinModal
        isOpen={shouldShowModal}
        onComplete={handleCheckinComplete}
        profile={profile}
        plannedSessions={effectivePlannedSessions}
        yesterdayHrv={yesterdayLog?.hrvMs}
        saving={saving}
      />

      {/* Edit Check-In Modal */}
      <MorningCheckinModal
        isOpen={showEditCheckin}
        onComplete={handleEditCheckinComplete}
        onClose={() => setShowEditCheckin(false)}
        profile={profile}
        plannedSessions={effectivePlannedSessions}
        saving={saving}
        mode="edit"
        initialData={editInitialData}
      />

      {/* Weekly Strategy Update Modal (Flux Engine) */}
      {fluxNotification && (
        <WeeklyStrategyModal
          isOpen={showFluxModal}
          onClose={() => setShowFluxModal(false)}
          notification={fluxNotification}
          onAccept={handleFluxAccept}
          onIgnore={handleFluxIgnore}
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Command Center</h1>
        <p className="text-gray-400 text-sm">{todayLabel}</p>
      </div>

      {/* Setup Alerts */}
      {showStrategyAlert && (
        <div className="mb-6">
          <SetupAlertCard type="strategy" />
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-800 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Main Content - 3 Zone Layout */}
      {!loading && log && (
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-5 gap-6"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          {/* Left Column (60%) - Status + Mission */}
          <motion.div className="lg:col-span-3 space-y-4" variants={fadeInUp}>
            {/* Zone A: Status */}
            <StatusZone
              recoveryScore={log.recoveryScore}
              cnsStatus={log.cnsStatus}
              sleepHours={log.sleepHours}
              sleepQuality={log.sleepQuality}
              profile={profile}
              log={log}
              yesterdayLog={yesterdayLog}
              onEdit={() => setShowEditCheckin(true)}
            />

            {/* Training Override Alert (when CNS depleted) */}
            {log.trainingOverrides && log.trainingOverrides.length > 0 && (
              <TrainingOverrideAlert overrides={log.trainingOverrides} />
            )}

            {/* Zone B: Mission */}
            <MissionZone
              plannedSessions={effectivePlannedSessions}
              actualSessions={log.actualTrainingSessions}
              trainingSummary={log.trainingSummary}
              onToggleSession={handleToggleSession}
              saving={saving}
              programSession={todaysProgramSession}
              logDate={log.date}
            />
          </motion.div>

          {/* Right Column (40%) - Fuel */}
          <motion.div className="lg:col-span-2 space-y-4" variants={fadeInUp}>
            {/* Meal Log Error */}
            {mealLogError && (
              <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg">
                <p className="text-red-400 text-sm">{mealLogError}</p>
              </div>
            )}
            {/* Zone C: Fuel */}
            <FuelZone
              targets={log.calculatedTargets}
              dayType={log.dayType}
              consumedCalories={log.consumedCalories}
              consumedProteinG={log.consumedProteinG}
              consumedCarbsG={log.consumedCarbsG}
              consumedFatG={log.consumedFatG}
              onLogSolution={handleLogSolution}
            />
          </motion.div>
        </motion.div>
      )}

      {/* No Log Yet - Prompt to check in */}
      {!loading && !log && !shouldShowModal && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">☀️</div>
          <h2 className="text-xl font-medium text-white mb-2">Start Your Day</h2>
          <p className="text-gray-400 mb-6">
            Complete your morning check-in to unlock today's mission
          </p>
          <button
            type="button"
            onClick={resetDismissal}
            className="px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Begin Check-In
          </button>
        </div>
      )}
    </div>
  );
}
