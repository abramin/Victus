import type { DebriefDay } from '../../api/types';
import { Modal } from '../common/Modal';

interface DayDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: DebriefDay | null;
}

/**
 * Modal showing detailed metrics for a single day.
 * Used for deep linking from narrative or table clicks.
 */
export function DayDetailModal({ isOpen, onClose, day }: DayDetailModalProps) {
  if (!day) return null;

  const title = `${day.dayName} · ${formatLongDate(day.date)}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-2xl">
      <div className="space-y-5">
        {/* Day Type Banner */}
        <DayTypeBanner type={day.dayType} />

        {/* Nutrition Section */}
        <Section title="Nutrition">
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              label="Calories"
              value={day.consumedCalories}
              target={day.targetCalories}
              suffix=" kcal"
              delta={day.calorieDelta}
            />
            <MetricCard
              label="Protein"
              value={day.consumedProteinG}
              target={day.targetProteinG}
              suffix=" g"
              percent={day.proteinPercent}
            />
          </div>
        </Section>

        {/* Training Section */}
        <Section title="Training">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Sessions Planned" value={day.plannedSessions.toString()} />
            <StatCard label="Sessions Completed" value={day.actualSessions.toString()} />
            <StatCard
              label="Training Load"
              value={day.trainingLoad > 0 ? day.trainingLoad.toFixed(1) : '—'}
            />
            <StatCard
              label="Avg RPE"
              value={day.avgRpe ? `${day.avgRpe.toFixed(1)} / 10` : '—'}
            />
          </div>
        </Section>

        {/* Recovery Section */}
        <Section title="Recovery">
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Sleep Quality"
              value={`${day.sleepQuality} / 100`}
              color={getRecoveryColor(day.sleepQuality)}
            />
            <StatCard
              label="Sleep Duration"
              value={day.sleepHours ? `${day.sleepHours.toFixed(1)} hrs` : '—'}
            />
            <StatCard
              label="HRV"
              value={day.hrvMs ? `${day.hrvMs} ms` : '—'}
            />
            <StatCard
              label="CNS Status"
              value={formatCnsStatus(day.cnsStatus)}
              color={getCnsColor(day.cnsStatus)}
            />
          </div>
        </Section>

        {/* Notes */}
        {day.notes && (
          <Section title="Notes">
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{day.notes}</p>
          </Section>
        )}
      </div>
    </Modal>
  );
}

function DayTypeBanner({ type }: { type: string }) {
  const configs: Record<string, { bg: string; text: string; label: string; desc: string }> = {
    performance: {
      bg: 'bg-blue-500/10 border-blue-500/30',
      text: 'text-blue-400',
      label: 'Performance Day',
      desc: 'Higher carbs for training fuel',
    },
    fatburner: {
      bg: 'bg-amber-500/10 border-amber-500/30',
      text: 'text-amber-400',
      label: 'Fat Burner Day',
      desc: 'Lower carbs for metabolic burn',
    },
    metabolize: {
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      text: 'text-emerald-400',
      label: 'Metabolize Day',
      desc: 'Moderate macros for recovery',
    },
  };

  const config = configs[type] || configs.metabolize;

  return (
    <div className={`rounded-lg border ${config.bg} p-4`}>
      <h3 className={`text-sm font-semibold ${config.text}`}>{config.label}</h3>
      <p className="text-xs text-slate-400 mt-1">{config.desc}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      {children}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: number;
  target: number;
  suffix?: string;
  delta?: number;
  percent?: number;
}

function MetricCard({ label, value, target, suffix = '', delta, percent }: MetricCardProps) {
  const ratio = target > 0 ? value / target : 0;
  const color = ratio >= 0.95 ? 'text-emerald-400' : ratio >= 0.8 ? 'text-amber-400' : 'text-rose-400';

  return (
    <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <span className={`text-lg font-bold ${color}`}>
          {value.toLocaleString()}{suffix}
        </span>
        <span className="text-xs text-slate-500">/ {target.toLocaleString()}</span>
      </div>
      {delta !== undefined && (
        <p className={`text-xs mt-1 ${delta > 0 ? 'text-amber-400' : delta < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
          {delta > 0 ? '+' : ''}{delta.toLocaleString()} kcal
        </p>
      )}
      {percent !== undefined && (
        <p className={`text-xs mt-1 ${color}`}>
          {Math.round(percent)}% of target
        </p>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  color?: string;
}

function StatCard({ label, value, color = 'text-white' }: StatCardProps) {
  return (
    <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`text-sm font-semibold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

function formatLongDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatCnsStatus(status: string | undefined): string {
  if (!status) return '—';
  const labels: Record<string, string> = {
    fresh: 'Fresh',
    recovered: 'Recovered',
    training_ready: 'Ready',
    slightly_fatigued: 'Slight Fatigue',
    moderately_fatigued: 'Moderate Fatigue',
    depleted: 'Depleted',
  };
  return labels[status] || status;
}

function getRecoveryColor(quality: number): string {
  if (quality >= 80) return 'text-emerald-400';
  if (quality >= 60) return 'text-amber-400';
  return 'text-rose-400';
}

function getCnsColor(status: string | undefined): string {
  if (!status) return 'text-slate-400';
  if (status === 'fresh' || status === 'recovered' || status === 'training_ready') {
    return 'text-emerald-400';
  }
  if (status === 'slightly_fatigued' || status === 'moderately_fatigued') {
    return 'text-amber-400';
  }
  return 'text-rose-400';
}
