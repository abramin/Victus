import type { OnboardingData } from './OnboardingWizard';

interface ActivityGoalsStepProps {
  data: OnboardingData;
  onChange: (updates: Partial<OnboardingData>) => void;
}

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little or no exercise' },
  { value: 'light', label: 'Light', description: 'Exercise 1-3 times/week' },
  { value: 'moderate', label: 'Moderate', description: 'Exercise 3-5 times/week' },
  { value: 'active', label: 'Active', description: 'Exercise 6-7 times/week' },
  { value: 'very_active', label: 'Very Active', description: 'Very intense exercise daily' },
] as const;

const GOALS = [
  { value: 'lose_weight', label: 'Lose Weight' },
  { value: 'maintain', label: 'Maintain Weight' },
  { value: 'gain_weight', label: 'Gain Muscle' },
] as const;

export function ActivityGoalsStep({ data, onChange }: ActivityGoalsStepProps) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-white mb-2">Activity & Goals</h2>
      <p className="text-gray-400 mb-8">Help us understand your lifestyle and fitness goals</p>

      <div className="space-y-8">
        {/* Activity Level */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-4">Activity Level</label>
          <div className="space-y-3">
            {ACTIVITY_LEVELS.map((level) => (
              <label
                key={level.value}
                className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-colors ${
                  data.activityLevel === level.value
                    ? 'bg-gray-800 border-2 border-white/30'
                    : 'bg-gray-800/50 border-2 border-transparent hover:bg-gray-800'
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      data.activityLevel === level.value
                        ? 'border-white bg-white'
                        : 'border-gray-600'
                    }`}
                  >
                    {data.activityLevel === level.value && (
                      <div className="w-2 h-2 rounded-full bg-black" />
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-white font-medium">{level.label}</div>
                  <div className="text-sm text-gray-400">{level.description}</div>
                </div>
                <input
                  type="radio"
                  name="activityLevel"
                  value={level.value}
                  checked={data.activityLevel === level.value}
                  onChange={() => onChange({ activityLevel: level.value })}
                  className="sr-only"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Primary Goal */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-4">Primary Goal</label>
          <div className="space-y-3">
            {GOALS.map((goal) => (
              <label
                key={goal.value}
                className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-colors ${
                  data.goal === goal.value
                    ? 'bg-gray-800 border-2 border-white/30'
                    : 'bg-gray-800/50 border-2 border-transparent hover:bg-gray-800'
                }`}
              >
                <div className="flex-shrink-0">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      data.goal === goal.value
                        ? 'border-white bg-white'
                        : 'border-gray-600'
                    }`}
                  >
                    {data.goal === goal.value && (
                      <div className="w-2 h-2 rounded-full bg-black" />
                    )}
                  </div>
                </div>
                <div className="text-white font-medium">{goal.label}</div>
                <input
                  type="radio"
                  name="goal"
                  value={goal.value}
                  checked={data.goal === goal.value}
                  onChange={() => onChange({ goal: goal.value })}
                  className="sr-only"
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
