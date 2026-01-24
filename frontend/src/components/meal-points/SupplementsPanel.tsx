import { useState } from 'react';
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
}

export function SupplementsPanel({
  supplements,
  onSupplementChange,
  onApplyDefaults,
  onReset
}: SupplementsPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <Panel title="Supplements Taken">
      <div className="space-y-4">
        {supplements.map((supp) => (
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
              <div className="text-sm text-gray-300">{supp.label}</div>
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
        ))}
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

      {/* Advanced Section */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full mt-4 flex items-center justify-between text-sm text-gray-400 hover:text-white transition-colors"
      >
        <span>Assumptions (Advanced)</span>
        <svg
          className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showAdvanced && (
        <div className="mt-3 p-3 bg-gray-800/50 rounded-lg text-xs text-gray-500 space-y-1">
          <p>Fruit: 10% carbs by weight</p>
          <p>Vegetables: 3% carbs by weight</p>
          <p>Maltodextrin: 96% carbs</p>
          <p>Collagen: 90% protein</p>
          <p>Whey: 88% protein</p>
        </div>
      )}
    </Panel>
  );
}
