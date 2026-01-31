import { useEffect, useRef } from 'react';
import type { BuilderEntry } from './useSessionBuilder';

interface ChipPopoverProps {
  entry: BuilderEntry;
  anchorRect: DOMRect;
  onUpdate: (patch: Partial<Pick<BuilderEntry, 'sets' | 'reps' | 'durationMinutes'>>) => void;
  onClose: () => void;
}

function Stepper({ label, value, min, onChange }: { label: string; value: number; min: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-slate-400 w-10">{label}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs flex items-center justify-center"
        >−</button>
        <span className="text-xs font-mono text-white w-6 text-center">{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs flex items-center justify-center"
        >+</button>
      </div>
    </div>
  );
}

export function ChipPopover({ entry, anchorRect, onUpdate, onClose }: ChipPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  // Position below anchor, clamped to viewport
  const top = anchorRect.bottom + 6;
  const left = Math.max(8, Math.min(anchorRect.left, window.innerWidth - 180));

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-3 w-44 space-y-2"
      style={{ top, left }}
    >
      <p className="text-[11px] font-semibold text-white truncate mb-2">{entry.movement.name}</p>

      <Stepper label="Sets" value={entry.sets} min={1} onChange={(v) => onUpdate({ sets: v })} />
      <Stepper label="Reps" value={entry.reps} min={1} onChange={(v) => onUpdate({ reps: v })} />
      <Stepper label="Min" value={entry.durationMinutes} min={1} onChange={(v) => onUpdate({ durationMinutes: v })} />
    </div>
  );
}
