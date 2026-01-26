import type { TrainingOverride, TrainingType } from '../../api/types';
import { TRAINING_LABELS, TRAINING_ICONS } from '../../constants';

interface TrainingOverrideAlertProps {
  overrides: TrainingOverride[];
  onAccept?: () => void;
  onDismiss?: () => void;
}

function TrainingTypeDisplay({ type }: { type: TrainingType }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span>{TRAINING_ICONS[type]}</span>
      <span>{TRAINING_LABELS[type]}</span>
    </span>
  );
}

export function TrainingOverrideAlert({
  overrides,
  onAccept,
  onDismiss,
}: TrainingOverrideAlertProps) {
  if (overrides.length === 0) return null;

  return (
    <div className="bg-red-900/30 border border-red-700 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-900/50 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-red-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 2L4 6v6c0 5.25 3.5 9.74 8 11 4.5-1.26 8-5.75 8-11V6l-8-4z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4M12 16h.01" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-red-400">System Override Active</h3>
          <p className="text-sm text-gray-400 mt-0.5">
            CNS protection triggered. Training intensity reduced to prevent overtraining.
          </p>
        </div>
      </div>

      {/* Override list */}
      <div className="space-y-2 mb-4">
        {overrides.map((override, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 p-3 bg-gray-900/50 rounded-lg text-sm"
          >
            <span className="text-gray-400 line-through">
              <TrainingTypeDisplay type={override.originalType} />
              <span className="ml-1">({override.originalDurationMin}min)</span>
            </span>
            <svg
              className="w-4 h-4 text-gray-500 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
            <span className="text-green-400">
              <TrainingTypeDisplay type={override.recommendedType} />
              <span className="ml-1">({override.recommendedDurationMin}min)</span>
            </span>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      {(onAccept || onDismiss) && (
        <div className="flex gap-3">
          {onAccept && (
            <button
              type="button"
              onClick={onAccept}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-500 transition-colors"
            >
              Accept Recommendations
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              Train As Planned
            </button>
          )}
        </div>
      )}

      {/* Warning if dismissing */}
      {onDismiss && (
        <p className="text-xs text-gray-500 mt-3 text-center">
          Training at high intensity while depleted may delay recovery
        </p>
      )}
    </div>
  );
}

// Compact inline version for use in cards
export function TrainingOverrideBanner({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-red-900/30 border border-red-700 rounded-lg">
      <svg
        className="w-4 h-4 text-red-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <span className="text-sm text-red-400">
        {count} training adjustment{count !== 1 ? 's' : ''} recommended
      </span>
    </div>
  );
}
