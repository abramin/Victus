import { useCallback, useMemo, useState, useEffect } from 'react';
import type {
  DailyLog,
  UserProfile,
  CreateDailyLogRequest,
  ActualTrainingSession,
  NutritionPlan,
  TrainingSession,
} from '../../api/types';
import { useCheckinState } from '../../hooks/useCheckinState';
import { useFluxNotification } from '../../hooks/useFluxNotification';
import { MorningCheckinModal, type CheckinData } from './MorningCheckinModal';
import { StatusZone } from './StatusZone';
import { MissionZone } from './MissionZone';
import { FuelZone } from './FuelZone';
import { SetupAlertCard } from './SetupAlertCard';
import { WeeklyStrategyModal } from '../metabolic/WeeklyStrategyModal';
import { getPlannedDays } from '../../api/client';

interface CommandCenterProps {
  profile: UserProfile;
  log: DailyLog | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  activePlan: NutritionPlan | null;
  onCreate: (data: CreateDailyLogRequest) => Promise<DailyLog | null>;
  onUpdateActual?: (sessions: Omit<ActualTrainingSession, 'sessionOrder'>[]) => Promise<DailyLog | null>;
}

export function CommandCenter({
  profile,
  log,
  loading,
  saving,
  error,
  activePlan,
  onCreate,
  onUpdateActual,
}: CommandCenterProps) {
  const { shouldShowModal, dismissModal } = useCheckinState({
    hasLogToday: log !== null,
    loading,
  });

  // Flux Engine notification
  const {
    notification: fluxNotification,
    dismiss: dismissFluxNotification,
  } = useFluxNotification();

  // Track whether to show the Flux notification modal
  const [showFluxModal, setShowFluxModal] = useState(false);

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

  // Fetch today's planned sessions from schedule
  const [plannedSessions, setPlannedSessions] = useState<TrainingSession[]>([
    { type: 'rest', durationMin: 0 },
  ]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    getPlannedDays(today, today)
      .then((response) => {
        // If we have planned training from schedule, use it
        // For now, default to rest if no schedule data
        // TODO: Integrate with workout planner schedule
      })
      .catch(() => {
        // Keep default rest day
      });
  }, []);

  // Use log's planned sessions if available, otherwise use fetched
  const effectivePlannedSessions = log?.plannedTrainingSessions ?? plannedSessions;

  const handleCheckinComplete = useCallback(
    async (data: CheckinData) => {
      const request: CreateDailyLogRequest = {
        weightKg: data.weightKg,
        sleepQuality: data.sleepQuality,
        sleepHours: data.sleepHours,
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
        saving={saving}
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
              sleepHours={log.sleepHours}
              sleepQuality={log.sleepQuality}
              profile={profile}
            />

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
            onClick={() => {
              // Reset dismissal to show modal again
              localStorage.removeItem('checkin-dismissed-date');
              window.location.reload();
            }}
            className="px-6 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Begin Check-In
          </button>
        </div>
      )}
    </div>
  );
}
