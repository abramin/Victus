import type { SessionPhase, ZoneState, BuilderEntry } from './useSessionBuilder';
import { zoneColorFor } from './useSessionBuilder';

const ZONE_CONFIG: Record<SessionPhase, { label: string; bg: string; text: string; border: string; empty: string }> = {
  prepare: {
    label: 'PREPARE',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    empty: 'Add mobility / locomotion',
  },
  practice: {
    label: 'PRACTICE',
    bg: 'bg-teal-500/10',
    text: 'text-teal-400',
    border: 'border-teal-500/30',
    empty: 'Add skill / pull work',
  },
  push: {
    label: 'PUSH',
    bg: 'bg-violet-500/10',
    text: 'text-violet-400',
    border: 'border-violet-500/30',
    empty: 'Add push / legs / power',
  },
};

const PHASES: SessionPhase[] = ['prepare', 'practice', 'push'];

interface SessionCanvasProps {
  zones: ZoneState;
  onRemove: (entryId: string) => void;
  onChipClick: (entryId: string, rect: DOMRect) => void;
  totalLoad: number;
  totalDuration: number;
  onDeploy: () => void;
}

export function SessionCanvas({ zones, onRemove, onChipClick, totalLoad, totalDuration, onDeploy }: SessionCanvasProps) {
  return (
    <div className="bg-slate-900 border border-slate-700/60 rounded-xl p-4 flex flex-col h-full">
      <h2 className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase mb-3">
        Session Canvas
      </h2>

      <div className="flex-1 grid grid-cols-3 gap-3 min-h-0">
        {PHASES.map((phase) => {
          const cfg = ZONE_CONFIG[phase];
          const entries = zones[phase];
          return (
            <div key={phase} className="flex flex-col min-h-0">
              {/* Phase badge */}
              <div className={`${cfg.bg} ${cfg.text} px-2 py-1 rounded text-[9px] font-bold tracking-widest text-center mb-2`}>
                {cfg.label}
              </div>

              {/* Drop zone */}
              <div className={`flex-1 flex flex-col gap-1.5 border border-dashed ${cfg.border} rounded-lg p-2 overflow-y-auto`}>
                {entries.length === 0 ? (
                  <p className="text-[10px] text-slate-600 text-center my-auto">{cfg.empty}</p>
                ) : (
                  entries.map((entry) => (
                    <EntryChip
                      key={entry.id}
                      entry={entry}
                      onClick={onChipClick}
                      onRemove={onRemove}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Deploy footer */}
      {totalLoad > 0 && (
        <div className="mt-3 flex items-center justify-between border-t border-slate-700/40 pt-3">
          <span className="text-[10px] text-slate-400 font-mono">
            Est. Duration: <span className="text-white font-semibold">{totalDuration}</span> min
          </span>
          <button
            onClick={onDeploy}
            className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 hover:animate-pulse text-white text-xs font-bold tracking-wider rounded-lg transition-all shadow-lg active:scale-95"
          >
            DEPLOY SESSION ▶
          </button>
        </div>
      )}
    </div>
  );
}

function EntryChip({ entry, onClick, onRemove }: {
  entry: BuilderEntry;
  onClick: (id: string, rect: DOMRect) => void;
  onRemove: (id: string) => void;
}) {
  const color = zoneColorFor(entry.movement.category).base;

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    onClick(entry.id, e.currentTarget.getBoundingClientRect());
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    onRemove(entry.id);
  }

  return (
    <button
      onClick={handleClick}
      className={`${color} text-white text-[10px] font-medium px-2 py-1.5 rounded flex items-center justify-between gap-1 w-full hover:opacity-90 transition-opacity`}
    >
      <span className="truncate">{entry.movement.name}</span>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[8px] text-white/60">{entry.sets}×{entry.reps}</span>
        <span onClick={handleRemove} className="text-white/50 hover:text-white/80 cursor-pointer">×</span>
      </div>
    </button>
  );
}
