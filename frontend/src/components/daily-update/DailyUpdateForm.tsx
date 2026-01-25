import { useState, useMemo, useEffect, useCallback } from 'react';
import type {
  CreateDailyLogRequest,
  DailyLog,
  UserProfile,
  TrainingSession,
  TrainingConfig,
  ActualTrainingSession,
} from '../../api/types';
import { DayTargetsPanel } from '../day-view';
import { calculateMealTargets } from '../targets/mealTargets';
import { MorningCheckinSection } from './MorningCheckinSection';
import { DayTypeSelector } from './DayTypeSelector';
import { DeficitMonitor, DailyMissionCard, TrainingLogCard } from '../saved-view';
import { getTrainingConfigs } from '../../api/client';
import { shallowEqual } from '../../utils/equality';
import { ReadinessGauge } from '../recovery';
import { BMRPrecisionBadge } from '../settings/BMRPrecisionBadge';
import { MetabolicTimer } from '../fasting';
import {
  DAY_TYPE_BADGE,
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
import { calculateProvisionalTargets } from '../../utils/calculateProvisionalTargets';

interface DailyUpdateFormProps {
  onSubmit: (log: CreateDailyLogRequest) => Promise<DailyLog | null>;
  onReplace: (log: CreateDailyLogRequest) => Promise<DailyLog | null>;
  onUpdateActual?: (sessions: Omit<ActualTrainingSession, 'sessionOrder'>[]) => Promise<DailyLog | null>;
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
  notes: '',
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
  notes: log.notes ?? '',
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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [dayTypeAutoSelected, setDayTypeAutoSelected] = useState(false);
  const [trainingConfigs, setTrainingConfigs] = useState<TrainingConfig[]>([]);

  const baselineData = useMemo(
    () => (log ? buildFormDataFromLog(log) : INITIAL_FORM_DATA),
    [log]
  );

  const hasChanges = useMemo(() => {
    return !shallowEqual(formData, baselineData);
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

  // Smart default: Auto-select Fatburner when training is rest day
  useEffect(() => {
    const isRestDay = formData.plannedTrainingSessions.every(
      (s) => s.type === 'rest'
    );
    if (isRestDay && formData.dayType !== 'fatburner') {
      setFormData((prev) => ({ ...prev, dayType: 'fatburner' }));
      setDayTypeAutoSelected(true);
    } else if (!isRestDay) {
      setDayTypeAutoSelected(false);
    }
  }, [formData.plannedTrainingSessions]);

  // Load training configs for Deficit Monitor MET calculations
  useEffect(() => {
    getTrainingConfigs()
      .then(setTrainingConfigs)
      .catch(() => {
        // Fallback to empty - DeficitMonitor will handle gracefully
      });
  }, []);

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

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleClear = () => {
    setFormData(baselineData);
    setValidationErrors({});
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
  const effectiveRatios = profile.effectiveMealRatios ?? profile.mealRatios;
  const adjustedMealTargets = useMemo(() => {
    if (!targets) return null;
    return calculateMealTargets(
      targets.totalCarbsG,
      targets.totalProteinG,
      targets.totalFatsG,
      targets.fruitG,
      targets.veggiesG,
      effectiveRatios,
      profile.pointsConfig,
      targets.dayType,
      profile.supplementConfig
    );
  }, [effectiveRatios, profile.pointsConfig, profile.supplementConfig, targets]);

  // Calculate provisional targets for live preview (when no saved log exists OR when editing)
  const provisionalTargets = useMemo(() => {
    // If editing an existing log, always show live preview based on current form data
    if (isEditing && hasChanges) {
      return calculateProvisionalTargets(profile, formData);
    }
    // For new logs, show provisional if we don't have saved targets
    if (!targets) {
      return calculateProvisionalTargets(profile, formData);
    }
    return null;
  }, [profile, formData, targets, isEditing, hasChanges]);

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

  // Handle toggling a training session as complete/incomplete
  const handleToggleSession = useCallback(
    (session: TrainingSession, completed: boolean) => {
      if (!onUpdateActual || !log) return;

      const currentActual = log.actualTrainingSessions ?? [];

      if (completed) {
        // Add this session to actual sessions
        const newActual: Omit<ActualTrainingSession, 'sessionOrder'>[] = [
          ...currentActual.map(({ sessionOrder, ...rest }) => rest),
          { type: session.type, durationMin: session.durationMin },
        ];
        onUpdateActual(newActual);
      } else {
        // Remove this session from actual sessions
        const newActual = currentActual
          .filter(
            (actual) =>
              !(actual.type === session.type && actual.durationMin === session.durationMin)
          )
          .map(({ sessionOrder, ...rest }) => rest);
        onUpdateActual(newActual);
      }
    },
    [onUpdateActual, log]
  );

  // Calculate total points for DailyMissionCard
  const totalPoints = useMemo(() => {
    if (!adjustedMealTargets) return 0;
    const { breakfast, lunch, dinner } = adjustedMealTargets;
    return (
      breakfast.carbs + breakfast.protein + breakfast.fats +
      lunch.carbs + lunch.protein + lunch.fats +
      dinner.carbs + dinner.protein + dinner.fats
    );
  }, [adjustedMealTargets]);

  const showForm = !log || isEditing;
  const summaryWeight = showForm ? formData.weightKg : log?.weightKg;
  const summarySleepQuality = showForm ? formData.sleepQuality : log?.sleepQuality;
  const summaryDayType = showForm ? formData.dayType : log?.dayType;

  return (
    <div className="p-6" data-testid="daily-update-form">
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
                data-testid="save-log-button"
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
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column - Morning Check-in */}
          <div className="lg:col-span-3 space-y-6">
            <MorningCheckinSection
              formData={formData}
              onUpdate={updateFormData}
              validationErrors={validationErrors}
            />

            <DayTypeSelector
              selectedDayType={formData.dayType}
              onDayTypeChange={(dt) => {
                updateFormData({ dayType: dt });
                setDayTypeAutoSelected(false);
              }}
              variant="cards"
              showAutoSelectedHint={dayTypeAutoSelected}
            />

            {/* Notes */}
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <h3 className="text-white font-medium mb-4">Notes</h3>
              <textarea
                value={formData.notes ?? ''}
                onChange={(e) => updateFormData({ notes: e.target.value })}
                placeholder="How did you feel today? Any observations?"
                rows={3}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none"
              />
            </div>

            {/* Bottom Save Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving || !hasChanges}
                data-testid="save-log-button-bottom"
                className={`px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2 ${
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
                    {log ? 'Save Changes' : 'Save & Generate Targets'}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column - Summary */}
          <div className="lg:col-span-2 space-y-6">
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

            {provisionalTargets ? (
              <DayTargetsPanel
                title="Day Targets"
                dateLabel={targetDateLabel}
                dayType={provisionalTargets.dayType}
                mealTargets={provisionalTargets.meals}
                mealRatios={profile.mealRatios}
                totalFruitG={provisionalTargets.fruitG}
                totalVeggiesG={provisionalTargets.veggiesG}
                waterL={provisionalTargets.waterL}
                compact
                isProvisional
                helperText={isEditing ? "Preview - save to apply changes." : "Live preview - save to confirm targets."}
              />
            ) : targets ? (
              <DayTargetsPanel
                title="Day Targets"
                dateLabel={targetDateLabel}
                dayType={targets.dayType}
                mealTargets={adjustedMealTargets ?? targets.meals}
                mealRatios={profile.mealRatios}
                totalFruitG={targets.fruitG}
                totalVeggiesG={targets.veggiesG}
                waterL={targets.waterL}
                compact
                helperText="Adjusted to your current meal distribution."
              />
            ) : (
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                <h3 className="text-white font-medium mb-2">Day Targets</h3>
                <p className="text-sm text-gray-400">
                  Enter your weight to see a live preview of your targets.
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
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column (60%) - Status Feed */}
          <div className="lg:col-span-3 space-y-4">
            {/* Morning Check-in Card with Day Type Badge */}
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-medium">Check-in</h3>
                {/* Day Type Badge - Hero Element */}
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${
                  DAY_TYPE_BADGE[summaryDayType ?? 'fatburner'].className
                }`}>
                  {DAY_TYPE_BADGE[summaryDayType ?? 'fatburner'].label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400 text-xs block mb-1">Weight</span>
                  <span className="text-xl font-semibold text-white">
                    {log?.weightKg ? `${log.weightKg} kg` : '--'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 text-xs block mb-1">Sleep Quality</span>
                  <span className="text-xl font-semibold text-white">
                    {log?.sleepQuality}/100
                  </span>
                </div>
              </div>
              {(log?.bodyFatPercent || log?.restingHeartRate || log?.sleepHours || log?.bmrPrecisionMode) && (
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 pt-4 border-t border-gray-800 text-sm text-gray-400 items-center">
                  {log?.bodyFatPercent && <span>Body Fat: {log.bodyFatPercent}%</span>}
                  {log?.restingHeartRate && <span>HR: {log.restingHeartRate} bpm</span>}
                  {log?.sleepHours && <span>Slept: {log.sleepHours}h</span>}
                  {log?.bmrPrecisionMode && (
                    <BMRPrecisionBadge active={true} bodyFatDate={log.bodyFatUsedDate} />
                  )}
                </div>
              )}
            </div>

            {/* Readiness Gauge */}
            {log?.recoveryScore && (
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                <h3 className="text-white font-medium mb-4">Recovery Readiness</h3>
                <div className="flex justify-center">
                  <ReadinessGauge
                    score={log.recoveryScore.score}
                    components={log.recoveryScore}
                    showNudge={log.recoveryScore.score < 50}
                  />
                </div>
              </div>
            )}

            {/* Metabolic Timer - Only show for fasting protocols */}
            {profile.fastingProtocol && profile.fastingProtocol !== 'standard' && (
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                <div className="flex justify-center">
                  <MetabolicTimer
                    protocol={profile.fastingProtocol}
                    eatingWindowStart={profile.eatingWindowStart ?? '12:00'}
                    eatingWindowEnd={profile.eatingWindowEnd ?? '20:00'}
                  />
                </div>
              </div>
            )}

            {/* Training Log Card with Completion Checkboxes */}
            {log && (
              <TrainingLogCard
                plannedSessions={log.plannedTrainingSessions}
                actualSessions={log.actualTrainingSessions}
                onToggleSession={handleToggleSession}
                saving={saving}
              />
            )}

            {/* Activity & Deficit Monitor - Enhanced */}
            {log && targets && (
              <DeficitMonitor
                plannedSessions={log.plannedTrainingSessions}
                trainingConfigs={trainingConfigs}
                weightKg={log.weightKg}
                activeCaloriesBurned={log.activeCaloriesBurned}
                totalCalories={targets.totalCalories}
              />
            )}

            {error && (
              <div className="bg-red-900/30 border border-red-800 rounded-lg p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Right Column (40%) - Daily Mission */}
          <div className="lg:col-span-2">
            {log && targets ? (
              <DailyMissionCard
                targets={targets}
                totalPoints={totalPoints}
                date={log.date}
              />
            ) : (
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                <h3 className="text-white font-medium mb-2">Today's Fuel</h3>
                <p className="text-sm text-gray-400">
                  Complete your check-in to see your nutrition targets.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
