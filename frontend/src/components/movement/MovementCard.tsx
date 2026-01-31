import type { Movement, UserMovementProgress } from '../../api/types';

const CATEGORY_COLORS: Record<string, string> = {
  locomotion: 'bg-emerald-600',
  push: 'bg-red-600',
  pull: 'bg-blue-600',
  legs: 'bg-amber-600',
  core: 'bg-purple-600',
  skill: 'bg-cyan-600',
  power: 'bg-orange-600',
};

interface MovementCardProps {
  movement: Movement;
  progress: UserMovementProgress | null;
  dimmed?: boolean;
  onSelect: () => void;
}

export function MovementCard({ movement, progress, dimmed, onSelect }: MovementCardProps) {
  const catColor = CATEGORY_COLORS[movement.category] ?? 'bg-slate-600';

  return (
    <button
      onClick={onSelect}
      disabled={dimmed}
      className={`text-left w-full bg-slate-800 rounded-xl p-5 border border-slate-700 transition-all
        ${dimmed ? 'opacity-40 cursor-not-allowed' : 'hover:border-slate-500 cursor-pointer'}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-white leading-tight">{movement.name}</h3>
        <span className={`${catColor} text-[10px] font-medium text-white px-2 py-0.5 rounded-full shrink-0`}>
          {movement.category}
        </span>
      </div>

      {/* Difficulty dots */}
      <div className="flex gap-1 mb-3">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full ${
              i < (progress?.userDifficulty ?? movement.difficulty)
                ? 'bg-blue-500'
                : 'bg-slate-700'
            }`}
          />
        ))}
      </div>

      {/* Tags */}
      {movement.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {movement.tags.map((tag) => (
            <span key={tag} className="text-[10px] text-slate-400 bg-slate-700/50 px-1.5 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Joint stress */}
      {Object.keys(movement.jointStress).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {Object.entries(movement.jointStress).map(([joint, stress]) => (
            <span
              key={joint}
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: stress > 0.6 ? 'rgba(239,68,68,0.2)' : 'rgba(100,116,139,0.2)',
                color: stress > 0.6 ? '#f87171' : '#94a3b8',
              }}
            >
              {joint} {Math.round(stress * 100)}%
            </span>
          ))}
        </div>
      )}

      {/* Primary load */}
      <p className="text-[11px] text-slate-500 mb-3">{movement.primaryLoad}</p>

      {/* Progress */}
      {progress && (
        <div className="border-t border-slate-700 pt-3 mt-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
            <span>Lv {progress.userDifficulty}</span>
            <span>{progress.successfulSessions}/3 sessions</span>
          </div>
          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${(progress.successfulSessions / 3) * 100}%` }}
            />
          </div>
          {progress.lastPerformedAt && (
            <p className="text-[10px] text-slate-500 mt-1.5">
              Last: {new Date(progress.lastPerformedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </button>
  );
}
