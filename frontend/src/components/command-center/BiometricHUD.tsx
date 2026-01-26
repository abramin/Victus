import type { DailyLog } from '../../api/types';

interface BiometricHUDProps {
  log: DailyLog;
  yesterdayLog?: DailyLog | null;
  onEdit: () => void;
}

interface BiometricCardProps {
  icon: string;
  label: string;
  value: string;
  subvalue?: string;
  delta?: string;
  deltaPositive?: boolean; // true = good (emerald), false = attention (amber)
  variant?: 'metric' | 'action';
  onClick: () => void;
  className?: string;
}

function formatDelta(value: number, unit: string): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)} ${unit}`;
}

function BiometricCard({
  icon,
  label,
  value,
  subvalue,
  delta,
  deltaPositive,
  variant = 'metric',
  onClick,
  className = '',
}: BiometricCardProps) {
  const isAction = variant === 'action';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        text-left rounded-xl border p-3
        transition-colors cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-white/30
        ${isAction
          ? 'border-dashed border-gray-700 hover:bg-gray-800/50 text-gray-500 hover:text-gray-300'
          : 'bg-gray-900 border-gray-800 hover:border-gray-700'
        }
        ${className}
      `}
      aria-label={`${label}: ${value}. Click to edit.`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-lg font-semibold ${isAction ? '' : 'text-white'}`}>
        {value}
      </div>
      {subvalue && (
        <div className="text-xs text-gray-400 mt-0.5">{subvalue}</div>
      )}
      {delta && deltaPositive !== undefined && (
        <div className={`text-xs mt-0.5 ${deltaPositive ? 'text-emerald-400' : 'text-amber-400'}`}>
          {delta}
        </div>
      )}
    </button>
  );
}

export function BiometricHUD({ log, yesterdayLog, onEdit }: BiometricHUDProps) {
  // Calculate deltas
  const weightDelta = yesterdayLog?.weightKg
    ? log.weightKg - yesterdayLog.weightKg
    : undefined;

  const hrvDelta = (log.hrvMs && yesterdayLog?.hrvMs)
    ? log.hrvMs - yesterdayLog.hrvMs
    : undefined;

  const rhrDelta = (log.restingHeartRate && yesterdayLog?.restingHeartRate)
    ? log.restingHeartRate - yesterdayLog.restingHeartRate
    : undefined;

  // Format sleep display
  const sleepDisplay = log.sleepHours
    ? `${log.sleepHours}h`
    : '—';

  const sleepQualityDisplay = log.sleepQuality
    ? `Quality: ${log.sleepQuality}/100`
    : undefined;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {/* Weight Card */}
      <BiometricCard
        icon="⚖️"
        label="Weight"
        value={`${log.weightKg.toFixed(1)} kg`}
        delta={weightDelta !== undefined ? formatDelta(weightDelta, 'kg') : undefined}
        deltaPositive={weightDelta !== undefined ? weightDelta < 0 : undefined}
        onClick={onEdit}
      />

      {/* Sleep Card */}
      <BiometricCard
        icon="😴"
        label="Sleep"
        value={sleepDisplay}
        subvalue={sleepQualityDisplay}
        onClick={onEdit}
      />

      {/* HRV Card */}
      <BiometricCard
        icon="💓"
        label="HRV"
        value={log.hrvMs ? `${log.hrvMs} ms` : '—'}
        delta={hrvDelta !== undefined ? formatDelta(hrvDelta, 'ms') : undefined}
        deltaPositive={hrvDelta !== undefined ? hrvDelta > 0 : undefined}
        onClick={onEdit}
      />

      {/* RHR Card */}
      <BiometricCard
        icon="❤️"
        label="RHR"
        value={log.restingHeartRate ? `${log.restingHeartRate} bpm` : '—'}
        delta={rhrDelta !== undefined ? formatDelta(rhrDelta, 'bpm') : undefined}
        deltaPositive={rhrDelta !== undefined ? rhrDelta < 0 : undefined}
        onClick={onEdit}
      />

      {/* Update Action Card */}
      <BiometricCard
        icon="📝"
        label="Update"
        value="Edit inputs"
        variant="action"
        onClick={onEdit}
        className="col-span-2 md:col-span-1"
      />
    </div>
  );
}
