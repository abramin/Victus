import { Panel } from '../common/Panel';

interface Supplement {
  id: string;
  label: string;
  sublabel: string;
  value: number;
  enabled: boolean;
}

interface SupplementsPanelProps {
  supplements: Supplement[];
  onSupplementChange: (id: string, enabled: boolean, value: number) => void;
  onApplyDefaults: () => void;
  onReset: () => void;
  isRestDay?: boolean;
  hasPerformanceWorkout?: boolean;
  trainingDescription?: string;
}

export function SupplementsPanel({
  supplements,
  onSupplementChange,
  onApplyDefaults,
  onReset,
  isRestDay = false,
  hasPerformanceWorkout = false,
  trainingDescription,
}: SupplementsPanelProps) {

  // Filter out intra-workout on rest days
  const visibleSupplements = isRestDay
    ? supplements.filter(s => s.id !== 'intra_carbs')
    : supplements;

  return (
    <Panel title="Supplements Taken">
      {/* Training Context */}
      {trainingDescription && (
        <div className="mb-4 pb-3 border-b border-gray-800">
          <p className="text-xs text-gray-400">{trainingDescription}</p>
        </div>
      )}

      <div className="space-y-4">
        {visibleSupplements.map((supp) => {
          const isIntraCarbs = supp.id === 'intra_carbs';
          const showAutoIndicator = isIntraCarbs && hasPerformanceWorkout && supp.enabled;

          return (
            <div key={supp.id} className="flex items-center gap-3">
              {/* Toggle */}
              <button
                onClick={() => onSupplementChange(supp.id, !supp.enabled, supp.value)}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  supp.enabled ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    supp.enabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>

              {/* Labels */}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500">{supp.sublabel}</div>
                <div className="text-sm text-gray-300 flex items-center gap-2">
                  {supp.label}
                  {showAutoIndicator && (
                    <span className="text-xs text-blue-400">Auto-enabled</span>
                  )}
                </div>
              </div>

              {/* Value Input */}
              <div className="w-16">
                <input
                  type="number"
                  value={supp.value}
                  onChange={(e) => onSupplementChange(supp.id, supp.enabled, parseInt(e.target.value) || 0)}
                  disabled={!supp.enabled}
                  className={`w-full px-2 py-1 text-sm rounded border text-right ${
                    supp.enabled
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-gray-800/50 border-gray-800 text-gray-600'
                  }`}
                />
              </div>
              <span className="text-xs text-gray-500 w-4">g</span>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={onApplyDefaults}
          className="flex-1 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
        >
          Apply defaults
        </button>
        <button
          onClick={onReset}
          className="flex-1 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
        >
          Reset
        </button>
      </div>

      </Panel>
  );
}
