import type { SessionPhase } from '../../api/types';

interface PhaseSegment {
  phase: SessionPhase;
  count: number;
}

interface PhaseProgressBarProps {
  segments: PhaseSegment[];
  currentPhase: SessionPhase;
  completedPhases: Set<SessionPhase>;
}

const PHASE_CONFIG: Record<SessionPhase, { label: string; active: string; done: string; glow: string }> = {
  prepare:  { label: 'PREPARE',  active: 'bg-amber-500',  done: 'bg-amber-700',  glow: 'shadow-amber-500/60' },
  practice: { label: 'PRACTICE', active: 'bg-teal-500',   done: 'bg-teal-700',   glow: 'shadow-teal-500/60' },
  play:     { label: 'PLAY',     active: 'bg-teal-500',   done: 'bg-teal-700',   glow: 'shadow-teal-500/60' },
  push:     { label: 'PUSH',     active: 'bg-violet-500', done: 'bg-violet-700', glow: 'shadow-violet-500/60' },
  ponder:   { label: 'PONDER',   active: 'bg-blue-500',   done: 'bg-blue-700',   glow: 'shadow-blue-500/60' },
};

const PHASE_ORDER: SessionPhase[] = ['prepare', 'practice', 'push', 'ponder'];

/**
 * Four-segment progress bar showing phase completion.
 * Segments are proportional to exercise count. Active phase pulses.
 */
export function PhaseProgressBar({ segments, currentPhase, completedPhases }: PhaseProgressBarProps) {
  const total = segments.reduce((sum, s) => sum + s.count, 0);
  if (total === 0) return null;

  const segmentsByPhase = new Map(segments.map((s) => [s.phase, s]));
  const visiblePhases = PHASE_ORDER.filter((p) => (segmentsByPhase.get(p)?.count ?? 0) > 0);

  return (
    <div className="px-4 pt-3 pb-1">
      {/* Bar */}
      <div className="flex gap-1 h-2 rounded-full overflow-hidden">
        {visiblePhases.map((phase) => {
          const count = segmentsByPhase.get(phase)?.count ?? 0;
          const widthPct = (count / total) * 100;
          const cfg = PHASE_CONFIG[phase];
          const isDone = completedPhases.has(phase);
          const isActive = phase === currentPhase;

          return (
            <div
              key={phase}
              style={{ width: `${widthPct}%` }}
              className={`
                h-full rounded-full transition-all duration-500
                ${isDone ? cfg.done : isActive ? cfg.active : 'bg-slate-700'}
                ${isActive ? `shadow-md ${cfg.glow} animate-pulse` : ''}
              `}
            />
          );
        })}
      </div>

      {/* Labels */}
      <div className="flex mt-1">
        {visiblePhases.map((phase) => {
          const count = segmentsByPhase.get(phase)?.count ?? 0;
          const widthPct = (count / total) * 100;
          const cfg = PHASE_CONFIG[phase];
          const isDone = completedPhases.has(phase);
          const isActive = phase === currentPhase;

          return (
            <div
              key={phase}
              style={{ width: `${widthPct}%` }}
              className="flex items-center gap-1 overflow-hidden"
            >
              <span
                className={`text-[9px] font-bold tracking-widest truncate transition-colors
                  ${isActive ? `${cfg.active.replace('bg-', 'text-')} opacity-100` : isDone ? 'text-slate-500' : 'text-slate-600'}
                `}
              >
                {cfg.label}
              </span>
              {isDone && (
                <svg className="w-2.5 h-2.5 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
