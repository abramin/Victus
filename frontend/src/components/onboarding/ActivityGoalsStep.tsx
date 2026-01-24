import type { OnboardingData } from './OnboardingWizard';
import { SelectorCard } from '../common/SelectorCard';

interface ActivityGoalsStepProps {
  data: OnboardingData;
  onChange: (updates: Partial<OnboardingData>) => void;
}

const ACTIVITY_LEVEL_OPTIONS = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little or no exercise' },
  { value: 'light', label: 'Light', description: 'Exercise 1-3 times/week' },
  { value: 'moderate', label: 'Moderate', description: 'Exercise 3-5 times/week' },
  { value: 'active', label: 'Active', description: 'Exercise 6-7 times/week' },
  { value: 'very_active', label: 'Very Active', description: 'Very intense exercise daily' },
] as const;

const GOAL_OPTIONS = [
  { value: 'lose_weight', label: 'Lose Weight', description: 'Calorie Deficit', icon: '📉' },
  { value: 'maintain', label: 'Maintain', description: 'TDEE Match', icon: '⚖️' },
  { value: 'gain_weight', label: 'Gain Muscle', description: 'Surplus', icon: '💪' },
] as const;

export function ActivityGoalsStep({ data, onChange }: ActivityGoalsStepProps) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-white mb-2">Activity & Goals</h2>
      <p className="text-gray-400 mb-8">Help us understand your lifestyle and fitness goals</p>

      <div className="space-y-8">
        {/* Activity Level */}
        <SelectorCard
          label="Activity Level"
          value={data.activityLevel}
          onChange={(v) => onChange({ activityLevel: v as OnboardingData['activityLevel'] })}
          options={ACTIVITY_LEVEL_OPTIONS.map(level => ({
            value: level.value,
            label: level.label,
            description: level.description,
          }))}
          columns={2}
          testId="activity-level"
        />

        {/* Primary Goal */}
        <SelectorCard
          label="Primary Goal"
          value={data.goal}
          onChange={(v) => onChange({ goal: v as OnboardingData['goal'] })}
          options={GOAL_OPTIONS.map(goal => ({
            value: goal.value,
            label: goal.label,
            description: goal.description,
            icon: goal.icon,
          }))}
          columns={3}
          testId="goal"
        />
      </div>
    </div>
  );
}
