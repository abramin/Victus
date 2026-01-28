import { useMemo } from 'react';
import type { ProgramDayInput, ArchetypeConfig } from '../../api/types';
import { simulateGhostLoad } from '../../utils/simulateGhostLoad';
import { BodyMapVisualizer } from '../body-map/BodyMapVisualizer';

interface GhostLoadPanelProps {
  dayTemplates: ProgramDayInput[];
  intensityScale: number;
  archetypes: ArchetypeConfig[];
  /** Compact mode for sidebar display - stacks vertically with smaller body map */
  compact?: boolean;
}

/** RPE zone color — mirrors RPEDial's zoneColor logic. */
function rpeZoneColor(rpe: number): string {
  if (rpe <= 4) return '#22c55e';
  if (rpe <= 6) return '#eab308';
  if (rpe <= 8) return '#f97316';
  return '#ef4444';
}

/**
 * Real-time fatigue preview panel for the Program Builder.
 *
 * Simulates one week of training against the backend fatigue engine formulas
 * and renders the predicted muscle state on a BodyMapVisualizer. Shows a
 * Neural Overload warning badge when 3+ consecutive days hit effective RPE ≥ 8.
 */
export function GhostLoadPanel({
  dayTemplates,
  intensityScale,
  archetypes,
  compact = false,
}: GhostLoadPanelProps) {
  const simulation = useMemo(
    () => simulateGhostLoad(dayTemplates, intensityScale, archetypes),
    [dayTemplates, intensityScale, archetypes]
  );

  // Loading state: archetypes not yet fetched
  if (archetypes.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-slate-500 text-sm">
        Loading load preview...
      </div>
    );
  }

  // No days configured yet
  if (dayTemplates.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-slate-500 text-sm">
        Add training days to see fatigue preview
      </div>
    );
  }

  // Compact mode: vertical stacking for sidebar
  if (compact) {
    return (
      <div className="flex flex-col gap-3">
        {/* Neural Overload Warning Badge - compact */}
        {simulation.neuralOverload && (
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-red-900/20 border border-red-800/30 rounded-lg">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-medium text-red-400">Neural Overload</span>
          </div>
        )}

        {/* Body Map - smaller in compact mode */}
        <div className="flex justify-center">
          <BodyMapVisualizer muscles={simulation.muscleFatigues} size="xs" />
        </div>

        {/* Horizontal RPE strip */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-500 font-medium">Daily Load</span>
          <div className="flex gap-1">
            {simulation.dailyEffectiveRPEs.map((rpe, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5 flex-1">
                <div
                  className="w-full h-2 rounded-sm"
                  style={{ backgroundColor: rpeZoneColor(rpe) }}
                  title={`Day ${i + 1}: RPE ${rpe.toFixed(1)}`}
                />
                <span className="text-[10px] text-slate-500">D{i + 1}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Overall score - compact */}
        <div className="pt-2 border-t border-slate-700 text-center">
          <span className="text-xs text-slate-500">Total Fatigue</span>
          <div className="text-lg font-semibold text-white">
            {simulation.muscleFatigues.reduce((sum, m) => sum + m.fatiguePercent, 0).toFixed(0)}%
          </div>
        </div>
      </div>
    );
  }

  // Standard mode: side by side layout
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Neural Overload Warning Badge */}
      {simulation.neuralOverload && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-900/20 border border-red-800/30 rounded-lg">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-medium text-red-400">Neural Overload</span>
          <span className="text-xs text-red-500">3+ consecutive high-RPE days detected</span>
        </div>
      )}

      {/* Body Map + Per-Day RPE Strip side by side */}
      <div className="flex items-start gap-4">
        <BodyMapVisualizer muscles={simulation.muscleFatigues} size="sm" />

        {/* Per-day RPE color strip */}
        <div className="flex flex-col gap-2 pt-2">
          <span className="text-xs text-slate-500 font-medium">RPE / Day</span>
          <div className="flex flex-col gap-1.5">
            {simulation.dailyEffectiveRPEs.map((rpe, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: rpeZoneColor(rpe) }}
                />
                <span className="text-xs text-slate-400">
                  D{i + 1} <span className="text-slate-500">RPE {rpe.toFixed(1)}</span>
                </span>
              </div>
            ))}
          </div>
          {/* Overall score */}
          <div className="mt-2 pt-2 border-t border-slate-700">
            <span className="text-xs text-slate-500">Overall</span>
            <div className="text-sm font-semibold text-white">
              {simulation.muscleFatigues.reduce((sum, m) => sum + m.fatiguePercent, 0).toFixed(0)}
              <span className="text-xs font-normal text-slate-500 ml-1">total %</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
