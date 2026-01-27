import { motion } from 'framer-motion';
import type { DebriefDay } from '../../api/types';
import { staggerContainerFast, fadeInUp } from '../../lib/animations';

interface DailyBreakdownTableProps {
  days: DebriefDay[];
  onDayClick?: (day: DebriefDay) => void;
}

/**
 * 7-day summary table showing daily metrics.
 * Dates are clickable for deep linking to day details.
 */
export function DailyBreakdownTable({ days, onDayClick }: DailyBreakdownTableProps) {
  return (
    <div className="bg-slate-900/70 rounded-lg border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800">
        <h3 className="text-sm font-semibold text-white">Daily Breakdown</h3>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800/50">
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Day
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                Type
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                Calories
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                Protein
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                Training
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                Recovery
              </th>
            </tr>
          </thead>
          <motion.tbody
            className="divide-y divide-slate-800/50"
            variants={staggerContainerFast}
            initial="hidden"
            animate="show"
          >
            {days.map((day) => (
              <DayRow key={day.date} day={day} onClick={onDayClick} />
            ))}
          </motion.tbody>
        </table>
      </div>

      {/* Footer hint */}
      {onDayClick && (
        <div className="px-4 py-2 border-t border-slate-800">
          <p className="text-xs text-slate-500">Click a row to view details.</p>
        </div>
      )}
    </div>
  );
}

interface DayRowProps {
  day: DebriefDay;
  onClick?: (day: DebriefDay) => void;
}

function DayRow({ day, onClick }: DayRowProps) {
  const calorieColor = getCalorieColor(day.calorieDelta, day.targetCalories);
  const proteinColor = getProteinColor(day.proteinPercent);
  const trainingStatus = getTrainingStatus(day.plannedSessions, day.actualSessions);

  return (
    <motion.tr
      variants={fadeInUp}
      className={`${onClick ? 'cursor-pointer hover:bg-slate-800/30' : ''} transition-colors`}
      onClick={() => onClick?.(day)}
    >
      {/* Day name */}
      <td className="px-3 py-2">
        <div className="flex flex-col">
          <span className="font-medium text-white">{day.dayName}</span>
          <span className="text-xs text-slate-500">{formatShortDate(day.date)}</span>
        </div>
      </td>

      {/* Day type */}
      <td className="px-3 py-2 text-center">
        <DayTypeBadge type={day.dayType} />
      </td>

      {/* Calories */}
      <td className="px-3 py-2 text-right">
        <div className="flex flex-col items-end">
          <span className={`font-medium ${calorieColor}`}>
            {day.consumedCalories.toLocaleString()}
          </span>
          <span className="text-xs text-slate-500">
            / {day.targetCalories.toLocaleString()}
          </span>
        </div>
      </td>

      {/* Protein */}
      <td className="px-3 py-2 text-right">
        <div className="flex flex-col items-end">
          <span className={`font-medium ${proteinColor}`}>
            {day.consumedProteinG}g
          </span>
          <span className="text-xs text-slate-500">
            {Math.round(day.proteinPercent)}%
          </span>
        </div>
      </td>

      {/* Training */}
      <td className="px-3 py-2 text-center">
        <div className="flex flex-col items-center">
          <span className={`font-medium ${trainingStatus.color}`}>
            {trainingStatus.icon}
          </span>
          <span className="text-xs text-slate-500">
            {day.actualSessions}/{day.plannedSessions}
          </span>
        </div>
      </td>

      {/* Recovery */}
      <td className="px-3 py-2 text-center">
        <RecoveryIndicator
          sleepQuality={day.sleepQuality}
          cnsStatus={day.cnsStatus}
          hrvMs={day.hrvMs}
        />
      </td>
    </motion.tr>
  );
}

function DayTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    performance: 'bg-blue-500/20 text-blue-400',
    fatburner: 'bg-amber-500/20 text-amber-400',
    metabolize: 'bg-emerald-500/20 text-emerald-400',
  };

  const labels: Record<string, string> = {
    performance: 'Perf',
    fatburner: 'Burn',
    metabolize: 'Meta',
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[type] || 'bg-slate-700 text-slate-400'}`}>
      {labels[type] || type}
    </span>
  );
}

interface RecoveryIndicatorProps {
  sleepQuality: number;
  cnsStatus?: string;
  hrvMs?: number;
}

function RecoveryIndicator({ sleepQuality, cnsStatus, hrvMs }: RecoveryIndicatorProps) {
  // Combine sleep quality and CNS status for overall recovery
  const recoveryScore = sleepQuality;

  let color = 'text-slate-400';
  let icon = '○';

  if (recoveryScore >= 80) {
    color = 'text-emerald-400';
    icon = '●';
  } else if (recoveryScore >= 60) {
    color = 'text-amber-400';
    icon = '◐';
  } else if (recoveryScore > 0) {
    color = 'text-rose-400';
    icon = '○';
  }

  // Add CNS warning if depleted
  if (cnsStatus === 'depleted') {
    color = 'text-rose-400';
    icon = '⚠';
  }

  return (
    <div className="flex flex-col items-center">
      <span className={`text-lg ${color}`}>{icon}</span>
      <span className="text-xs text-slate-500">
        {hrvMs ? `${hrvMs}ms` : `${sleepQuality}%`}
      </span>
    </div>
  );
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getCalorieColor(delta: number, target: number): string {
  const percentOff = Math.abs(delta) / target;
  if (percentOff <= 0.05) return 'text-emerald-400'; // Within 5%
  if (percentOff <= 0.15) return 'text-amber-400';   // Within 15%
  return 'text-rose-400';
}

function getProteinColor(percent: number): string {
  if (percent >= 95) return 'text-emerald-400';
  if (percent >= 80) return 'text-amber-400';
  return 'text-rose-400';
}

function getTrainingStatus(planned: number, actual: number): { icon: string; color: string } {
  if (planned === 0 && actual === 0) {
    return { icon: '—', color: 'text-slate-500' }; // Rest day
  }
  if (actual >= planned) {
    return { icon: '✓', color: 'text-emerald-400' }; // Complete
  }
  if (actual > 0) {
    return { icon: '◐', color: 'text-amber-400' }; // Partial
  }
  return { icon: '✗', color: 'text-rose-400' }; // Missed
}
