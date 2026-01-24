import { useState } from 'react';
import type { NutritionPlan, DualTrackAnalysis, RecalibrationOption } from '../../api/types';

interface AdjustStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: NutritionPlan;
  analysis: DualTrackAnalysis;
  onApply: (option: RecalibrationOption) => void;
}

type AdjustmentMode = 'push_harder' | 'extend_timeline' | 'custom';

const FEASIBILITY_COLORS = {
  Achievable: 'text-green-600 bg-green-100',
  Moderate: 'text-yellow-600 bg-yellow-100',
  Ambitious: 'text-red-600 bg-red-100',
} as const;

export function AdjustStrategyModal({
  isOpen,
  onClose,
  plan,
  analysis,
  onApply,
}: AdjustStrategyModalProps) {
  const [selectedMode, setSelectedMode] = useState<AdjustmentMode | null>(null);

  if (!isOpen) return null;

  // Find the recalibration options from analysis
  const increaseDeficitOption = analysis.options?.find((o) => o.type === 'increase_deficit');
  const extendTimelineOption = analysis.options?.find((o) => o.type === 'extend_timeline');
  const keepCurrentOption = analysis.options?.find((o) => o.type === 'keep_current');

  const weeksRemaining = plan.durationWeeks - analysis.currentWeek;
  const weightToGoal = analysis.actualWeightKg - plan.goalWeightKg;

  const handleApply = () => {
    if (selectedMode === 'push_harder' && increaseDeficitOption) {
      onApply(increaseDeficitOption);
    } else if (selectedMode === 'extend_timeline' && extendTimelineOption) {
      onApply(extendTimelineOption);
    } else if (keepCurrentOption) {
      onApply(keepCurrentOption);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Adjust Strategy</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Status Summary */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm text-gray-600">
                You are currently{' '}
                <span className={`font-semibold ${analysis.varianceKg > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {Math.abs(analysis.varianceKg).toFixed(1)} kg {analysis.varianceKg > 0 ? 'above' : 'below'}
                </span>{' '}
                your target weight.
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {weeksRemaining} weeks remaining &middot; {Math.abs(weightToGoal).toFixed(1)} kg to goal
              </div>
            </div>

            {/* Option 1: Push Harder */}
            {increaseDeficitOption && (
              <button
                onClick={() => setSelectedMode('push_harder')}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  selectedMode === 'push_harder'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-xl">🎯</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">Push Harder</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${FEASIBILITY_COLORS[increaseDeficitOption.feasibilityTag]}`}>
                        {increaseDeficitOption.feasibilityTag}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Maintain end date, increase deficit
                    </div>
                    <div className="text-sm font-medium text-gray-900 mt-2">
                      New target: {increaseDeficitOption.newParameter}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {increaseDeficitOption.impact}
                    </div>
                  </div>
                </div>
              </button>
            )}

            {/* Option 2: Extend Timeline */}
            {extendTimelineOption && (
              <button
                onClick={() => setSelectedMode('extend_timeline')}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  selectedMode === 'extend_timeline'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-xl">📅</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">Extend Timeline</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${FEASIBILITY_COLORS[extendTimelineOption.feasibilityTag]}`}>
                        {extendTimelineOption.feasibilityTag}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Maintain current intake, add time
                    </div>
                    <div className="text-sm font-medium text-gray-900 mt-2">
                      New duration: {extendTimelineOption.newParameter}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {extendTimelineOption.impact}
                    </div>
                  </div>
                </div>
              </button>
            )}

            {/* No options available message */}
            {!increaseDeficitOption && !extendTimelineOption && (
              <div className="text-center py-8 text-gray-500">
                <div className="text-lg mb-2">No adjustments needed</div>
                <div className="text-sm">You are currently on track with your plan.</div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!selectedMode}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
