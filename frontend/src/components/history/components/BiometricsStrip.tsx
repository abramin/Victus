import type { CNSStatusBreakdown } from '../../../api/types';
import { CNSStatusBadge } from '../../cns';

interface BiometricsStripProps {
  weightKg: number;
  sleepHours?: number;
  sleepQuality: number;
  restingHeartRate?: number;
  hrvMs?: number;
  cnsStatus?: CNSStatusBreakdown;
}

function getSleepStatus(quality: number): { label: string; color: string } {
  if (quality >= 70) return { label: 'Good', color: 'text-green-400' };
  if (quality >= 40) return { label: 'Fair', color: 'text-yellow-400' };
  return { label: 'Poor', color: 'text-red-400' };
}

function getRhrStatus(rhr: number): { label: string; color: string } {
  if (rhr <= 60) return { label: 'Athletic', color: 'text-green-400' };
  if (rhr <= 80) return { label: 'Normal', color: 'text-slate-400' };
  return { label: 'Elevated', color: 'text-yellow-400' };
}

function formatSleepHours(hours: number | undefined): string {
  if (hours === undefined) return '--';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function BiometricsStrip({
  weightKg,
  sleepHours,
  sleepQuality,
  restingHeartRate,
  hrvMs,
  cnsStatus,
}: BiometricsStripProps) {
  const sleepStatus = getSleepStatus(sleepQuality);

  return (
    <div className="grid grid-cols-3 gap-2">
      {/* Weight Card */}
      <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-3">
        <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Weight</div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-white">{weightKg.toFixed(1)}</span>
          <span className="text-xs text-slate-500">kg</span>
        </div>
      </div>

      {/* Sleep Card */}
      <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-3">
        <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Sleep</div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-white">{formatSleepHours(sleepHours)}</span>
        </div>
        <span className={`text-xs ${sleepStatus.color}`}>{sleepStatus.label}</span>
      </div>

      {/* HRV / RHR Card */}
      <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-3">
        {hrvMs !== undefined ? (
          <>
            <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">HRV</div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white">{hrvMs}</span>
              <span className="text-xs text-slate-500">ms</span>
            </div>
            {cnsStatus && (
              <div className="mt-1">
                <CNSStatusBadge status={cnsStatus.status} />
              </div>
            )}
          </>
        ) : restingHeartRate !== undefined ? (
          <>
            <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">RHR</div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white">{restingHeartRate}</span>
              <span className="text-xs text-slate-500">bpm</span>
            </div>
            <span className={`text-xs ${getRhrStatus(restingHeartRate).color}`}>
              {getRhrStatus(restingHeartRate).label}
            </span>
          </>
        ) : (
          <>
            <div className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Recovery</div>
            <div className="text-xl font-bold text-slate-500">--</div>
          </>
        )}
      </div>
    </div>
  );
}
