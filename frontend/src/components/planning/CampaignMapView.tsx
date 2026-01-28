import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { WeeklyTarget, NutritionPlan } from '../../api/types';
import { Card } from '../common/Card';
import { getPhaseWeekRanges, getPlanPhase, type PlanPhase } from './PhaseBadge';
import { PhaseContextHeader } from './PhaseContextHeader';
import { ActiveWeekCard } from './ActiveWeekCard';
import { FutureWeekCard } from './FutureWeekCard';
import { PastWeekCard } from './PastWeekCard';
import { staggerContainerFast } from '../../lib/animations';

interface CampaignMapViewProps {
  weeklyTargets: WeeklyTarget[];
  currentWeek: number;
  showPhases?: boolean;
  showSparklines?: boolean;
  plan?: NutritionPlan;
}

export function CampaignMapView({
  weeklyTargets,
  currentWeek,
  showPhases = true,
  showSparklines = true,
  plan,
}: CampaignMapViewProps) {
  const [expandedFutureWeeks, setExpandedFutureWeeks] = useState<Set<number>>(new Set());

  // Group weeks by temporal position
  const pastWeeks = useMemo(
    () => weeklyTargets.filter((w) => w.weekNumber < currentWeek),
    [weeklyTargets, currentWeek]
  );

  const activeWeek = useMemo(
    () => weeklyTargets.find((w) => w.weekNumber === currentWeek),
    [weeklyTargets, currentWeek]
  );

  const futureWeeks = useMemo(
    () => weeklyTargets.filter((w) => w.weekNumber > currentWeek),
    [weeklyTargets, currentWeek]
  );

  const currentPhase: PlanPhase = showPhases
    ? getPlanPhase(currentWeek, weeklyTargets.length)
    : 'initiation';

  const phaseRanges = useMemo(() => {
    if (!showPhases || weeklyTargets.length === 0) return [];
    return getPhaseWeekRanges(weeklyTargets.length);
  }, [showPhases, weeklyTargets.length]);

  const currentPhaseRange = phaseRanges.find(
    (r) => currentWeek >= r.startWeek && currentWeek <= r.endWeek
  );

  const campaignProgress = weeklyTargets.length === 0
    ? 0
    : Math.round((currentWeek / weeklyTargets.length) * 100);

  const weekInPhase = currentPhaseRange
    ? currentWeek - currentPhaseRange.startWeek + 1
    : 1;

  const totalPhaseWeeks = currentPhaseRange
    ? currentPhaseRange.endWeek - currentPhaseRange.startWeek + 1
    : 1;

  const toggleFutureWeekExpanded = (weekNumber: number) => {
    setExpandedFutureWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekNumber)) {
        next.delete(weekNumber);
      } else {
        next.add(weekNumber);
      }
      return next;
    });
  };

  if (!activeWeek) {
    return (
      <Card title="Campaign Map">
        <div className="text-center py-12 text-slate-400">
          No active week data available
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-6">
        {/* Phase Context Header */}
        {showPhases && (
          <PhaseContextHeader
            currentPhase={currentPhase}
            currentWeekInPhase={weekInPhase}
            totalPhaseWeeks={totalPhaseWeeks}
            planProgress={campaignProgress}
            planId={plan?.id}
            currentWeek={currentWeek}
          />
        )}

        {/* Horizontal Timeline */}
        <div className="relative">
          {/* Connecting line (horizontal) */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-700/30 -z-10" />

          {/* Timeline Container - Horizontal scroll on desktop, vertical stack on mobile */}
          <motion.div
            variants={staggerContainerFast}
            initial="hidden"
            animate="show"
            className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:overflow-x-auto lg:pb-4"
          >
            {/* Past Weeks */}
            {pastWeeks.map((week) => (
              <PastWeekCard
                key={week.weekNumber}
                weekData={week}
                phase={getPlanPhase(week.weekNumber, weeklyTargets.length)}
                showSparkline={showSparklines}
              />
            ))}

            {/* Active Week (Hero) */}
            <ActiveWeekCard weekData={activeWeek} phase={currentPhase} />

            {/* Future Weeks */}
            {futureWeeks.map((week) => (
              <FutureWeekCard
                key={week.weekNumber}
                weekData={week}
                phase={getPlanPhase(week.weekNumber, weeklyTargets.length)}
                isExpanded={expandedFutureWeeks.has(week.weekNumber)}
                onToggleExpand={() => toggleFutureWeekExpanded(week.weekNumber)}
              />
            ))}
          </motion.div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500/30 border border-emerald-500" />
            <span>Active Week</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500/30 border border-green-500" />
            <span>Complete (5+ days logged)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500/30 border border-yellow-500" />
            <span>Partial</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-500/30 border border-slate-600" />
            <span>Upcoming</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
