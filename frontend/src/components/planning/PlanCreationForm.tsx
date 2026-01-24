import { useState, useMemo } from 'react';
import type { CreatePlanRequest, UserProfile } from '../../api/types';
import { Card } from '../common/Card';
import { NumberInput } from '../common/NumberInput';
import { Button } from '../common/Button';
import { ContextualSlider } from '../common/ContextualSlider';
import {
  KCAL_PER_KG,
  PLAN_DURATION_MIN_WEEKS,
  PLAN_DURATION_MAX_WEEKS,
  MAX_SAFE_DEFICIT_KCAL,
  MAX_SAFE_SURPLUS_KCAL,
  PACE_MIN_KG_WEEK,
  PACE_MAX_KG_WEEK,
  PACE_ZONES,
  WEIGHT_MIN_KG,
  WEIGHT_MAX_KG,
  MODERATE_ACTIVITY_MULTIPLIER,
} from '../../constants';

interface PlanCreationFormProps {
  currentWeight: number;
  estimatedTDEE?: number;
  profile: UserProfile;
  onSubmit: (request: CreatePlanRequest) => Promise<void>;
  creating: boolean;
  error: string | null;
}

/**
 * Calculate age from birth date string
 */
function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Estimate TDEE using Mifflin-St Jeor formula with moderate activity
 */
function estimateTDEE(profile: UserProfile, weightKg: number): number {
  const age = calculateAge(profile.birthDate);
  const bmr =
    profile.sex === 'male'
      ? 10 * weightKg + 6.25 * profile.height_cm - 5 * age + 5
      : 10 * weightKg + 6.25 * profile.height_cm - 5 * age - 161;
  return Math.round(bmr * MODERATE_ACTIVITY_MULTIPLIER);
}

/**
 * Add weeks to a date string and return ISO date string
 */
function addWeeks(dateStr: string, weeks: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + weeks * 7);
  return date.toISOString().split('T')[0];
}

/**
 * Calculate weeks between two date strings
 */
