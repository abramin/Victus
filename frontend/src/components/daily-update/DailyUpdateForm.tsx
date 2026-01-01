import { useState } from 'react';
import type { CreateDailyLogRequest, DayType } from '../../api/types';
import { TrainingSessionList } from '../daily-input/TrainingSessionList';

interface DailyUpdateFormProps {
  onSubmit: (log: CreateDailyLogRequest) => Promise<unknown>;
  saving: boolean;
  error: string | null;
}

const DAY_TYPES: { value: DayType; label: string; description: string }[] = [
  { value: 'performance', label: 'Performance', description: 'Higher carbs for workout days' },
  { value: 'fatburner', label: 'Fatburner', description: 'Lower carbs for fat burning' },
  { value: 'metabolize', label: 'Metabolize', description: 'Balanced macros for recovery' },
];

export function DailyUpdateForm({ onSubmit, saving, error }: DailyUpdateFormProps) {
  const [formData, setFormData] = useState<CreateDailyLogRequest>({
    weightKg: 0,
    sleepQuality: 50,
    plannedTrainingSessions: [{ type: 'rest', durationMin: 0 }],
    dayType: 'fatburner',
  });

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const updateFormData = (updates: Partial<CreateDailyLogRequest>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Daily Update</h1>
          <p className="text-gray-400 text-sm">{today}</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              'Saving...'
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Update
              </>
            )}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-6">
        {/* Left Column - Morning Check-in */}
        <div className="col-span-2 space-y-6">
          {/* Morning Biometrics */}
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <h3 className="text-white font-medium mb-4">Morning Check-in</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Weight */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Weight (kg)</label>
                <input
                  type="number"
                  value={formData.weightKg || ''}
                  onChange={(e) => updateFormData({ weightKg: parseFloat(e.target.value) || 0 })}
                  step={0.1}
                  placeholder="Enter weight"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>

              {/* Body Fat */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Body Fat % (optional)</label>
                <input
                  type="number"
                  value={formData.bodyFatPercent || ''}
                  onChange={(e) => updateFormData({ bodyFatPercent: parseFloat(e.target.value) || undefined })}
                  step={0.1}
                  placeholder="Optional"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>

              {/* Resting Heart Rate */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Resting Heart Rate (bpm)</label>
                <input
                  type="number"
                  value={formData.restingHeartRate || ''}
                  onChange={(e) => updateFormData({ restingHeartRate: parseInt(e.target.value) || undefined })}
                  placeholder="Optional"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>

              {/* Sleep Hours */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Sleep Duration (hrs)</label>
                <input
                  type="number"
                  value={formData.sleepHours || ''}
                  onChange={(e) => updateFormData({ sleepHours: parseFloat(e.target.value) || undefined })}
                  step={0.5}
                  placeholder="Optional"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>
            </div>

            {/* Sleep Quality Slider */}
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-gray-400">Sleep Quality</label>
                <span className="text-white font-medium">{formData.sleepQuality}/100</span>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                value={formData.sleepQuality}
                onChange={(e) => updateFormData({ sleepQuality: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Poor</span>
                <span>Excellent</span>
              </div>
            </div>
          </div>

          {/* Planned Training */}
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <h3 className="text-white font-medium mb-4">Today's Training</h3>
            <TrainingSessionList
              sessions={formData.plannedTrainingSessions}
              onSessionsChange={(sessions) =>
                updateFormData({ plannedTrainingSessions: sessions })
              }
            />
          </div>

          {/* Day Type Selection */}
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <h3 className="text-white font-medium mb-4">Day Type</h3>
            <div className="space-y-3">
              {DAY_TYPES.map((dt) => (
                <label
                  key={dt.value}
                  className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-colors ${
                    formData.dayType === dt.value
                      ? 'bg-gray-800 border-2 border-white/30'
                      : 'bg-gray-800/50 border-2 border-transparent hover:bg-gray-800'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      formData.dayType === dt.value ? 'border-white bg-white' : 'border-gray-600'
                    }`}
                  >
                    {formData.dayType === dt.value && (
                      <div className="w-2 h-2 rounded-full bg-black" />
                    )}
                  </div>
                  <div>
                    <div className="text-white font-medium">{dt.label}</div>
                    <div className="text-sm text-gray-400">{dt.description}</div>
                  </div>
                  <input
                    type="radio"
                    name="dayType"
                    value={dt.value}
                    checked={formData.dayType === dt.value}
                    onChange={() => updateFormData({ dayType: dt.value })}
                    className="sr-only"
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <h3 className="text-white font-medium mb-4">Notes</h3>
            <textarea
              placeholder="How did you feel today? Any observations?"
              rows={3}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none"
            />
          </div>
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          {/* Quick Summary */}
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <h3 className="text-white font-medium mb-4">Today's Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Weight</span>
                <span className="text-white font-medium">
                  {formData.weightKg ? `${formData.weightKg} kg` : '--'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Sleep Quality</span>
                <span className="text-white font-medium">{formData.sleepQuality}/100</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Training</span>
                <span className="text-white font-medium">
                  {formData.plannedTrainingSessions.filter((s) => s.type !== 'rest').length === 0
                    ? 'Rest day'
                    : `${formData.plannedTrainingSessions.length} session${formData.plannedTrainingSessions.length > 1 ? 's' : ''}`}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Day Type</span>
                <span className={`font-medium ${
                  formData.dayType === 'performance' ? 'text-blue-400' :
                  formData.dayType === 'fatburner' ? 'text-orange-400' : 'text-purple-400'
                }`}>
                  {formData.dayType.charAt(0).toUpperCase() + formData.dayType.slice(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
