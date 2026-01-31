import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { DailyTargets, DayType, SolverSolution, FastingProtocol } from '../../api/types';
import { DAY_TYPE_BADGE } from '../../constants';
import { AnimatedNumber, Panel } from '../common';
import { WaterTracker } from '../saved-view/WaterTracker';
import { AutoFillButton, MacroSolverModal } from '../solver';
import { hoverLift } from '../../lib/animations';

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
  activeProtocol?: FastingProtocol;
  activeBurn?: number;
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
  activeProtocol,
  activeBurn = 0,
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


  const baseBudget = targets.totalCalories;
  const totalBudget = baseBudget + activeBurn;
  const remainingCalories = totalBudget - consumedCalories;
  // const remainingProteinG = targets.totalProteinG - consumedProteinG;
  // const remainingCarbsG = targets.totalCarbsG - consumedCarbsG;
  // const remainingFatG = targets.totalFatsG - consumedFatG;
  const calorieProgress = Math.min(100, (consumedCalories / totalBudget) * 100);
  const effectiveDayType = dayType ?? targets.dayType;
  const badge = DAY_TYPE_BADGE[effectiveDayType];

  return (
    <Panel>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium">Fuel Budget</h3>
        <div className="flex items-center gap-2">
          {activeBurn > 0 && (
            <span className="text-xs font-bold text-emerald-400 animate-pulse">
              +{activeBurn} ACTIVE
            </span>
          )}
          <span className={`px-2 py-1 text-xs rounded-full border ${badge.className}`}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Remaining Calories - Hero */}
      <div className="text-center mb-4">
        <div className="text-4xl font-bold text-white mb-1">
          <AnimatedNumber value={remainingCalories} />
        </div>
        <div className="text-sm text-gray-400">kcal remaining</div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${calorieProgress > 100
              ? 'bg-red-500'
              : calorieProgress > 80
                ? 'bg-yellow-500'
                : 'bg-green-500'
              }`}
            style={{ width: `${Math.min(100, calorieProgress)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>
            <AnimatedNumber value={consumedCalories} /> consumed
          </span>
          <span>
            <AnimatedNumber value={totalBudget} /> total
          </span>
        </div>
      </div>

      {/* Macro Summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <motion.div
          className="text-center p-2 bg-gray-800/50 rounded-lg border border-transparent"
          whileHover={hoverLift}
        >
          <div className="text-sm font-medium text-white">
            <AnimatedNumber value={targets.totalCarbsG} />g
          </div>
          <div className="text-xs text-gray-500">Carbs</div>
        </motion.div>
        <motion.div
          className="text-center p-2 bg-gray-800/50 rounded-lg border border-transparent"
          whileHover={hoverLift}
        >
          <div className="text-sm font-medium text-white">
            <AnimatedNumber value={targets.totalProteinG} />g
          </div>
          <div className="text-xs text-gray-500">Protein</div>
        </motion.div>
        <motion.div
          className="text-center p-2 bg-gray-800/50 rounded-lg border border-transparent"
          whileHover={hoverLift}
        >
          <div className="text-sm font-medium text-white">
            <AnimatedNumber value={targets.totalFatsG} />g
          </div>
          <div className="text-xs text-gray-500">Fats</div>
        </motion.div>
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
        remainingProteinG={targets.totalProteinG - consumedProteinG}
        remainingCarbsG={targets.totalCarbsG - consumedCarbsG}
        remainingFatG={targets.totalFatsG - consumedFatG}
        onLogSolution={onLogSolution}
        activeProtocol={activeProtocol}
      />
    </Panel>
  );
}
