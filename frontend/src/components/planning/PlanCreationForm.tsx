import { useState, useMemo } from 'react';
import type { CreatePlanRequest } from '../../api/types';
import { Card } from '../common/Card';
import { NumberInput } from '../common/NumberInput';
import { Button } from '../common/Button';

interface PlanCreationFormProps {
  currentWeight: number;
  onSubmit: (request: CreatePlanRequest) => Promise<void>;
  creating: boolean;
  error: string | null;
}

const MIN_DURATION_WEEKS = 4;
const MAX_DURATION_WEEKS = 104;
const MIN_WEIGHT_KG = 30;
const MAX_WEIGHT_KG = 300;
const MAX_SAFE_DEFICIT_KCAL = 750;
const MAX_SAFE_SURPLUS_KCAL = 500;
const KCAL_PER_KG = 7700;

export function PlanCreationForm({ currentWeight, onSubmit, creating, error }: PlanCreationFormProps) {
  const today = new Date().toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(today);
  const [startWeight, setStartWeight] = useState(currentWeight || 80);
  const [goalWeight, setGoalWeight] = useState(currentWeight ? currentWeight - 5 : 75);
  const [durationWeeks, setDurationWeeks] = useState(12);

  const analysis = useMemo(() => {
    const weightChange = goalWeight - startWeight;
    const weeklyChange = weightChange / durationWeeks;
    const dailyDeficit = (weeklyChange * KCAL_PER_KG) / 7;

    const isLoss = weightChange < 0;
    const isSafe = isLoss
      ? Math.abs(dailyDeficit) <= MAX_SAFE_DEFICIT_KCAL
      : dailyDeficit <= MAX_SAFE_SURPLUS_KCAL;

    return {
      weightChange,
      weeklyChange,
      dailyDeficit,
      isLoss,
      isSafe,
    };
  }, [startWeight, goalWeight, durationWeeks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!analysis.isSafe) return;

    await onSubmit({
      startDate,
      startWeightKg: startWeight,
      goalWeightKg: goalWeight,
      durationWeeks,
    });
  };

  return (
    <Card title="Create Nutrition Plan">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            min={new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <NumberInput
            label="Start Weight (kg)"
            value={startWeight}
            onChange={setStartWeight}
            min={MIN_WEIGHT_KG}
            max={MAX_WEIGHT_KG}
            step={0.1}
          />
          <NumberInput
            label="Goal Weight (kg)"
            value={goalWeight}
            onChange={setGoalWeight}
            min={MIN_WEIGHT_KG}
            max={MAX_WEIGHT_KG}
            step={0.1}
          />
        </div>

        <NumberInput
          label="Duration (weeks)"
          value={durationWeeks}
          onChange={setDurationWeeks}
          min={MIN_DURATION_WEEKS}
          max={MAX_DURATION_WEEKS}
          step={1}
        />

        <div className="p-4 bg-gray-50 rounded-lg space-y-2">
          <h4 className="font-medium text-gray-900">Plan Preview</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Total Change:</span>
              <span className={`ml-2 font-medium ${analysis.weightChange < 0 ? 'text-green-600' : analysis.weightChange > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                {analysis.weightChange > 0 ? '+' : ''}{analysis.weightChange.toFixed(1)} kg
              </span>
            </div>
            <div>
              <span className="text-gray-500">Weekly:</span>
              <span className={`ml-2 font-medium ${analysis.weeklyChange < 0 ? 'text-green-600' : analysis.weeklyChange > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                {analysis.weeklyChange > 0 ? '+' : ''}{analysis.weeklyChange.toFixed(2)} kg/week
              </span>
            </div>
            <div>
              <span className="text-gray-500">Daily Deficit:</span>
              <span className={`ml-2 font-medium ${analysis.isSafe ? 'text-green-600' : 'text-red-600'}`}>
                {analysis.dailyDeficit > 0 ? '+' : ''}{Math.round(analysis.dailyDeficit)} kcal
              </span>
            </div>
            <div>
              <span className="text-gray-500">Status:</span>
              <span className={`ml-2 font-medium ${analysis.isSafe ? 'text-green-600' : 'text-red-600'}`}>
                {analysis.isSafe ? 'Safe' : 'Too Aggressive'}
              </span>
            </div>
          </div>
        </div>

        {!analysis.isSafe && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            {analysis.isLoss
              ? `Daily deficit of ${Math.abs(Math.round(analysis.dailyDeficit))} kcal exceeds the safe limit of ${MAX_SAFE_DEFICIT_KCAL} kcal/day. Increase duration or reduce weight change.`
              : `Daily surplus of ${Math.round(analysis.dailyDeficit)} kcal exceeds the safe limit of ${MAX_SAFE_SURPLUS_KCAL} kcal/day. Increase duration or reduce weight change.`}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={creating || !analysis.isSafe}
          className="w-full"
        >
          {creating ? 'Creating Plan...' : 'Create Plan'}
        </Button>
      </form>
    </Card>
  );
}
