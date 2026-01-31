import { useState, useEffect, useRef, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CreateDailyLogRequest, DayType, TrainingSession, UserProfile } from '../../api/types';
import {
  WEIGHT_MIN_KG,
  WEIGHT_MAX_KG,
  BODY_FAT_MIN_PERCENT,
  BODY_FAT_MAX_PERCENT,
  SLEEP_HOURS_MIN,
  SLEEP_HOURS_MAX,
  HRV_MIN_MS,
  HRV_MAX_MS,
  HEART_RATE_MIN_BPM,
  HEART_RATE_MAX_BPM,
  DAY_TYPE_BADGE,
} from '../../constants';

export type Feeling = 'rest' | 'ready';

interface MorningCheckinModalProps {
  isOpen: boolean;
  onComplete: (data: CheckinData) => Promise<void>;
  onClose?: () => void;
  profile: UserProfile;
  plannedSessions: TrainingSession[];
  yesterdayHrv?: number;
  saving?: boolean;
  mode?: 'create' | 'edit';
  initialData?: {
    weightKg: number;
    bodyFatPercent?: number;
    sleepHours: number;
    sleepQuality: number;
    hrvMs?: number;
    restingHeartRate?: number;
    dayType: DayType;
  };
}

export interface CheckinData {
  weightKg: number;
  bodyFatPercent?: number;
  sleepHours: number;
  sleepQuality: number;
  hrvMs?: number;
  restingHeartRate?: number;
  feeling: Feeling;
  dayType: DayType;
  plannedTrainingSessions: TrainingSession[];
}

function inferDayTypeFromSessions(sessions: TrainingSession[]): DayType {
  // If all sessions are rest, use Fatburner
  const isRestDay = sessions.every((s) => s.type === 'rest');
  if (isRestDay) return 'fatburner';

  // If strength or hiit planned, use Performance
  const hasIntense = sessions.some((s) =>
    ['strength', 'hiit', 'calisthenics'].includes(s.type)
  );
  if (hasIntense) return 'performance';

  // Otherwise, Metabolize (moderate activity like walking, yoga, etc.)
  return 'metabolize';
}

// Convert sleep hours to approximate quality score (simple heuristic)
function sleepHoursToQuality(hours: number): number {
  if (hours >= 8) return 85;
  if (hours >= 7) return 70;
  if (hours >= 6) return 55;
  if (hours >= 5) return 40;
  return 25;
}

