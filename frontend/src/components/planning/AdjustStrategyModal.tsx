import { useState, useEffect, useRef, useCallback } from 'react';
import type { NutritionPlan, DualTrackAnalysis, RecalibrationOption } from '../../api/types';
import { calculateKcalCorrection } from '../../utils/math';

interface AdjustStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: NutritionPlan;
  analysis: DualTrackAnalysis | null;
  onApply: (option: RecalibrationOption) => Promise<void>;
  recentlyRecalibrated?: boolean;
}

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
  recentlyRecalibrated = false,
}: AdjustStrategyModalProps) {
  const [selectedOption, setSelectedOption] = useState<RecalibrationOption | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedOption(null);
      setError(null);
      setIsApplying(false);
    }
  }, [isOpen]);

  // Clear error when user changes selection
  useEffect(() => {
    setError(null);
  }, [selectedOption]);

  // Focus trap + Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && !isApplying) {
      onClose();
      return;
    }
    if (e.key !== 'Tab' || !modalRef.current) return;
    const focusable = modalRef.current.querySelectorAll<HTMLElement>(
      'button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, [isApplying, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  // Handle null analysis - show loading or unavailable state
  if (!analysis) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div
          className="fixed inset-0 bg-black/50 transition-opacity z-0"
          onClick={onClose}
        />
        <div className="relative flex min-h-full items-center justify-center p-4 z-10">
          <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="text-gray-500 mb-4">Loading analysis data...</div>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Suppress options if user just applied a recalibration this session
  const increaseDeficitOption = !recentlyRecalibrated ? analysis.options?.find((o) => o.type === 'increase_deficit') : undefined;
  const extendTimelineOption = !recentlyRecalibrated ? analysis.options?.find((o) => o.type === 'extend_timeline') : undefined;

  const weeksRemaining = plan.durationWeeks - analysis.currentWeek;
  const weightToGoal = analysis.actualWeightKg - plan.goalWeightKg;
  const isWeightLoss = plan.goalWeightKg < plan.startWeightKg;

  // Use recalibrationNeeded as the single source of truth for "off track" status.
  // This ensures the modal agrees with PlanHealthPanel. The landing point is
  // informational only - it uses stale 30-day trend data after recalibration.
  const isOffTrack = analysis.recalibrationNeeded;

  const kcalCorrection = calculateKcalCorrection(analysis.landingPoint?.varianceFromGoalKg, weeksRemaining);

  const handleApply = async () => {
    if (!selectedOption) {
      setError('Please select a recalibration option');
      return;
    }

    setIsApplying(true);
    setError(null);
    try {
      await onApply(selectedOption);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply strategy adjustment');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity z-0"
        onClick={isApplying ? undefined : onClose}
      />

      {/* Modal */}
      <div className="relative flex min-h-full items-center justify-center p-4 z-10">
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="adjust-strategy-title"
          className="relative bg-white rounded-lg shadow-xl max-w-lg w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 id="adjust-strategy-title" className="text-lg font-semibold text-gray-900">Adjust Strategy</h2>
            <button
              onClick={onClose}
              disabled={isApplying}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                onClick={() => setSelectedOption(increaseDeficitOption)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  selectedOption?.type === 'increase_deficit'
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
                onClick={() => setSelectedOption(extendTimelineOption)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  selectedOption?.type === 'extend_timeline'
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
              <div className="text-center py-8">
                {recentlyRecalibrated ? (
                  <div className="space-y-3">
                    <div className="text-lg font-semibold text-blue-600 mb-2">
                      Strategy Updated
                    </div>
                    <div className="text-sm text-gray-700 space-y-2">
                      <p>
                        Your plan has been recalibrated. Follow your new targets
                        for a few days to generate fresh data before adjusting again.
                      </p>
                    </div>
                  </div>
                ) : isOffTrack && analysis.landingPoint ? (
                  <div className="space-y-3">
                    <div className="text-lg font-semibold text-orange-600 mb-2">
                      Plan is Off Track
                    </div>
                    <div className="text-sm text-gray-700 space-y-2">
                      <p>
                        Current velocity puts you at{' '}
                        <span className="font-semibold">{analysis.landingPoint.weightKg.toFixed(1)}kg</span>
                        {' '}(Goal: <span className="font-semibold">{plan.goalWeightKg.toFixed(1)}kg</span>)
                      </p>
                      {kcalCorrection && (
                        <p className="text-base font-medium text-gray-900 mt-3">
                          {isWeightLoss ? 'Increase' : 'Decrease'} deficit by{' '}
                          <span className="text-orange-600">{kcalCorrection} kcal/day</span> to correct
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-4">
                        Recalibration options will be available after more data is logged.
                      </p>
                    </div>
                  </div>
                ) : analysis.trendDiverging ? (
                  <div className="space-y-3">
                    <div className="text-lg font-semibold text-amber-600 mb-2">
                      Trend Warning
                    </div>
                    <div className="text-sm text-gray-700 space-y-2">
                      <p>
                        {analysis.trendDivergingMsg || 'Your weight trend is moving away from your goal.'}
                      </p>
                      <p className="text-xs text-gray-500 mt-4">
                        Consider adjusting your intake to get back on track before variance increases.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500">
                    <div className="text-lg mb-2">No adjustments needed</div>
                    <div className="text-sm">You are currently on track with your plan.</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="px-4 pb-4">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={isApplying}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!selectedOption || isApplying}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-testid="apply-changes-button"
            >
              {isApplying ? 'Applying...' : 'Apply Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
