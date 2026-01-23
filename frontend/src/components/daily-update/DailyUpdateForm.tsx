import { useState, useMemo } from 'react';
import type { CreateDailyLogRequest, DailyLog, DayType, UserProfile, ActualTrainingSession } from '../../api/types';
import { DayTargetsPanel } from '../day-view';
import { TrainingSessionList } from '../daily-input/TrainingSessionList';
import { ActualTrainingModal, ActualVsPlannedComparison } from '../training';

interface DailyUpdateFormProps {
  onSubmit: (log: CreateDailyLogRequest) => Promise<unknown>;
  onUpdateActual: (sessions: Omit<ActualTrainingSession, 'sessionOrder'>[]) => Promise<DailyLog | null>;
  saving: boolean;
  error: string | null;
  profile: UserProfile;
  log: DailyLog | null;
}

const DAY_TYPES: { value: DayType; label: string; description: string }[] = [
  { value: 'performance', label: 'Performance', description: 'Higher carbs for workout days' },
  { value: 'fatburner', label: 'Fatburner', description: 'Lower carbs for fat burning' },
  { value: 'metabolize', label: 'Metabolize', description: 'Balanced macros for recovery' },
];

const INITIAL_FORM_DATA: CreateDailyLogRequest = {
  weightKg: 0,
  sleepQuality: 50,
  plannedTrainingSessions: [{ type: 'rest', durationMin: 0 }],
  dayType: 'fatburner',
};

export function DailyUpdateForm({ onSubmit, onUpdateActual, saving, error, profile, log }: DailyUpdateFormProps) {
  const [formData, setFormData] = useState<CreateDailyLogRequest>(INITIAL_FORM_DATA);
  const [showActualModal, setShowActualModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const hasChanges = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(INITIAL_FORM_DATA);
  }, [formData]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.weightKg || formData.weightKg < 30 || formData.weightKg > 300) {
      errors.weightKg = 'Weight must be between 30 and 300 kg';
    }

    if (
      formData.bodyFatPercent !== undefined &&
      (formData.bodyFatPercent < 3 || formData.bodyFatPercent > 70)
    ) {
      errors.bodyFatPercent = 'Body fat must be between 3% and 70%';
    }

    if (
      formData.restingHeartRate !== undefined &&
      (formData.restingHeartRate < 30 || formData.restingHeartRate > 200)
    ) {
      errors.restingHeartRate = 'Resting heart rate must be between 30 and 200 bpm';
    }

    if (
      formData.sleepHours !== undefined &&
      (formData.sleepHours < 0 || formData.sleepHours > 24)
    ) {
      errors.sleepHours = 'Sleep duration must be between 0 and 24 hours';
    }

    if (formData.sleepQuality < 1 || formData.sleepQuality > 100) {
      errors.sleepQuality = 'Sleep quality must be between 1 and 100';
    }

    if (formData.plannedTrainingSessions.length === 0) {
      errors.training = 'Add at least one training session.';
    } else if (
      formData.plannedTrainingSessions.some(
        (session) => session.type !== 'rest' && session.durationMin <= 0
      )
    ) {
      errors.training = 'Duration is required for non-rest training.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleClear = () => {
    setFormData(INITIAL_FORM_DATA);
    setValidationErrors({});
  };

  const handleSaveActualTraining = async (
    sessions: Omit<ActualTrainingSession, 'sessionOrder'>[]
  ) => {
    const result = await onUpdateActual(sessions);
    if (result) {
      setShowActualModal(false);
      return true;
    }
    return false;
  };

  const today = new Date();
  const todayLabel = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const targetDate = log?.date ? new Date(log.date) : today;
  const targetDateLabel = targetDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const targets = log?.calculatedTargets ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
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
          <p className="text-gray-400 text-sm">{todayLabel}</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClear}
            disabled={!hasChanges}
            className={`px-4 py-2 transition-colors ${
              hasChanges
                ? 'text-gray-400 hover:text-white'
                : 'text-gray-600 cursor-not-allowed'
            }`}
          >
            Clear changes
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !hasChanges}
            className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2 ${
              hasChanges
                ? 'bg-white text-black hover:bg-gray-200'
                : 'bg-gray-700 text-gray-400'
            }`}
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
                {validationErrors.weightKg && (
                  <p className="text-xs text-red-400 mt-1">{validationErrors.weightKg}</p>
                )}
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
                {validationErrors.bodyFatPercent && (
                  <p className="text-xs text-red-400 mt-1">{validationErrors.bodyFatPercent}</p>
                )}
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
                {validationErrors.restingHeartRate && (
                  <p className="text-xs text-red-400 mt-1">{validationErrors.restingHeartRate}</p>
                )}
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
                {validationErrors.sleepHours && (
                  <p className="text-xs text-red-400 mt-1">{validationErrors.sleepHours}</p>
                )}
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
              {validationErrors.sleepQuality && (
                <p className="text-xs text-red-400 mt-1">{validationErrors.sleepQuality}</p>
              )}
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
            {validationErrors.training && (
              <p className="text-xs text-red-400 mt-2">{validationErrors.training}</p>
            )}
            {log && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowActualModal(true)}
                  className="text-sm text-white hover:text-gray-300 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  {log.actualTrainingSessions?.length ? 'Edit Actual Training' : 'Log Actual Training'}
                </button>
                {log.actualTrainingSessions && log.actualTrainingSessions.length > 0 && (
                  <p className="text-xs text-green-400 mt-1">
                    ✓ Logged: {log.actualTrainingSessions.length} session(s), {log.actualTrainingSessions.reduce((sum, s) => sum + s.durationMin, 0)} min total
                  </p>
                )}
                <div className="mt-2">
                  <ActualVsPlannedComparison
                    planned={log.plannedTrainingSessions}
                    actual={log.actualTrainingSessions}
                  />
                </div>
              </div>
            )}
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

          {targets ? (
            <DayTargetsPanel
              title="Day Targets"
              dateLabel={targetDateLabel}
              dayType={targets.dayType}
              mealTargets={targets.meals}
              mealRatios={profile.mealRatios}
              totalFruitG={targets.fruitG}
              totalVeggiesG={targets.veggiesG}
              waterL={targets.waterL}
              compact
              helperText="Calculated from your daily log."
            />
          ) : (
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <h3 className="text-white font-medium mb-2">Day Targets</h3>
              <p className="text-sm text-gray-400">
                Save your Daily Update to generate meal targets and fruit/veg splits.
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>
      </form>

      {/* Actual Training Modal */}
      {log && (
        <ActualTrainingModal
          isOpen={showActualModal}
          onClose={() => setShowActualModal(false)}
          plannedSessions={log.plannedTrainingSessions}
          actualSessions={log.actualTrainingSessions}
          onSave={handleSaveActualTraining}
          saving={saving}
        />
      )}
    </div>
  );
}
