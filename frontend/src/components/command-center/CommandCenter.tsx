import { useCallback, useMemo, useState, useEffect } from 'react';
import type {
  DailyLog,
  UserProfile,
  CreateDailyLogRequest,
  ActualTrainingSession,
  NutritionPlan,
  TrainingSession,
  SolverSolution,
} from '../../api/types';
import { addConsumedMacros } from '../../api/client';
import { useCheckinState } from '../../hooks/useCheckinState';
import { useFluxNotification } from '../../hooks/useFluxNotification';
import { MorningCheckinModal, type CheckinData } from './MorningCheckinModal';
import { StatusZone } from './StatusZone';
import { MissionZone } from './MissionZone';
import { FuelZone } from './FuelZone';
import { SetupAlertCard } from './SetupAlertCard';
import { WeeklyStrategyModal } from '../metabolic/WeeklyStrategyModal';
import { TrainingOverrideAlert } from '../cns';

interface CommandCenterProps {
  profile: UserProfile;
  log: DailyLog | null;
  yesterdayLog?: DailyLog | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  activePlan: NutritionPlan | null;
  onCreate: (data: CreateDailyLogRequest) => Promise<DailyLog | null>;
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
  onUpdateActual,
  onRefresh,
}: CommandCenterProps) {
  const { shouldShowModal, dismissModal, resetDismissal } = useCheckinState({
    hasLogToday: log !== null,
    loading,
  });

  // Handler for logging a solver solution (meal)
  const handleLogSolution = useCallback(async (solution: SolverSolution) => {
    if (!log) return;

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

  // Default planned sessions (TODO: integrate with workout planner schedule)
  const [plannedSessions] = useState<TrainingSession[]>([
    { type: 'rest', durationMin: 0 },
  ]);

  // Use log's planned sessions if available, otherwise use fetched
  const effectivePlannedSessions = log?.plannedTrainingSessions ?? plannedSessions;

  const handleCheckinComplete = useCallback(
    async (data: CheckinData) => {
      const request: CreateDailyLogRequest = {
        weightKg: data.weightKg,
        sleepQuality: data.sleepQuality,
        sleepHours: data.sleepHours,
        hrvMs: data.hrvMs,
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
        dayType: data.dayType,
        plannedTrainingSessions: data.plannedTrainingSessions,
      };

      const result = await onCreate(request);
      if (result) {
        setShowEditCheckin(false);
      }
    },
    [onCreate]
  );

  // Prepare initial data from current log for edit mode
  const editInitialData = log ? {
    weightKg: log.weightKg,
    sleepHours: log.sleepHours ?? 7,
    sleepQuality: log.sleepQuality ?? 70,
    hrvMs: log.hrvMs,
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
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column (60%) - Status + Mission */}
          <div className="lg:col-span-3 space-y-4">
            {/* Zone A: Status */}
            <StatusZone
              recoveryScore={log.recoveryScore}
              cnsStatus={log.cnsStatus}
              sleepHours={log.sleepHours}
              sleepQuality={log.sleepQuality}
              profile={profile}
              onEdit={() => setShowEditCheckin(true)}
            />

            {/* Training Override Alert (when CNS depleted) */}
            {log.trainingOverrides && log.trainingOverrides.length > 0 && (
              <TrainingOverrideAlert overrides={log.trainingOverrides} />
            )}

            {/* Zone B: Mission */}
            <MissionZone
              plannedSessions={log.plannedTrainingSessions}
              actualSessions={log.actualTrainingSessions}
              trainingSummary={log.trainingSummary}
              onToggleSession={handleToggleSession}
              saving={saving}
            />
          </div>

          {/* Right Column (40%) - Fuel */}
          <div className="lg:col-span-2">
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
          </div>
        </div>
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
