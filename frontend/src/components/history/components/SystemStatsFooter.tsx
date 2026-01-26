import type { RecoveryScoreBreakdown, TDEESource } from '../../../api/types';

interface SystemStatsFooterProps {
  estimatedTDEE: number;
  tdeeConfidence?: number;
  dataPointsUsed?: number;
  tdeeSourceUsed: TDEESource;
  recoveryScore?: RecoveryScoreBreakdown;
}

function formatTdeeSource(source: TDEESource): string {
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

export function SystemStatsFooter({
  estimatedTDEE,
  tdeeConfidence,
  dataPointsUsed,
  tdeeSourceUsed,
  recoveryScore,
}: SystemStatsFooterProps) {
  return (
    <div className="bg-slate-950/80 rounded-lg border border-slate-800 p-4 mt-4">
      <div className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-3">
        // SYSTEM_STATS
      </div>

      <div className="grid grid-cols-3 gap-4 mb-3">
        <div>
          <div className="text-[10px] uppercase text-slate-500 mb-1">TDEE</div>
          <div className="font-mono text-emerald-400">
            {estimatedTDEE.toLocaleString()} kcal
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-slate-500 mb-1">Confidence</div>
          <div className="font-mono text-blue-400">
            {tdeeConfidence ? `${Math.round(tdeeConfidence * 100)}%` : '--'}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-slate-500 mb-1">Data Pts</div>
          <div className="font-mono text-slate-300">
            {dataPointsUsed ?? '--'}
          </div>
        </div>
      </div>

      <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-800">
        <span>Source: {formatTdeeSource(tdeeSourceUsed)}</span>
        {recoveryScore && (
          <span>Recovery: {Math.round(recoveryScore.score)}/100</span>
        )}
      </div>
    </div>
  );
}
