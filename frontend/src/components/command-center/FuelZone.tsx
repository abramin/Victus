import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { DailyTargets, DayType, SolverSolution } from '../../api/types';
import { DAY_TYPE_BADGE } from '../../constants';
import { Panel } from '../common/Panel';
import { WaterTracker } from '../saved-view/WaterTracker';
import { AutoFillButton, MacroSolverModal } from '../solver';

interface FuelZoneProps {
  targets: DailyTargets | null;
  dayType?: DayType;
  consumedCalories?: number;
  consumedProteinG?: number;
  consumedCarbsG?: number;
  consumedFatG?: number;
  waterIntakeL?: number;
  onAddWater?: (amountL: number) => void;
  onLogSolution?: (solution: SolverSolution) => void;
}

export function FuelZone({
  targets,
  dayType,
  consumedCalories = 0,
  consumedProteinG = 0,
  consumedCarbsG = 0,
  consumedFatG = 0,
  waterIntakeL = 0,
  onAddWater,
  onLogSolution,
}: FuelZoneProps) {
  const [isSolverOpen, setIsSolverOpen] = useState(false);
  // No targets yet
  if (!targets) {
    return (
      <Panel>
        <div className="text-center py-6">
          <div className="text-4xl mb-3">🍽️</div>
          <h3 className="text-lg font-medium text-white mb-2">Fuel Budget</h3>
          <p className="text-sm text-gray-400 mb-4">
            Complete your check-in to see your nutrition targets
          </p>
        </div>
      </Panel>
    );
  }

  const remainingCalories = targets.totalCalories - consumedCalories;
  const remainingProteinG = targets.totalProteinG - consumedProteinG;
  const remainingCarbsG = targets.totalCarbsG - consumedCarbsG;
  const remainingFatG = targets.totalFatsG - consumedFatG;
  const calorieProgress = Math.min(100, (consumedCalories / targets.totalCalories) * 100);
  const effectiveDayType = dayType ?? targets.dayType;
  const badge = DAY_TYPE_BADGE[effectiveDayType];

  return (
    <Panel>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium">Fuel Budget</h3>
        <span className={`px-2 py-1 text-xs rounded-full border ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {/* Remaining Calories - Hero */}
      <div className="text-center mb-4">
        <div className="text-4xl font-bold text-white mb-1">
          {Math.round(remainingCalories).toLocaleString()}
        </div>
        <div className="text-sm text-gray-400">kcal remaining</div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              calorieProgress > 100
                ? 'bg-red-500'
                : calorieProgress > 80
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(100, calorieProgress)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{consumedCalories.toLocaleString()} consumed</span>
          <span>{targets.totalCalories.toLocaleString()} total</span>
        </div>
      </div>

      {/* Macro Summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 bg-gray-800/50 rounded-lg">
          <div className="text-sm font-medium text-white">{Math.round(targets.totalCarbsG)}g</div>
          <div className="text-xs text-gray-500">Carbs</div>
        </div>
        <div className="text-center p-2 bg-gray-800/50 rounded-lg">
          <div className="text-sm font-medium text-white">{Math.round(targets.totalProteinG)}g</div>
          <div className="text-xs text-gray-500">Protein</div>
        </div>
        <div className="text-center p-2 bg-gray-800/50 rounded-lg">
          <div className="text-sm font-medium text-white">{Math.round(targets.totalFatsG)}g</div>
          <div className="text-xs text-gray-500">Fats</div>
        </div>
      </div>

      {/* Auto-Fill Macros Button */}
      {remainingCalories >= 150 && (
        <div className="mb-4">
          <AutoFillButton
            remainingCalories={remainingCalories}
            onClick={() => setIsSolverOpen(true)}
          />
        </div>
      )}

      {/* Water Tracker */}
      {onAddWater && (
        <div className="mb-4 pt-4 border-t border-gray-800">
          <WaterTracker
            targetL={targets.waterL}
            intakeL={waterIntakeL}
            onAddWater={onAddWater}
          />
        </div>
      )}

      {/* Quick Add Button */}
      <Link
        to="/kitchen"
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Quick Add
      </Link>

      {/* Macro Solver Modal */}
      <MacroSolverModal
        isOpen={isSolverOpen}
        onClose={() => setIsSolverOpen(false)}
        remainingCalories={remainingCalories}
        remainingProteinG={remainingProteinG}
        remainingCarbsG={remainingCarbsG}
        remainingFatG={remainingFatG}
        onLogSolution={onLogSolution}
      />
    </Panel>
  );
}
