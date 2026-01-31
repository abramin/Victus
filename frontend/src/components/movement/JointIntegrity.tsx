import type { Movement } from '../../api/types';
import type { BuilderEntry } from './useSessionBuilder';

interface JointIntegrityProps {
  movements: Movement[];
  entries: BuilderEntry[];
}

// SVG body outline with joint hotspots
const JOINT_POSITIONS: Record<string, { cx: number; cy: number; label: string }> = {
  shoulders: { cx: 50, cy: 22, label: 'Shoulders' },
  elbows: { cx: 62, cy: 36, label: 'Elbows' },
  wrists: { cx: 68, cy: 48, label: 'Wrists' },
  spine: { cx: 50, cy: 40, label: 'Spine' },
  hips: { cx: 50, cy: 52, label: 'Hips' },
  knees: { cx: 50, cy: 70, label: 'Knees' },
  ankles: { cx: 50, cy: 88, label: 'Ankles' },
};

export function JointIntegrity({ movements, entries }: JointIntegrityProps) {
  // Aggregate joint stress from builder entries (or all movements if none)
  const active = entries.length > 0
    ? entries.map((e) => e.movement)
    : movements;

  const stressMap = new Map<string, number>();
  for (const m of active) {
    for (const [joint, stress] of Object.entries(m.jointStress)) {
      stressMap.set(joint, Math.max(stressMap.get(joint) ?? 0, stress));
    }
  }

  const guardCount = [...stressMap.values()].filter((s) => s > 0.5).length;

  return (
    <div className="bg-slate-900 border border-slate-700/60 rounded-xl p-4 flex flex-col h-full">
      <h2 className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase mb-3">
        Joint Integrity
      </h2>

      {/* Body SVG */}
      <div className="flex-1 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full max-w-[140px] h-auto">
          {/* Body silhouette */}
          <ellipse cx="50" cy="12" rx="8" ry="9" fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
          <rect x="42" y="20" width="16" height="28" rx="4" fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
          {/* Arms */}
          <line x1="42" y1="24" x2="28" y2="48" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
          <line x1="58" y1="24" x2="72" y2="48" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
          {/* Legs */}
          <line x1="45" y1="48" x2="40" y2="78" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
          <line x1="55" y1="48" x2="60" y2="78" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
          <line x1="40" y1="78" x2="38" y2="92" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
          <line x1="60" y1="78" x2="62" y2="92" stroke="#334155" strokeWidth="3" strokeLinecap="round" />

          {/* Joint hotspots */}
          {Object.entries(JOINT_POSITIONS).map(([joint, pos]) => {
            const stress = stressMap.get(joint) ?? 0;
            if (stress < 0.1) return null;
            const color = stress > 0.6 ? '#ef4444' : stress > 0.3 ? '#f59e0b' : '#22c55e';
            return (
              <circle
                key={joint}
                cx={pos.cx}
                cy={pos.cy}
                r={3 + stress * 3}
                fill={color}
                opacity={0.7 + stress * 0.3}
              >
                <animate attributeName="opacity" values={`${0.5 + stress * 0.3};${0.8 + stress * 0.2};${0.5 + stress * 0.3}`} dur="2s" repeatCount="indefinite" />
              </circle>
            );
          })}
        </svg>
      </div>

      <p className="text-[10px] text-slate-500 mt-2 text-center">
        <span className="text-amber-400 font-medium">{guardCount}</span> JOINT GUARDS ACTIVE
      </p>
    </div>
  );
}
