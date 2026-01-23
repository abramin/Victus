import { useState, useMemo, useEffect } from 'react';
import type {
  CreateDailyLogRequest,
  DailyLog,
  DayType,
  UserProfile,
  ActualTrainingSession,
  TrainingSession,
} from '../../api/types';
import { DayTargetsPanel } from '../day-view';
import { TrainingSessionList } from '../daily-input/TrainingSessionList';
import { ActualTrainingModal, ActualVsPlannedComparison } from '../training';
import { MorningCheckinSection } from './MorningCheckinSection';
import { DayTypeSelector } from './DayTypeSelector';
import { DailySummaryPanel } from './DailySummaryPanel';
import {
  DAY_TYPE_OPTIONS,
  TRAINING_LABELS,
  WEIGHT_MIN_KG,
  WEIGHT_MAX_KG,
  BODY_FAT_MIN_PERCENT,
  BODY_FAT_MAX_PERCENT,
  HEART_RATE_MIN_BPM,
  HEART_RATE_MAX_BPM,
  SLEEP_HOURS_MAX,
  SLEEP_QUALITY_MIN,
  SLEEP_QUALITY_MAX,
} from '../../constants';

interface DailyUpdateFormProps {
  onSubmit: (log: CreateDailyLogRequest) => Promise<DailyLog | null>;
  onReplace: (log: CreateDailyLogRequest) => Promise<DailyLog | null>;
  onUpdateActual: (sessions: Omit<ActualTrainingSession, 'sessionOrder'>[]) => Promise<DailyLog | null>;
  saving: boolean;
  error: string | null;
  profile: UserProfile;
  log: DailyLog | null;
}

const INITIAL_FORM_DATA: CreateDailyLogRequest = {
  weightKg: 0,
  sleepQuality: 50,
  plannedTrainingSessions: [{ type: 'rest', durationMin: 0 }],
  dayType: 'fatburner',
};

const stripSessionOrder = (sessions: TrainingSession[]) =>
  sessions.map(({ sessionOrder, ...rest }) => rest);

const buildFormDataFromLog = (log: DailyLog): CreateDailyLogRequest => ({
  date: log.date,
  weightKg: log.weightKg,
  bodyFatPercent: log.bodyFatPercent,
  restingHeartRate: log.restingHeartRate,
  sleepQuality: log.sleepQuality,
  sleepHours: log.sleepHours,
  plannedTrainingSessions: stripSessionOrder(log.plannedTrainingSessions),
  dayType: log.dayType,
});

