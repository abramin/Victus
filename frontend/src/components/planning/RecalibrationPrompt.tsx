import type { RecalibrationOption, FeasibilityTag } from '../../api/types';
import { Card } from '../common/Card';

interface RecalibrationPromptProps {
  varianceKg: number;
  variancePercent: number;
  options: RecalibrationOption[];
  onSelectOption?: (option: RecalibrationOption) => void;
}

const feasibilityColors: Record<FeasibilityTag, { bg: string; text: string; border: string }> = {
  Achievable: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  Moderate: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  Ambitious: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

const optionIcons: Record<string, string> = {
  increase_deficit: '📉',
  extend_timeline: '📅',
  revise_goal: '🎯',
  keep_current: '✓',
};

const optionTitles: Record<string, string> = {
  increase_deficit: 'Increase Deficit',
  extend_timeline: 'Extend Timeline',
  revise_goal: 'Revise Goal',
  keep_current: 'Keep Current Plan',
};

export function RecalibrationPrompt({
  varianceKg,
  variancePercent,
  options,
  onSelectOption,
}: RecalibrationPromptProps) {
  const isOverweight = varianceKg > 0;

  return (
    <Card>
      <div className="space-y-4">
        {/* Alert header */}
        <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-2xl">⚠️</div>
          <div>
            <h3 className="font-semibold text-yellow-800">Plan Recalibration Recommended</h3>
            <p className="text-sm text-yellow-700 mt-1">
              You are currently{' '}
              <span className="font-medium">
                {Math.abs(varianceKg).toFixed(1)} kg ({Math.abs(variancePercent).toFixed(1)}%)
              </span>{' '}
              {isOverweight ? 'above' : 'below'} your planned weight.
              Consider one of the following adjustments:
            </p>
          </div>
        </div>

        {/* Options grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {options.map((option) => {
            const colors = feasibilityColors[option.feasibilityTag];

            return (
              <button
                key={option.type}
                onClick={() => onSelectOption?.(option)}
                className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${colors.border} ${colors.bg} hover:border-gray-400`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{optionIcons[option.type]}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900">
                        {optionTitles[option.type]}
                      </h4>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.text} ${colors.bg}`}>
                        {option.feasibilityTag}
                      </span>
                    </div>
                    <div className="mt-1 text-lg font-bold text-gray-800">
                      {option.newParameter}
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {option.impact}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Dismiss option */}
        <div className="text-center pt-2">
          <button
            onClick={() => onSelectOption?.(options.find(o => o.type === 'keep_current')!)}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Dismiss and keep current settings
          </button>
        </div>
      </div>
    </Card>
  );
}
