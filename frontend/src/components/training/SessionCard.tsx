import type { TrainingType } from '../../api/types';
import { TRAINING_LABELS, TRAINING_ICONS, TRAINING_COLORS } from '../../constants';

// Load score coefficients matching backend
const TRAINING_LOAD_SCORES: Record<TrainingType, number> = {
  rest: 0,
  qigong: 0.5,
  mobility: 0.5,
  walking: 1,
  cycle: 2,
  gmb: 3,
  run: 3,
  row: 3,
  calisthenics: 3,
  mixed: 4,
  strength: 5,
  hiit: 5,
};

const DEFAULT_RPE = 5;

const getLoadTone = (score: number) => {
  if (score <= 0) return { label: 'No Load', className: 'text-gray-500', barColor: 'bg-gray-600' };
  if (score <= 1) return { label: 'Very Low', className: 'text-emerald-400', barColor: 'bg-emerald-500' };
  if (score <= 3) return { label: 'Low', className: 'text-green-400', barColor: 'bg-green-500' };
  if (score <= 6) return { label: 'Moderate', className: 'text-yellow-400', barColor: 'bg-yellow-500' };
  if (score <= 10) return { label: 'High', className: 'text-orange-400', barColor: 'bg-orange-500' };
  return { label: 'Max', className: 'text-red-400', barColor: 'bg-red-500' };
};

interface SessionCardProps {
  /** Training type */
  type: TrainingType;
  /** Duration in minutes */
  durationMin: number;
  /** Rate of perceived exertion (1-10) */
  rpe?: number;
  /** Optional notes */
  notes?: string;
  /** Callback when edit button is clicked */
  onEdit?: () => void;
}

/**
 * Receipt-style session card for displaying logged workout sessions.
 * Shows activity type with icon, duration, load score with visual bar, and notes.
 */
export function SessionCard({
  type,
  durationMin,
  rpe,
  notes,
  onEdit,
}: SessionCardProps) {
  const rpeValue = type === 'rest' ? 0 : rpe ?? DEFAULT_RPE;
  const loadScore = type === 'rest'
    ? 0
    : Math.round((TRAINING_LOAD_SCORES[type] ?? 1) * (durationMin / 60) * (rpeValue / 3) * 100) / 100;
  const loadTone = getLoadTone(loadScore);
  const colors = TRAINING_COLORS[type];

  // Load bar percentage (max load ~15 for scaling)
  const loadPercent = Math.min((loadScore / 15) * 100, 100);

  if (type === 'rest') {
    return (
      <div className={`${colors.bg} rounded-xl p-4 border border-gray-700`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{TRAINING_ICONS[type]}</span>
            <span className="font-medium text-gray-300">{TRAINING_LABELS[type]}</span>
          </div>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="text-gray-500 hover:text-gray-300 p-1 transition-colors"
              aria-label="Edit session"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${colors.bg} rounded-xl p-4 border border-gray-700`}>
      {/* Header: Type + Edit Button */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{TRAINING_ICONS[type]}</span>
          <div>
            <span className="font-medium text-white">{TRAINING_LABELS[type]}</span>
            <div className="flex items-center gap-2 text-sm text-gray-400 mt-0.5">
              <span className="flex items-center gap-1">
                <span>⏱</span>
                {durationMin} min
              </span>
              <span>•</span>
              <span>RPE {rpeValue}</span>
            </div>
          </div>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-gray-500 hover:text-gray-300 p-1 transition-colors"
            aria-label="Edit session"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        )}
      </div>

      {/* Load Score with Visual Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <span>⚡</span>
            Load
          </span>
          <span className={`text-sm font-medium ${loadTone.className}`}>
            {loadScore.toFixed(1)} ({loadTone.label})
          </span>
        </div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${loadTone.barColor} transition-all duration-300`}
            style={{ width: `${loadPercent}%` }}
          />
        </div>
      </div>

      {/* Notes */}
      {notes && notes.trim() && (
        <div className="text-xs text-gray-400 italic border-t border-gray-700 pt-2 mt-2">
          "{notes}"
        </div>
      )}
    </div>
  );
}
