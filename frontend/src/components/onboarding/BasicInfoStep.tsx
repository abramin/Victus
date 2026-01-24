import type { OnboardingData } from './OnboardingWizard';
import { SelectorCard } from '../common/SelectorCard';

interface BasicInfoStepProps {
  data: OnboardingData;
  onChange: (updates: Partial<OnboardingData>) => void;
}

export function BasicInfoStep({ data, onChange }: BasicInfoStepProps) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-white mb-2">Basic Information</h2>
      <p className="text-gray-400 mb-8">Tell us a bit about yourself</p>

      <div className="space-y-6">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
          <input
            type="text"
            value={data.fullName}
            onChange={(e) => onChange({ fullName: e.target.value })}
            placeholder="Enter your name"
            data-testid="fullName-input"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent"
          />
        </div>

        {/* Gender Selector Cards */}
        <SelectorCard
          label="Gender"
          value={data.gender}
          onChange={(v) => onChange({ gender: v as 'male' | 'female' })}
          options={[
            { value: 'male', label: 'Male', icon: '♂️' },
            { value: 'female', label: 'Female', icon: '♀️' },
          ]}
          columns={2}
          testId="gender-select"
        />

        {/* Age Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Age</label>
          <div className="relative">
            <input
              type="number"
              value={data.age}
              onChange={(e) => onChange({ age: parseInt(e.target.value) || 0 })}
              min={13}
              max={120}
              data-testid="age-input"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent appearance-none"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col">
              <button
                type="button"
                onClick={() => onChange({ age: Math.min(120, data.age + 1) })}
                className="text-gray-400 hover:text-white p-0.5"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => onChange({ age: Math.max(13, data.age - 1) })}
                className="text-gray-400 hover:text-white p-0.5"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Weight and Height Row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Weight (kg)</label>
            <div className="relative">
              <input
                type="number"
                value={data.weightKg}
                onChange={(e) => onChange({ weightKg: parseFloat(e.target.value) || 0 })}
                min={30}
                max={300}
                step={0.1}
                data-testid="weight-input"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent appearance-none"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col">
                <button
                  type="button"
                  onClick={() => onChange({ weightKg: Math.min(300, data.weightKg + 1) })}
                  className="text-gray-400 hover:text-white p-0.5"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ weightKg: Math.max(30, data.weightKg - 1) })}
                  className="text-gray-400 hover:text-white p-0.5"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Height (cm)</label>
            <div className="relative">
              <input
                type="number"
                value={data.heightCm}
                onChange={(e) => onChange({ heightCm: parseInt(e.target.value) || 0 })}
                min={100}
                max={250}
                data-testid="height-input"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent appearance-none"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col">
                <button
                  type="button"
                  onClick={() => onChange({ heightCm: Math.min(250, data.heightCm + 1) })}
                  className="text-gray-400 hover:text-white p-0.5"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ heightCm: Math.max(100, data.heightCm - 1) })}
                  className="text-gray-400 hover:text-white p-0.5"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
