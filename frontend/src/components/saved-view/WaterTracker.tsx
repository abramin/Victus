interface WaterTrackerProps {
  /** Current water intake in liters */
  intakeL: number;
  /** Target water intake in liters */
  targetL: number;
  /** Callback when water is added */
  onAddWater: (amountL: number) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Water tracking component with progress display and quick add buttons.
 */
export function WaterTracker({
  intakeL,
  targetL,
  onAddWater,
  className = '',
}: WaterTrackerProps) {
  const progress = targetL > 0 ? Math.min((intakeL / targetL) * 100, 100) : 0;
  const isComplete = intakeL >= targetL;

  return (
    <div className={`${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">💧</span>
          <span className="text-sm text-gray-400">Water</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`text-lg font-semibold ${isComplete ? 'text-emerald-400' : 'text-white'}`}>
            {intakeL.toFixed(1)}
          </span>
          <span className="text-sm text-gray-500">/ {targetL.toFixed(1)} L</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isComplete ? 'bg-emerald-500' : 'bg-blue-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Quick Add Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onAddWater(0.25)}
          className="flex-1 px-2 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
        >
          +250ml
        </button>
        <button
          type="button"
          onClick={() => onAddWater(0.5)}
          className="flex-1 px-2 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
        >
          +500ml
        </button>
        <button
          type="button"
          onClick={() => onAddWater(1.0)}
          className="flex-1 px-2 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
        >
          +1L
        </button>
      </div>
    </div>
  );
}