export function DailyUpdateForm({
  onSubmit,
  onReplace,
  onUpdateActual,
  saving,
  error,
  profile,
  log,
}: DailyUpdateFormProps) {
  const [formData, setFormData] = useState<CreateDailyLogRequest>(INITIAL_FORM_DATA);
  const [showActualModal, setShowActualModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);

  const baselineData = useMemo(
    () => (log ? buildFormDataFromLog(log) : INITIAL_FORM_DATA),
    [log]
  );

  const hasChanges = useMemo(() => {
    return JSON.stringify(formData) !== JSON.stringify(baselineData);
  }, [formData, baselineData]);

  useEffect(() => {
    if (!isEditing) {
      if (log) {
        setFormData(buildFormDataFromLog(log));
      } else {
        setFormData(INITIAL_FORM_DATA);
      }
    }
  }, [isEditing, log]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.weightKg || formData.weightKg < WEIGHT_MIN_KG || formData.weightKg > WEIGHT_MAX_KG) {
      errors.weightKg = `Weight must be between ${WEIGHT_MIN_KG} and ${WEIGHT_MAX_KG} kg`;
    }

    if (
      formData.bodyFatPercent !== undefined &&
      (formData.bodyFatPercent < BODY_FAT_MIN_PERCENT || formData.bodyFatPercent > BODY_FAT_MAX_PERCENT)
    ) {
      errors.bodyFatPercent = `Body fat must be between ${BODY_FAT_MIN_PERCENT}% and ${BODY_FAT_MAX_PERCENT}%`;
    }

    if (
      formData.restingHeartRate !== undefined &&
      (formData.restingHeartRate < HEART_RATE_MIN_BPM || formData.restingHeartRate > HEART_RATE_MAX_BPM)
    ) {
      errors.restingHeartRate = `Resting heart rate must be between ${HEART_RATE_MIN_BPM} and ${HEART_RATE_MAX_BPM} bpm`;
    }

    if (
      formData.sleepHours !== undefined &&
      (formData.sleepHours < 0 || formData.sleepHours > SLEEP_HOURS_MAX)
    ) {
      errors.sleepHours = `Sleep duration must be between 0 and ${SLEEP_HOURS_MAX} hours`;
    }

    if (formData.sleepQuality < SLEEP_QUALITY_MIN || formData.sleepQuality > SLEEP_QUALITY_MAX) {
      errors.sleepQuality = `Sleep quality must be between ${SLEEP_QUALITY_MIN} and ${SLEEP_QUALITY_MAX}`;
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
    setFormData(baselineData);
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

  const handleEdit = () => {
    if (!log) return;
    setFormData(buildFormDataFromLog(log));
    setValidationErrors({});
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setValidationErrors({});
    if (log) {
      setFormData(buildFormDataFromLog(log));
      setIsEditing(false);
    } else {
      setFormData(INITIAL_FORM_DATA);
    }
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
    const payload = log ? { ...formData, date: log.date } : formData;
    const saved = log ? await onReplace(payload) : await onSubmit(payload);
    if (saved) {
      setIsEditing(false);
      setValidationErrors({});
    }
  };

  const updateFormData = (updates: Partial<CreateDailyLogRequest>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const showForm = !log || isEditing;
  const dayTypeDetail = log ? DAY_TYPE_OPTIONS.find((dt) => dt.value === log.dayType) : null;
  const summaryWeight = showForm ? formData.weightKg : log?.weightKg;
  const summarySleepQuality = showForm ? formData.sleepQuality : log?.sleepQuality;
  const summaryDayType = showForm ? formData.dayType : log?.dayType;
  const summarySessions = showForm ? formData.plannedTrainingSessions : log?.plannedTrainingSessions ?? [];

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Daily Update</h1>
          <p className="text-gray-400 text-sm">{todayLabel}</p>
        </div>
        <div className="flex gap-3">
          {showForm ? (
            <>
              {log && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              )}
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
                    {log ? 'Save Changes' : 'Save Update'}
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleEdit}
              className="px-4 py-2 rounded-lg font-medium bg-white text-black hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-1.5L7.5 16.5H4v-3.5L14.232 3.768a2.5 2.5 0 013.536 3.536z" />
              </svg>
              Edit
            </button>
          )}
        </div>
      </div>
      {showForm ? (
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
                {DAY_TYPE_OPTIONS.map((dt) => (
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
                    {summaryWeight ? `${summaryWeight} kg` : '--'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Sleep Quality</span>
                  <span className="text-white font-medium">
                    {summarySleepQuality !== undefined ? `${summarySleepQuality}/100` : '--'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Training</span>
                  <span className="text-white font-medium">
                    {summarySessions.filter((s) => s.type !== 'rest').length === 0
                      ? 'Rest day'
                      : `${summarySessions.length} session${summarySessions.length > 1 ? 's' : ''}`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Day Type</span>
                  <span className={`font-medium ${
                    summaryDayType === 'performance' ? 'text-blue-400' :
                    summaryDayType === 'fatburner' ? 'text-orange-400' : 'text-purple-400'
                  }`}>
                    {summaryDayType ? summaryDayType.charAt(0).toUpperCase() + summaryDayType.slice(1) : '--'}
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
      ) : (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <h3 className="text-white font-medium mb-4">Morning Check-in</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Weight</p>
                  <p className="text-white font-medium">{log?.weightKg ? `${log.weightKg} kg` : '--'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Body Fat</p>
                  <p className="text-white font-medium">{log?.bodyFatPercent ? `${log.bodyFatPercent}%` : '--'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Resting HR</p>
                  <p className="text-white font-medium">{log?.restingHeartRate ?? '--'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Sleep Hours</p>
                  <p className="text-white font-medium">{log?.sleepHours ?? '--'}</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">Sleep Quality</span>
                  <span className="text-white font-medium">{log?.sleepQuality}/100</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-white/70"
                    style={{ width: `${log?.sleepQuality ?? 0}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <h3 className="text-white font-medium mb-4">Today's Training</h3>
              <div className="space-y-3">
                {summarySessions.length === 0 ? (
                  <p className="text-sm text-gray-400">No training sessions logged.</p>
                ) : (
                  summarySessions.map((session, index) => (
                    <div
                      key={`${session.type}-${index}`}
                      className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-3 text-sm"
                    >
                      <span className="text-white">{TRAINING_LABELS[session.type]}</span>
                      <span className="text-gray-400">
                        {session.type === 'rest' ? 'Rest' : `${session.durationMin} min`}
                      </span>
                    </div>
                  ))
                )}
              </div>
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

            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <h3 className="text-white font-medium mb-2">Day Type</h3>
              <p className="text-white font-medium">{dayTypeDetail?.label ?? '--'}</p>
              <p className="text-sm text-gray-400">{dayTypeDetail?.description ?? ''}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <h3 className="text-white font-medium mb-4">Today's Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Weight</span>
                  <span className="text-white font-medium">
                    {summaryWeight ? `${summaryWeight} kg` : '--'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Sleep Quality</span>
                  <span className="text-white font-medium">
                    {summarySleepQuality !== undefined ? `${summarySleepQuality}/100` : '--'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Training</span>
                  <span className="text-white font-medium">
                    {summarySessions.filter((s) => s.type !== 'rest').length === 0
                      ? 'Rest day'
                      : `${summarySessions.length} session${summarySessions.length > 1 ? 's' : ''}`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Day Type</span>
                  <span className={`font-medium ${
                    summaryDayType === 'performance' ? 'text-blue-400' :
                    summaryDayType === 'fatburner' ? 'text-orange-400' : 'text-purple-400'
                  }`}>
                    {summaryDayType ? summaryDayType.charAt(0).toUpperCase() + summaryDayType.slice(1) : '--'}
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

            {error && (
              <div className="bg-red-900/30 border border-red-800 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>
        </div>
      )}

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
