import { NumberInput } from '../common/NumberInput';
import {
  RECALIBRATION_TOLERANCE_MIN,
  RECALIBRATION_TOLERANCE_MAX,
  RECALIBRATION_TOLERANCE_DEFAULT,
} from '../../constants';

interface RecalibrationSettingsProps {
  tolerance: number;
  onChange: (tolerance: number) => void;
  error?: string;
}

export function RecalibrationSettings({
  tolerance,
  onChange,
  error,
}: RecalibrationSettingsProps) {
  const displayValue = tolerance || RECALIBRATION_TOLERANCE_DEFAULT;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-slate-200 mb-1">Recalibration Settings</h3>
        <p className="text-sm text-slate-400">
          Configure when the app should prompt you to recalibrate your plan based on actual vs planned weight progress.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <NumberInput
          label="Variance Tolerance"
          value={displayValue}
          onChange={onChange}
          min={RECALIBRATION_TOLERANCE_MIN}
          max={RECALIBRATION_TOLERANCE_MAX}
          step={1}
          unit="%"
          error={error}
          testId="recalibration-tolerance-input"
        />
      </div>

      {/* Tolerance Slider */}
      <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-slate-400">Tolerance Level</span>
          <span className="text-sm font-medium text-slate-200">{displayValue}%</span>
        </div>
        
        <input
          type="range"
          min={RECALIBRATION_TOLERANCE_MIN}
          max={RECALIBRATION_TOLERANCE_MAX}
          step={1}
          value={displayValue}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          data-testid="recalibration-tolerance-slider"
        />
        
        <div className="flex justify-between mt-1">
          <span className="text-xs text-slate-500">Strict (1%)</span>
          <span className="text-xs text-slate-500">Relaxed (10%)</span>
        </div>

        {/* Explanation based on tolerance level */}
        <div className="mt-3 pt-3 border-t border-slate-700">
          <div className="text-xs text-slate-400">
            {displayValue <= 3 && (
              <>
                <span className="text-blue-400 font-medium">Strict:</span>{' '}
                You'll be prompted to recalibrate if your actual weight differs from planned weight by more than {displayValue}%.
                Good for users who want tight control over their progress.
              </>
            )}
            {displayValue > 3 && displayValue <= 6 && (
              <>
                <span className="text-yellow-400 font-medium">Moderate:</span>{' '}
                You'll be prompted to recalibrate if your actual weight differs from planned weight by more than {displayValue}%.
                Balances flexibility with accountability.
              </>
            )}
            {displayValue > 6 && (
              <>
                <span className="text-orange-400 font-medium">Relaxed:</span>{' '}
                You'll be prompted to recalibrate if your actual weight differs from planned weight by more than {displayValue}%.
                More forgiving for users who prefer less frequent adjustments.
              </>
            )}
          </div>
        </div>
      </div>

      {/* Example calculation */}
      <div className="p-3 bg-slate-900/50 rounded-md border border-slate-800">
        <div className="text-xs text-slate-500">
          <span className="font-medium">Example:</span> If your planned weight for week 4 is 85kg and tolerance is {displayValue}%,
          you'll see a recalibration prompt if your actual weight is below{' '}
          <span className="text-slate-300">{(85 * (1 - displayValue / 100)).toFixed(1)}kg</span> or above{' '}
          <span className="text-slate-300">{(85 * (1 + displayValue / 100)).toFixed(1)}kg</span>.
        </div>
      </div>
    </div>
  );
}