export function MorningCheckinModal({
  isOpen,
  onComplete,
  onClose,
  profile,
  plannedSessions,
  yesterdayHrv,
  saving = false,
  mode = 'create',
  initialData,
}: MorningCheckinModalProps) {
  const isEditMode = mode === 'edit';
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const sleepSliderId = useId();

  // Form state - initialize from initialData in edit mode
  const [weightKg, setWeightKg] = useState<number | ''>(() =>
    initialData?.weightKg ?? ''
  );
  const [sleepHours, setSleepHours] = useState(() =>
    initialData?.sleepHours ?? 7
  );
  const [bodyFatPercent, setBodyFatPercent] = useState<number | ''>(() =>
    initialData?.bodyFatPercent ?? ''
  );
  const [hrvMs, setHrvMs] = useState<number | ''>(() =>
    initialData?.hrvMs ?? ''
  );
  const [restingHeartRate, setRestingHeartRate] = useState<number | ''>(() =>
    initialData?.restingHeartRate ?? ''
  );
  const [feeling, setFeeling] = useState<Feeling>('ready');
  const [dayType, setDayType] = useState<DayType>(() =>
    initialData?.dayType ?? inferDayTypeFromSessions(plannedSessions)
  );
  const [showDayTypeOverride, setShowDayTypeOverride] = useState(isEditMode);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset form when modal opens (handles both create and edit modes)
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && initialData) {
        setWeightKg(initialData.weightKg);
        setBodyFatPercent(initialData.bodyFatPercent ?? '');
        setSleepHours(initialData.sleepHours);
        setHrvMs(initialData.hrvMs ?? '');
        setRestingHeartRate(initialData.restingHeartRate ?? '');
        setDayType(initialData.dayType);
        setShowDayTypeOverride(true);
      } else {
        // Create mode: pre-fill from profile/yesterday
        if (profile.currentWeightKg) {
          setWeightKg(profile.currentWeightKg);
        }
        if (yesterdayHrv) {
          setHrvMs(yesterdayHrv);
        }
        setDayType(inferDayTypeFromSessions(plannedSessions));
        setShowDayTypeOverride(false);
      }
      setValidationError(null);
    }
  }, [isOpen, isEditMode, initialData, profile.currentWeightKg, yesterdayHrv, plannedSessions]);

  // Update day type when sessions change (only in create mode)
  useEffect(() => {
    if (!isEditMode && !showDayTypeOverride) {
      setDayType(inferDayTypeFromSessions(plannedSessions));
    }
  }, [plannedSessions, showDayTypeOverride, isEditMode]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      requestAnimationFrame(() => {
        const firstInput = dialogRef.current?.querySelector<HTMLInputElement>(
          'input[type="number"]'
        );
        firstInput?.focus();
      });
    } else if (previousActiveElement.current) {
      if (document.body.contains(previousActiveElement.current)) {
        previousActiveElement.current.focus();
      }
      previousActiveElement.current = null;
    }
  }, [isOpen]);

  // Focus trap and escape key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key closes modal in edit mode
      if (e.key === 'Escape' && isOpen && isEditMode && onClose) {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && isOpen && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, input, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isEditMode, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleSubmit = async () => {
    // Validation
    if (!weightKg || weightKg < WEIGHT_MIN_KG || weightKg > WEIGHT_MAX_KG) {
      setValidationError(`Weight must be between ${WEIGHT_MIN_KG} and ${WEIGHT_MAX_KG} kg`);
      return;
    }

    // Body Fat validation (optional, but if provided must be in range)
    if (bodyFatPercent !== '' && (bodyFatPercent < BODY_FAT_MIN_PERCENT || bodyFatPercent > BODY_FAT_MAX_PERCENT)) {
      setValidationError(`Body Fat must be between ${BODY_FAT_MIN_PERCENT} and ${BODY_FAT_MAX_PERCENT}%`);
      return;
    }

    // HRV validation (optional, but if provided must be in range)
    if (hrvMs !== '' && (hrvMs < HRV_MIN_MS || hrvMs > HRV_MAX_MS)) {
      setValidationError(`HRV must be between ${HRV_MIN_MS} and ${HRV_MAX_MS} ms`);
      return;
    }

    // RHR validation (optional, but if provided must be in range)
    if (restingHeartRate !== '' && (restingHeartRate < HEART_RATE_MIN_BPM || restingHeartRate > HEART_RATE_MAX_BPM)) {
      setValidationError(`Resting HR must be between ${HEART_RATE_MIN_BPM} and ${HEART_RATE_MAX_BPM} bpm`);
      return;
    }

    setValidationError(null);

    const checkinData: CheckinData = {
      weightKg: Number(weightKg),
      bodyFatPercent: bodyFatPercent !== '' ? bodyFatPercent : undefined,
      sleepHours,
      sleepQuality: sleepHoursToQuality(sleepHours),
      hrvMs: hrvMs !== '' ? hrvMs : undefined,
      restingHeartRate: restingHeartRate !== '' ? restingHeartRate : undefined,
      feeling,
      dayType,
      plannedTrainingSessions: plannedSessions.length > 0
        ? plannedSessions
        : [{ type: 'rest', durationMin: 0 }],
    };

    await onComplete(checkinData);
  };

  const dayTypeBadge = DAY_TYPE_BADGE[dayType];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkin-title"
            className="relative w-full max-w-md mx-4 p-8"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="text-center mb-8">
              {isEditMode && onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <h1
                id="checkin-title"
                className="text-3xl font-bold text-white mb-2"
              >
                {isEditMode ? 'Edit Check-in' : 'Good Morning'}
              </h1>
              <p className="text-gray-400">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            {/* Weight and Body Fat Inputs - Side by Side */}
            <div className="mb-6 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Weight (kg) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={weightKg}
                  onChange={(e) => {
                    setWeightKg(e.target.value ? parseFloat(e.target.value) : '');
                    setValidationError(null);
                  }}
                  step={0.1}
                  min={WEIGHT_MIN_KG}
                  max={WEIGHT_MAX_KG}
                  placeholder="Enter weight"
                  className="w-full px-3 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-lg text-center placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Body Fat % <span className="text-gray-500 text-xs">(opt)</span>
                </label>
                <input
                  type="number"
                  value={bodyFatPercent}
                  onChange={(e) => {
                    setBodyFatPercent(e.target.value ? parseFloat(e.target.value) : '');
                    setValidationError(null);
                  }}
                  step={0.1}
                  min={BODY_FAT_MIN_PERCENT}
                  max={BODY_FAT_MAX_PERCENT}
                  placeholder="e.g. 15"
                  className="w-full px-3 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-lg text-center placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
            </div>

            {/* Sleep Hours Slider */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label htmlFor={sleepSliderId} className="text-sm text-gray-400">
                  Sleep Duration
                </label>
                <span className="text-white font-medium text-lg">
                  {sleepHours}h
                </span>
              </div>
              <input
                id={sleepSliderId}
                type="range"
                min={SLEEP_HOURS_MIN}
                max={12}
                step={0.5}
                value={sleepHours}
                onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0h</span>
                <span>6h</span>
                <span>12h</span>
              </div>
            </div>

            {/* HRV and RHR Inputs - Side by Side */}
            <div className="mb-6 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  HRV (ms) <span className="text-gray-500 text-xs">(opt)</span>
                </label>
                <input
                  type="number"
                  value={hrvMs}
                  onChange={(e) => {
                    setHrvMs(e.target.value ? parseInt(e.target.value, 10) : '');
                    setValidationError(null);
                  }}
                  min={HRV_MIN_MS}
                  max={HRV_MAX_MS}
                  placeholder="rMSSD"
                  className="w-full px-3 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-center placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  RHR (bpm) <span className="text-gray-500 text-xs">(opt)</span>
                </label>
                <input
                  type="number"
                  value={restingHeartRate}
                  onChange={(e) => {
                    setRestingHeartRate(e.target.value ? parseInt(e.target.value, 10) : '');
                    setValidationError(null);
                  }}
                  min={HEART_RATE_MIN_BPM}
                  max={HEART_RATE_MAX_BPM}
                  placeholder="Resting"
                  className="w-full px-3 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white text-center placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
            </div>

            {/* Feeling Toggle */}
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-3">
                How are you feeling?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFeeling('rest')}
                  className={`px-4 py-4 rounded-xl font-medium transition-all ${feeling === 'rest'
                      ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                >
                  <span className="block text-2xl mb-1">😴</span>
                  Need Rest
                </button>
                <button
                  type="button"
                  onClick={() => setFeeling('ready')}
                  className={`px-4 py-4 rounded-xl font-medium transition-all ${feeling === 'ready'
                      ? 'bg-green-600 text-white ring-2 ring-green-400'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                >
                  <span className="block text-2xl mb-1">💪</span>
                  Ready
                </button>
              </div>
            </div>

            {/* Day Type (Auto-selected) */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Day Type</span>
                <button
                  type="button"
                  onClick={() => setShowDayTypeOverride(!showDayTypeOverride)}
                  className="text-xs text-gray-500 hover:text-gray-300 underline"
                >
                  {showDayTypeOverride ? 'Auto-select' : 'Change'}
                </button>
              </div>

              {showDayTypeOverride ? (
                <div className="grid grid-cols-3 gap-2">
                  {(['performance', 'fatburner', 'metabolize'] as DayType[]).map(
                    (dt) => (
                      <button
                        key={dt}
                        type="button"
                        onClick={() => setDayType(dt)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${dayType === dt
                            ? `${DAY_TYPE_BADGE[dt].className} ring-1`
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                          }`}
                      >
                        {DAY_TYPE_BADGE[dt].label}
                      </button>
                    )
                  )}
                </div>
              ) : (
                <div
                  className={`px-4 py-3 rounded-xl text-center font-medium border ${dayTypeBadge.className}`}
                >
                  {dayTypeBadge.label}
                  <span className="block text-xs opacity-70 mt-1">
                    Based on your training schedule
                  </span>
                </div>
              )}
            </div>

            {/* Validation Error */}
            {validationError && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg">
                <p className="text-red-400 text-sm text-center">{validationError}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="w-full py-4 rounded-xl font-semibold text-lg bg-white text-black hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {isEditMode ? 'Saving...' : 'Starting...'}
                </span>
              ) : (
                isEditMode ? 'Save Changes' : 'Start Day'
              )}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