function weeksBetween(startStr: string, endStr: string): number {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const diffMs = end.getTime() - start.getTime();
  const weeks = Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000));
  return Math.max(PLAN_DURATION_MIN_WEEKS, weeks);
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function PlanCreationForm({
  currentWeight,
  estimatedTDEE,
  profile,
  onSubmit,
  creating,
  error,
}: PlanCreationFormProps) {
  const today = new Date().toISOString().split('T')[0];
  const minStartDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Primary inputs
  const [startDate, setStartDate] = useState(today);
  const [startWeight, setStartWeight] = useState(currentWeight || 80);
  const [goalWeight, setGoalWeight] = useState(currentWeight ? currentWeight - 5 : 75);

  // Pace as primary control (absolute value, direction determined by weight change)
  const [paceKgPerWeek, setPaceKgPerWeek] = useState(0.5);

  // Compute TDEE (from daily log or estimate from profile)
  const tdee = useMemo(() => {
    return estimatedTDEE ?? estimateTDEE(profile, startWeight);
  }, [estimatedTDEE, profile, startWeight]);

  const tdeeIsEstimated = !estimatedTDEE;

  // Derived analysis values
  const analysis = useMemo(() => {
    const weightChange = goalWeight - startWeight;
    const isLoss = weightChange < 0;
    const isMaintain = Math.abs(weightChange) < 0.5;

    // Calculate duration from pace (or use default for maintain)
    let durationWeeks: number;
    if (isMaintain) {
      durationWeeks = 12; // Default for maintain
    } else {
      durationWeeks = Math.ceil(Math.abs(weightChange) / paceKgPerWeek);
      durationWeeks = Math.max(PLAN_DURATION_MIN_WEEKS, Math.min(PLAN_DURATION_MAX_WEEKS, durationWeeks));
    }

    // Calculate end date
    const endDate = addWeeks(startDate, durationWeeks);

    // Calculate actual weekly rate (might differ due to duration clamping)
    const actualWeeklyRate = isMaintain ? 0 : weightChange / durationWeeks;

    // Calculate daily deficit/surplus (negative for loss)
    const dailyDeficit = (actualWeeklyRate * KCAL_PER_KG) / 7;

    // Calculate daily budget
    const dailyBudget = Math.round(tdee + dailyDeficit);

    // Determine safety
    const isSafe = isLoss
      ? Math.abs(dailyDeficit) <= MAX_SAFE_DEFICIT_KCAL
      : dailyDeficit <= MAX_SAFE_SURPLUS_KCAL;

    // Determine pace zone label
    const absRate = Math.abs(actualWeeklyRate);
    let paceZoneLabel: string;
    let paceZoneColor: string;
    if (absRate <= 0.75) {
      paceZoneLabel = 'Sustainable';
      paceZoneColor = 'text-green-400';
    } else if (absRate <= 1.0) {
      paceZoneLabel = 'Aggressive';
      paceZoneColor = 'text-orange-400';
    } else {
      paceZoneLabel = 'Extreme';
      paceZoneColor = 'text-red-400';
    }

    return {
      weightChange,
      isLoss,
      isMaintain,
      durationWeeks,
      endDate,
      actualWeeklyRate,
      dailyDeficit,
      dailyBudget,
      isSafe,
      paceZoneLabel,
      paceZoneColor,
    };
  }, [startWeight, goalWeight, paceKgPerWeek, startDate, tdee]);

  // Handler for pace slider change
  const handlePaceChange = (value: number) => {
    setPaceKgPerWeek(value);
  };

  // Handler for duration input change - recalculate pace
  const handleDurationChange = (weeks: number) => {
    if (analysis.isMaintain) return;
    const weightChange = goalWeight - startWeight;
    const newPace = Math.abs(weightChange / weeks);
    setPaceKgPerWeek(Math.max(PACE_MIN_KG_WEEK, Math.min(PACE_MAX_KG_WEEK, newPace)));
  };

  // Handler for end date change - recalculate pace
  const handleEndDateChange = (newEndDate: string) => {
    if (analysis.isMaintain) return;
    const weeks = weeksBetween(startDate, newEndDate);
    const weightChange = goalWeight - startWeight;
    const newPace = Math.abs(weightChange / weeks);
    setPaceKgPerWeek(Math.max(PACE_MIN_KG_WEEK, Math.min(PACE_MAX_KG_WEEK, newPace)));
  };

  // Reset pace to safe default when goal weight changes direction
  const handleGoalWeightChange = (newGoal: number) => {
    const oldChange = goalWeight - startWeight;
    const newChange = newGoal - startWeight;
    const directionChanged = (oldChange < 0 && newChange > 0) || (oldChange > 0 && newChange < 0);

    setGoalWeight(newGoal);
    if (directionChanged) {
      setPaceKgPerWeek(0.5); // Reset to safe default
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!analysis.isSafe) return;

    await onSubmit({
      startDate,
      startWeightKg: startWeight,
      goalWeightKg: goalWeight,
      durationWeeks: analysis.durationWeeks,
    });
  };

  // Calculate min end date (4 weeks from start)
  const minEndDate = addWeeks(startDate, PLAN_DURATION_MIN_WEEKS);

  return (
    <Card title="Plan Simulator">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Starting Point Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
            Starting Point
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="startDate" className="block text-sm font-medium text-slate-300">
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={minStartDate}
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-md text-white
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:ring-offset-2 focus:ring-offset-slate-900"
              />
            </div>
            <NumberInput
              label="Current Weight"
              value={startWeight}
              onChange={setStartWeight}
              min={WEIGHT_MIN_KG}
              max={WEIGHT_MAX_KG}
              step={0.1}
              unit="kg"
            />
          </div>
        </div>

        {/* Goal Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">The Goal</h3>
          <NumberInput
            label="Target Weight"
            value={goalWeight}
            onChange={handleGoalWeightChange}
            min={WEIGHT_MIN_KG}
            max={WEIGHT_MAX_KG}
            step={0.1}
            unit="kg"
          />
          {analysis.isMaintain && (
            <p className="text-sm text-slate-500">
              Maintaining current weight - pace controls are disabled.
            </p>
          )}
        </div>

        {/* Strategy Section */}
        {!analysis.isMaintain && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Strategy</h3>

            {/* Pace Slider */}
            <ContextualSlider
              label="Pace"
              value={paceKgPerWeek}
              onChange={handlePaceChange}
              min={PACE_MIN_KG_WEEK}
              max={PACE_MAX_KG_WEEK}
              step={0.05}
              unit=" kg/week"
              zones={[...PACE_ZONES]}
            />

            {/* Duration and End Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="duration" className="block text-sm font-medium text-slate-300">
                  Duration
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    id="duration"
                    value={analysis.durationWeeks}
                    onChange={(e) => handleDurationChange(parseInt(e.target.value, 10) || PLAN_DURATION_MIN_WEEKS)}
                    min={PLAN_DURATION_MIN_WEEKS}
                    max={PLAN_DURATION_MAX_WEEKS}
                    className="w-20 px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-md text-white text-center
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:ring-offset-2 focus:ring-offset-slate-900"
                  />
                  <span className="text-slate-400">weeks</span>
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="endDate" className="block text-sm font-medium text-slate-300">
                  Finish Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={analysis.endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  min={minEndDate}
                  className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-md text-white
                    focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:ring-offset-2 focus:ring-offset-slate-900"
                />
              </div>
            </div>
          </div>
        )}

        {/* Preview Section */}
        <div
          className={`p-4 rounded-lg border ${
            analysis.isSafe
              ? 'bg-slate-900/50 border-slate-700'
              : 'bg-red-900/20 border-red-800'
          }`}
        >
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">
            Preview
          </h3>
          <div className="space-y-2">
            {/* Daily Budget */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Daily Budget</span>
              <div className="text-right">
                <span className="text-xl font-bold text-white">
                  ~{analysis.dailyBudget.toLocaleString()} kcal
                </span>
                {!analysis.isMaintain && (
                  <span className="ml-2 text-sm text-slate-500">
                    ({analysis.dailyDeficit > 0 ? '+' : ''}
                    {Math.round(analysis.dailyDeficit)} kcal)
                  </span>
                )}
              </div>
            </div>

            {/* TDEE Source Note */}
            {tdeeIsEstimated && (
              <p className="text-xs text-slate-500">
                * Estimated from profile. Log today's data for a more accurate budget.
              </p>
            )}

            {/* Weekly Change */}
            {!analysis.isMaintain && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Weekly Change</span>
                <span className={`font-medium ${analysis.isLoss ? 'text-green-400' : 'text-orange-400'}`}>
                  {analysis.actualWeeklyRate > 0 ? '+' : ''}
                  {analysis.actualWeeklyRate.toFixed(2)} kg/week
                </span>
              </div>
            )}

            {/* End Date */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Target Date</span>
              <span className="text-white">{formatDate(analysis.endDate)}</span>
            </div>

            {/* Status */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-700">
              <span className="text-slate-400">Status</span>
              <span className={`font-medium ${analysis.paceZoneColor}`}>
                {analysis.isMaintain
                  ? 'Maintenance Mode'
                  : analysis.isSafe
                  ? `Safe & ${analysis.paceZoneLabel}`
                  : 'Too Aggressive'}
              </span>
            </div>
          </div>
        </div>

        {/* Warning for unsafe plans */}
        {!analysis.isSafe && (
          <div className="p-3 bg-red-900/30 border border-red-800 rounded-md text-sm text-red-300">
            {analysis.isLoss
              ? `A daily deficit of ${Math.abs(Math.round(analysis.dailyDeficit))} kcal exceeds the safe limit of ${MAX_SAFE_DEFICIT_KCAL} kcal/day. Try increasing the duration or reducing the weight change.`
              : `A daily surplus of ${Math.round(analysis.dailyDeficit)} kcal exceeds the safe limit of ${MAX_SAFE_SURPLUS_KCAL} kcal/day. Try increasing the duration or reducing the weight change.`}
          </div>
        )}

        {/* API Error */}
        {error && (
          <div className="p-3 bg-red-900/30 border border-red-800 rounded-md text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <Button type="submit" disabled={creating || !analysis.isSafe} className="w-full">
          {creating ? 'Creating Plan...' : 'Create Plan'}
        </Button>
      </form>
    </Card>
  );
}
