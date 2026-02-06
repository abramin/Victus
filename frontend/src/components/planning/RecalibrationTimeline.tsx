import { Fragment } from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, Clock, Target, Eye } from 'lucide-react';
import type { RecalibrationRecord, RecalibrationOptionType } from '../../api/types';
import { Card } from '../common/Card';
import { staggerContainer, fadeInUp } from '../../lib/animations';

const ACTION_CONFIG: Record<
  RecalibrationOptionType,
  {
    icon: typeof TrendingDown;
    color: string;
    bgColor: string;
    borderColor: string;
    label: string;
  }
> = {
  increase_deficit: {
    icon: TrendingDown,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/60',
    label: 'DEFICIT INCREASED',
  },
  extend_timeline: {
    icon: Clock,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/60',
    label: 'TIMELINE EXTENDED',
  },
  revise_goal: {
    icon: Target,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/60',
    label: 'GOAL REVISED',
  },
  keep_current: {
    icon: Eye,
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
    borderColor: 'border-slate-500/60',
    label: 'OBSERVATION LOGGED',
  },
};

function formatTacticalDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} // ${hours}:${minutes}`;
}

interface RecalibrationTimelineProps {
  records: RecalibrationRecord[];
  loading: boolean;
}

export function RecalibrationTimeline({ records, loading }: RecalibrationTimelineProps) {
  if (loading) {
    return (
      <Card title="Recalibration History">
        <div className="flex items-center justify-center h-24 text-slate-500 text-sm">
          Loading history...
        </div>
      </Card>
    );
  }

  if (records.length === 0) {
    return (
      <Card title="Recalibration History">
        <div className="text-center py-8 text-slate-500 text-sm font-mono">
          No system adjustments recorded yet. Awaiting initial data.
        </div>
      </Card>
    );
  }

  return (
    <Card title="Recalibration History">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="relative pl-8"
      >
        {/* Vertical timeline line */}
        <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-700/50" />

        {records.map((record, index) => {
          const isLatest = index === 0;
          const config = ACTION_CONFIG[record.actionType];
          const Icon = config.icon;

          return (
            <motion.div
              key={record.id}
              variants={fadeInUp}
              className={`relative mb-6 last:mb-0 ${isLatest ? 'opacity-100' : 'opacity-75'}`}
            >
              {/* Timeline node */}
              <div
                className={`absolute -left-5 top-1 w-4 h-4 rounded-full border-2 ${config.borderColor} ${config.bgColor} ${
                  isLatest ? 'shadow-[0_0_8px_rgba(255,255,255,0.15)]' : ''
                }`}
              />

              <div className="space-y-2">
                {/* Icon + label */}
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <span className={`text-xs font-bold tracking-wider ${config.color}`}>
                    {config.label}
                  </span>
                </div>

                {/* Tactical date */}
                <div className="text-xs font-mono text-slate-500">
                  {formatTacticalDate(record.createdAt)}
                  <span className="ml-2 text-slate-600">// WK {record.details.currentWeek}</span>
                </div>

                {/* Impact text */}
                {record.details.impact && (
                  <div className="text-sm font-mono text-gray-400 pl-3 border-l-2 border-slate-700">
                    {record.details.impact}
                  </div>
                )}

                {/* Delta grid */}
                {record.actionType !== 'keep_current' && <DeltaGrid record={record} />}

                {/* Feasibility tag */}
                {record.details.feasibilityTag && (
                  <span
                    className={`inline-block text-xs px-2 py-0.5 rounded-full font-mono ${
                      record.details.feasibilityTag === 'Achievable'
                        ? 'bg-green-500/20 text-green-400'
                        : record.details.feasibilityTag === 'Moderate'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {record.details.feasibilityTag}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </Card>
  );
}

function DeltaGrid({ record }: { record: RecalibrationRecord }) {
  const d = record.details;

  const deltas: { label: string; before: string; after: string; direction: 'up' | 'down' | 'same' }[] = [];

  if (d.beforeDailyDeficitKcal !== d.afterDailyDeficitKcal) {
    deltas.push({
      label: 'Daily Deficit',
      before: `${Math.round(d.beforeDailyDeficitKcal)} kcal`,
      after: `${Math.round(d.afterDailyDeficitKcal)} kcal`,
      direction:
        Math.abs(d.afterDailyDeficitKcal) > Math.abs(d.beforeDailyDeficitKcal) ? 'up' : 'down',
    });
  }

  if (d.beforeDurationWeeks !== d.afterDurationWeeks) {
    deltas.push({
      label: 'Duration',
      before: `${d.beforeDurationWeeks} wk`,
      after: `${d.afterDurationWeeks} wk`,
      direction: d.afterDurationWeeks > d.beforeDurationWeeks ? 'up' : 'down',
    });
  }

  if (d.beforeGoalWeightKg !== d.afterGoalWeightKg) {
    deltas.push({
      label: 'Goal Weight',
      before: `${d.beforeGoalWeightKg.toFixed(1)} kg`,
      after: `${d.afterGoalWeightKg.toFixed(1)} kg`,
      direction: d.afterGoalWeightKg > d.beforeGoalWeightKg ? 'up' : 'down',
    });
  }

  if (d.beforeRequiredWeeklyChangeKg !== d.afterRequiredWeeklyChangeKg) {
    deltas.push({
      label: 'Weekly Rate',
      before: `${d.beforeRequiredWeeklyChangeKg.toFixed(2)} kg/wk`,
      after: `${d.afterRequiredWeeklyChangeKg.toFixed(2)} kg/wk`,
      direction:
        Math.abs(d.afterRequiredWeeklyChangeKg) > Math.abs(d.beforeRequiredWeeklyChangeKg)
          ? 'up'
          : 'down',
    });
  }

  if (deltas.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs mt-2 bg-slate-900/40 rounded p-2">
      <div className="text-slate-600 font-mono">PARAM</div>
      <div className="text-slate-600 font-mono">BEFORE</div>
      <div className="text-slate-600 font-mono">AFTER</div>
      {deltas.map((delta) => (
        <Fragment key={delta.label}>
          <div className="text-slate-400 font-mono">{delta.label}</div>
          <div className="text-slate-500 font-mono tabular-nums">{delta.before}</div>
          <div
            className={`font-mono font-semibold tabular-nums ${
              delta.direction === 'up'
                ? 'text-green-400'
                : delta.direction === 'down'
                  ? 'text-amber-400'
                  : 'text-slate-400'
            }`}
          >
            {delta.after}
          </div>
        </Fragment>
      ))}
    </div>
  );
}
