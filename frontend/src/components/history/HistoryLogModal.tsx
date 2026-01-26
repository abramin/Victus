import type { DailyLog, UserProfile } from '../../api/types';
import { Modal } from '../common/Modal';
import { formatLongDate } from '../../utils/date';
import {
  BiometricsStrip,
  NutritionCard,
  SystemStatsFooter,
  TrainingTicket,
} from './components';

interface HistoryLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: DailyLog | null;
  loading: boolean;
  error: string | null;
  profile: UserProfile;
}

function calculateAdherenceScore(log: DailyLog): number {
  const planned = log.plannedTrainingSessions.filter((s) => s.type !== 'rest');
  const actual = log.actualTrainingSessions?.filter((s) => s.type !== 'rest') ?? [];

  if (planned.length === 0) return 100;

  const plannedDuration = planned.reduce((sum, s) => sum + s.durationMin, 0);
  const actualDuration = actual.reduce((sum, s) => sum + s.durationMin, 0);

  return Math.min(100, Math.round((actualDuration / plannedDuration) * 100));
}

function getPhaseLabel(log: DailyLog): string {
  // Derive phase from CNS status or day type
  if (log.cnsStatus?.status === 'depleted') {
    return 'Recovery Required';
  }
  if (log.cnsStatus?.status === 'strained') {
    return 'Recovery Phase';
  }
  if (log.dayType === 'performance') {
    return 'Performance Day';
  }
  if (log.dayType === 'fatburner') {
    return 'Fat Loss Focus';
  }
  return 'Metabolize Day';
}

export function HistoryLogModal({
  isOpen,
  onClose,
  log,
  loading,
  error,
}: HistoryLogModalProps) {
  const title = log ? formatLongDate(log.date) : 'Log Details';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-md">
      {loading && (
        <div className="text-sm text-slate-400">Loading log details...</div>
      )}
      {!loading && error && (
        <div className="text-sm text-rose-400">{error}</div>
      )}
      {!loading && !error && !log && (
        <div className="text-sm text-slate-400">No log data available.</div>
      )}
      {!loading && !error && log && (
        <div className="space-y-4">
          {/* Header Section */}
          <div className="flex justify-between items-center">
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wide">
                {getPhaseLabel(log)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-400">
                {calculateAdherenceScore(log)}%
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wide">
                Adherence
              </div>
            </div>
          </div>

          {/* Zone 1: Biometrics Strip */}
          <BiometricsStrip
            weightKg={log.weightKg}
            sleepHours={log.sleepHours ?? undefined}
            sleepQuality={log.sleepQuality}
            restingHeartRate={log.restingHeartRate ?? undefined}
            hrvMs={log.hrvMs ?? undefined}
            cnsStatus={log.cnsStatus ?? undefined}
          />

          {/* Zone 2a: Training Ticket */}
          <TrainingTicket
            plannedSessions={log.plannedTrainingSessions}
            actualSessions={log.actualTrainingSessions ?? undefined}
            trainingSummary={log.trainingSummary}
          />

          {/* Zone 2b: Nutrition Card */}
          <NutritionCard
            calculatedTargets={log.calculatedTargets}
            dayType={log.dayType}
          />

          {/* Zone 3: System Stats Footer */}
          <SystemStatsFooter
            estimatedTDEE={log.estimatedTDEE}
            tdeeConfidence={log.tdeeConfidence ?? undefined}
            dataPointsUsed={log.dataPointsUsed ?? undefined}
            tdeeSourceUsed={log.tdeeSourceUsed}
            recoveryScore={log.recoveryScore ?? undefined}
          />
        </div>
      )}
    </Modal>
  );
}
