import { useNavigate } from 'react-router-dom';
import { Panel } from '../common/Panel';
import { MacroBarChart } from '../charts';
import { WaterTracker } from './WaterTracker';
import type { DailyTargets, DayType } from '../../api/types';
import { DAY_TYPE_BADGE, DAY_TYPE_OPTIONS } from '../../constants';
import { useWaterTracking } from '../../hooks/useWaterTracking';

interface DailyMissionCardProps {
  /** The daily targets containing macros, calories, and water target */
  targets: DailyTargets;
  /** Total points for the day (pre-calculated from meal targets) */
  totalPoints: number;
  /** The current date in YYYY-MM-DD format */
  date: string;
}

const DAY_TYPE_ICONS: Record<DayType, string> = {
  performance: '⚡',
  fatburner: '🔥',
  metabolize: '🥗',
};

const DAY_TYPE_STRATEGIES: Record<DayType, string> = {
  performance: 'Higher carbs to fuel your workout',
  fatburner: 'Low carb day to maximize fat burning',
  metabolize: 'Balanced macros for recovery',
};

/**
 * Daily Mission card showing a simplified view of today's nutrition targets.
 * Replaces the detailed Breakfast/Lunch/Dinner cards with a high-level summary.
 */
export function DailyMissionCard({ targets, totalPoints, date }: DailyMissionCardProps) {
  const navigate = useNavigate();
  const { intakeL, addWater } = useWaterTracking(date, targets.waterL);

  const dayType = targets.dayType;
  const badge = DAY_TYPE_BADGE[dayType];
  const dayTypeOption = DAY_TYPE_OPTIONS.find((opt) => opt.value === dayType);

  return (
    <Panel padding="lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-lg">Today's Fuel</h3>
      </div>

      {/* Day Type Hero */}
      <div className="mb-6 p-4 bg-gray-800/50 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{DAY_TYPE_ICONS[dayType]}</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${badge.className}`}>
            {badge.label} Strategy
          </span>
        </div>
        <p className="text-gray-400 text-sm">{DAY_TYPE_STRATEGIES[dayType]}</p>
      </div>

      {/* Total Targets */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-3 bg-gray-800/30 rounded-lg">
          <span className="text-gray-400 text-xs block mb-1">Total Calories</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white">{targets.totalCalories.toLocaleString()}</span>
            <span className="text-gray-500 text-sm">kcal</span>
          </div>
        </div>
        <div className="p-3 bg-gray-800/30 rounded-lg">
          <span className="text-gray-400 text-xs block mb-1">Total Points</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white">{totalPoints.toLocaleString()}</span>
            <span className="text-gray-500 text-sm">pts</span>
          </div>
        </div>
      </div>

      {/* Macro Bar */}
      <div className="mb-6">
        <h4 className="text-gray-400 text-xs uppercase tracking-wide mb-3">Macro Distribution</h4>
        <MacroBarChart
          carbsG={targets.totalCarbsG}
          proteinG={targets.totalProteinG}
          fatsG={targets.totalFatsG}
        />
      </div>

      {/* Divider */}
      <div className="border-t border-gray-800 my-4" />

      {/* Water Tracker */}
      <div className="mb-6">
        <WaterTracker
          intakeL={intakeL}
          targetL={targets.waterL}
          onAddWater={addWater}
        />
      </div>

      {/* Kitchen Mode Button */}
      <button
        type="button"
        onClick={() => navigate('/kitchen')}
        className="w-full py-3 px-4 bg-white text-black font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
      >
        Go to Kitchen Mode
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </button>
    </Panel>
  );
}
