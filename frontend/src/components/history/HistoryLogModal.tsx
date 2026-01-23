import type { ActualTrainingSession, DailyLog, TrainingSession, UserProfile } from '../../api/types';
import { DayTargetsPanel } from '../day-view';
import { Modal } from '../common/Modal';

interface HistoryLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: DailyLog | null;
  loading: boolean;
  error: string | null;
  profile: UserProfile;
}

function formatLongDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatOptionalValue(value: number | null | undefined, suffix: string) {
  if (value === null || value === undefined) {
    return '—';
  }
  return `${value}${suffix}`;
}

function formatTdeeSource(source: string): string {
  switch (source) {
    case 'adaptive':
      return 'Adaptive';
    case 'manual':
      return 'Manual';
    case 'formula':
    default:
      return 'Formula';
  }
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm text-white mt-1">{value}</p>
    </div>
  );
}

function SessionList({
  title,
  sessions,
}: {
  title: string;
  sessions: Array<TrainingSession | ActualTrainingSession>;
}) {
  if (sessions.length === 0) {
    return (
      <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
        <h4 className="text-sm font-semibold text-slate-200 mb-2">{title}</h4>
        <p className="text-xs text-slate-500">No sessions logged</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
      <h4 className="text-sm font-semibold text-slate-200 mb-3">{title}</h4>
      <div className="space-y-2">
        {sessions.map((session, index) => (
          <div
            key={`${session.type}-${index}`}
            className="flex items-center justify-between text-xs text-slate-300"
          >
            <span className="capitalize">{session.type}</span>
            <span className="text-slate-400">
              {session.durationMin} min
              {'perceivedIntensity' in session && session.perceivedIntensity
                ? ` · RPE ${session.perceivedIntensity}`
                : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HistoryLogModal({
  isOpen,
  onClose,
  log,
  loading,
  error,
  profile,
}: HistoryLogModalProps) {
  const title = log ? `Log Details · ${formatLongDate(log.date)}` : 'Log Details';
  const formulaTdeeValue = log?.formulaTDEE && log.formulaTDEE > 0 ? log.formulaTDEE : log?.estimatedTDEE;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-3xl">
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
        <div className="space-y-5">
          <DayTargetsPanel
            title="Stored Targets"
            dateLabel={formatLongDate(log.date)}
            dayType={log.dayType}
            mealTargets={log.calculatedTargets.meals}
            mealRatios={profile.mealRatios}
            totalFruitG={log.calculatedTargets.fruitG}
            totalVeggiesG={log.calculatedTargets.veggiesG}
            waterL={log.calculatedTargets.waterL}
            compact
            helperText="Targets are the stored calculation for this date."
          />

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">Morning Inputs</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailItem label="Weight" value={`${log.weightKg.toFixed(1)} kg`} />
              <DetailItem label="Sleep Quality" value={`${log.sleepQuality}/100`} />
              <DetailItem label="Sleep Hours" value={formatOptionalValue(log.sleepHours, 'h')} />
              <DetailItem label="Resting HR" value={formatOptionalValue(log.restingHeartRate, ' bpm')} />
              <DetailItem label="Body Fat" value={formatOptionalValue(log.bodyFatPercent, '%')} />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">Training Sessions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <SessionList title="Planned" sessions={log.plannedTrainingSessions} />
              <SessionList title="Actual" sessions={log.actualTrainingSessions ?? []} />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">Calculation Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DetailItem label="Estimated TDEE" value={`${log.estimatedTDEE} kcal`} />
              <DetailItem label="Formula TDEE" value={`${formulaTdeeValue ?? log.estimatedTDEE} kcal`} />
              <DetailItem label="TDEE Source" value={formatTdeeSource(log.tdeeSourceUsed)} />
              <DetailItem
                label="Confidence"
                value={log.tdeeConfidence ? `${Math.round(log.tdeeConfidence * 100)}%` : '—'}
              />
              <DetailItem
                label="Data Points"
                value={log.dataPointsUsed ? `${log.dataPointsUsed}` : '—'}
              />
              <DetailItem
                label="Recovery Score"
                value={
                  log.recoveryScore ? `${Math.round(log.recoveryScore.score)} / 100` : '—'
                }
              />
            </div>

            {log.adjustmentMultipliers && (
              <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-3">TDEE Multipliers</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                  <div>Training Load: {log.adjustmentMultipliers.trainingLoad.toFixed(2)}x</div>
                  <div>Recovery Score: {log.adjustmentMultipliers.recoveryScore.toFixed(2)}x</div>
                  <div>Sleep Quality: {log.adjustmentMultipliers.sleepQuality.toFixed(2)}x</div>
                  <div>Yesterday Intensity: {log.adjustmentMultipliers.yesterdayIntensity.toFixed(2)}x</div>
                  <div>Total: {log.adjustmentMultipliers.total.toFixed(2)}x</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
