import { Modal } from '../common/Modal';
import type { DayType, PointsConfig, SupplementConfig } from '../../api/types';

interface MealBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  meal: 'Breakfast' | 'Lunch' | 'Dinner';
  sharePercent: number;
  dayType: DayType;
  points: {
    carbs: number;
    protein: number;
    fats: number;
  };
  grams: {
    carbs: number;
    protein: number;
    fats: number;
  };
  pointsConfig: PointsConfig;
  supplementConfig: SupplementConfig;
}

const DAY_TYPE_LABELS: Record<DayType, string> = {
  performance: 'Performance (+30% carbs)',
  fatburner: 'Fatburner (-40% carbs, -15% fats)',
  metabolize: 'Metabolize (+50% carbs, +10% fats)',
};

export function MealBreakdownModal({
  isOpen,
  onClose,
  meal,
  sharePercent,
  dayType,
  points,
  grams,
  pointsConfig,
  supplementConfig,
}: MealBreakdownModalProps) {
  const hasWhey = supplementConfig.wheyG > 0;
  const hasCollagen = supplementConfig.collagenG > 0;
  const hasMaltodextrin = supplementConfig.maltodextrinG > 0;
  const hasSupplements = hasWhey || hasCollagen || hasMaltodextrin;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${meal} Breakdown`}>
      <div className="space-y-5">
        {/* Meal Share */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Meal Share</span>
            <span className="text-white font-medium">{sharePercent}%</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            This meal receives {sharePercent}% of your daily macro targets
          </p>
        </div>

        {/* Day Type */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Day Type</span>
            <span className="text-white font-medium capitalize">{dayType}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {DAY_TYPE_LABELS[dayType]}
          </p>
        </div>

        {/* Points Conversion */}
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h4 className="text-gray-400 mb-3">Points Calculation</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Protein: {grams.protein}g × {pointsConfig.proteinMultiplier}</span>
              <span className="text-purple-400 font-medium">{points.protein} pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Carbs: {grams.carbs}g × {pointsConfig.carbMultiplier}</span>
              <span className="text-orange-400 font-medium">{points.carbs} pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Fats: {grams.fats}g × {pointsConfig.fatMultiplier}</span>
              <span className="text-gray-400 font-medium">{points.fats} pts</span>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-3">
            Points are rounded to nearest 5 for easier tracking
          </p>
        </div>

        {/* Supplement Deductions */}
        {hasSupplements && (
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="text-gray-400 mb-3">Supplement Deductions</h4>
            <p className="text-xs text-gray-500 mb-2">
              These are deducted from daily totals before meal allocation
            </p>
            <div className="space-y-2 text-sm">
              {hasCollagen && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Collagen ({supplementConfig.collagenG}g × 90%)</span>
                  <span className="text-purple-400">-{Math.round(supplementConfig.collagenG * 0.9)}g protein</span>
                </div>
              )}
              {hasWhey && dayType === 'performance' && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Whey ({supplementConfig.wheyG}g × 88%)</span>
                  <span className="text-purple-400">-{Math.round(supplementConfig.wheyG * 0.88)}g protein</span>
                </div>
              )}
              {hasMaltodextrin && dayType === 'performance' && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Maltodextrin ({supplementConfig.maltodextrinG}g × 96%)</span>
                  <span className="text-orange-400">-{Math.round(supplementConfig.maltodextrinG * 0.96)}g carbs</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
