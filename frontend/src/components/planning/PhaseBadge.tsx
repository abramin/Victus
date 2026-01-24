export type PlanPhase = 'initiation' | 'momentum' | 'peak';

interface PhaseBadgeProps {
  phase: PlanPhase;
  weekRange: string;
}

const PHASE_CONFIG = {
  initiation: {
    label: 'Initiation',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    borderColor: 'border-blue-200',
  },
  momentum: {
    label: 'Momentum',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    borderColor: 'border-green-200',
  },
  peak: {
    label: 'Peak',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    borderColor: 'border-orange-200',
  },
} as const;

/**
 * Determines the plan phase based on week number and total duration.
 * Divides the plan into thirds: Initiation, Momentum, Peak.
 */
export function getPlanPhase(weekNumber: number, totalWeeks: number): PlanPhase {
  const phaseLength = totalWeeks / 3;

  if (weekNumber <= phaseLength) {
    return 'initiation';
  } else if (weekNumber <= phaseLength * 2) {
    return 'momentum';
  } else {
    return 'peak';
  }
}

/**
 * Groups weeks by phase and returns phase boundaries.
 */
export function getPhaseWeekRanges(totalWeeks: number): Array<{ phase: PlanPhase; startWeek: number; endWeek: number }> {
  const phaseLength = Math.ceil(totalWeeks / 3);

  return [
    {
      phase: 'initiation',
      startWeek: 1,
      endWeek: Math.min(phaseLength, totalWeeks),
    },
    {
      phase: 'momentum',
      startWeek: phaseLength + 1,
      endWeek: Math.min(phaseLength * 2, totalWeeks),
    },
    {
      phase: 'peak',
      startWeek: phaseLength * 2 + 1,
      endWeek: totalWeeks,
    },
  ].filter((p) => p.startWeek <= totalWeeks);
}

/**
 * Badge displaying the current plan phase with week range.
 */
export function PhaseBadge({ phase, weekRange }: PhaseBadgeProps) {
  const config = PHASE_CONFIG[phase];

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border ${config.bgColor} ${config.borderColor}`}
    >
      <span className={`text-sm font-medium ${config.textColor}`}>
        {config.label}
      </span>
      <span className={`text-xs ${config.textColor} opacity-75`}>
        {weekRange}
      </span>
    </div>
  );
}
