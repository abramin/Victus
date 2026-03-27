import type { SessionPhase } from '../../api/types';
import type { ExerciseDef } from './exerciseLibrary';

interface QueueItem {
  exerciseDef: ExerciseDef;
  phase: SessionPhase;
  durationSec: number;
}

interface ExerciseQueueRailProps {
  upcoming: QueueItem[];
}

const PHASE_DOT: Record<SessionPhase, string> = {
  prepare:  'bg-amber-500',
  practice: 'bg-teal-500',
  play:     'bg-teal-500',
  push:     'bg-violet-500',
  ponder:   'bg-blue-500',
};

const PHASE_LABEL: Record<SessionPhase, string> = {
  prepare:  'PREPARE',
  practice: 'PRACTICE',
  play:     'PLAY',
  push:     'PUSH',
  ponder:   'PONDER',
};

function formatDur(sec: number): string {
  if (sec <= 0) return '';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m${s}s`;
}

/**
 * Horizontal scrollable strip showing upcoming exercises as pill chips.
 * Phase dividers are inserted when the phase changes between items.
 */
export function ExerciseQueueRail({ upcoming }: ExerciseQueueRailProps) {
  if (upcoming.length === 0) return null;

  // Build render list with phase dividers
  interface RailItem {
    type: 'exercise' | 'divider';
    item?: QueueItem;
    phase?: SessionPhase;
    key: string;
  }

  const railItems: RailItem[] = [];
  let lastPhase: SessionPhase | null = null;

  upcoming.forEach((item, i) => {
    if (item.phase !== lastPhase) {
      if (lastPhase !== null) {
        railItems.push({ type: 'divider', phase: item.phase, key: `div-${i}` });
      }
      lastPhase = item.phase;
    }
    railItems.push({ type: 'exercise', item, key: `ex-${i}` });
  });

  return (
    <div className="px-4 pb-4">
      <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-2">Up Next</p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {railItems.map((ri) => {
          if (ri.type === 'divider') {
            return (
              <div key={ri.key} className="flex-shrink-0 flex items-center">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-px h-3 bg-slate-700" />
                  <span className="text-[8px] text-slate-600 font-bold tracking-wider whitespace-nowrap">
                    {PHASE_LABEL[ri.phase!]}
                  </span>
                  <div className="w-px h-3 bg-slate-700" />
                </div>
              </div>
            );
          }

          const { exerciseDef, phase, durationSec } = ri.item!;
          const dot = PHASE_DOT[phase];
          const dur = formatDur(durationSec);

          return (
            <div
              key={ri.key}
              className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5
                         bg-slate-800/70 border border-slate-700/50 rounded-full
                         max-w-[140px]"
            >
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
              <span className="text-xs text-slate-300 truncate">{exerciseDef.name}</span>
              {dur && (
                <span className="text-[10px] text-slate-500 flex-shrink-0">{dur}</span>
              )}
            </div>
          );
        })}

        {upcoming.length === 0 && (
          <span className="text-xs text-slate-600 italic">Last exercise</span>
        )}
      </div>
    </div>
  );
}
