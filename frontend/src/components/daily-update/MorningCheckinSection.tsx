import { useId } from 'react';
import type { CreateDailyLogRequest } from '../../api/types';
import {
  WEIGHT_MIN_KG,
  WEIGHT_MAX_KG,
  BODY_FAT_MIN_PERCENT,
  BODY_FAT_MAX_PERCENT,
  HEART_RATE_MIN_BPM,
  HEART_RATE_MAX_BPM,
  SLEEP_HOURS_MIN,
  SLEEP_HOURS_MAX,
  SLEEP_QUALITY_MIN,
  SLEEP_QUALITY_MAX,
} from '../../constants';
import { Panel } from '../common/Panel';

interface MorningCheckinSectionProps {
  formData: CreateDailyLogRequest;
  onUpdate: (updates: Partial<CreateDailyLogRequest>) => void;
  validationErrors: Record<string, string>;
}

export function MorningCheckinSection({
  formData,
  onUpdate,
  validationErrors,
}: MorningCheckinSectionProps) {
  const sleepQualityId = useId();

  return (
    <Panel title="Morning Check-in">
      <div className="grid grid-cols-2 gap-4">
        {/* Weight */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Weight (kg)</label>
          <input
            type="number"
            value={formData.weightKg || ''}
            onChange={(e) => onUpdate({ weightKg: parseFloat(e.target.value) || 0 })}
            step={0.1}
            min={WEIGHT_MIN_KG}
            max={WEIGHT_MAX_KG}
            placeholder="Enter weight"
            data-testid="weight-input"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
          />
          {validationErrors.weightKg && (
            <p className="text-xs text-red-400 mt-1" data-testid="weight-error">{validationErrors.weightKg}</p>
          )}
        </div>

        {/* Body Fat */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Body Fat % (optional)</label>
          <input
            type="number"
            value={formData.bodyFatPercent || ''}
            onChange={(e) => onUpdate({ bodyFatPercent: parseFloat(e.target.value) || undefined })}
            step={0.1}
            min={BODY_FAT_MIN_PERCENT}
            max={BODY_FAT_MAX_PERCENT}
            placeholder="Optional"
            data-testid="bodyFat-input"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
          />
          {validationErrors.bodyFatPercent && (
            <p className="text-xs text-red-400 mt-1" data-testid="bodyFat-error">{validationErrors.bodyFatPercent}</p>
          )}
        </div>

        {/* Resting Heart Rate */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Resting Heart Rate (bpm)</label>
          <input
            type="number"
            value={formData.restingHeartRate || ''}
            onChange={(e) => onUpdate({ restingHeartRate: parseInt(e.target.value) || undefined })}
            min={HEART_RATE_MIN_BPM}
            max={HEART_RATE_MAX_BPM}
            placeholder="Optional"
            data-testid="heartRate-input"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
          />
          {validationErrors.restingHeartRate && (
            <p className="text-xs text-red-400 mt-1" data-testid="heartRate-error">{validationErrors.restingHeartRate}</p>
          )}
        </div>

        {/* Sleep Hours */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Sleep Duration (hrs)</label>
          <input
            type="number"
            value={formData.sleepHours || ''}
            onChange={(e) => onUpdate({ sleepHours: parseFloat(e.target.value) || undefined })}
            step={0.5}
            min={SLEEP_HOURS_MIN}
            max={SLEEP_HOURS_MAX}
            placeholder="Optional"
            data-testid="sleepHours-input"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
          />
          {validationErrors.sleepHours && (
            <p className="text-xs text-red-400 mt-1" data-testid="sleepHours-error">{validationErrors.sleepHours}</p>
          )}
        </div>
      </div>

      {/* Sleep Quality Slider */}
      <div className="mt-4">
        <div className="flex justify-between items-center mb-2">
          <label htmlFor={sleepQualityId} className="text-sm text-gray-400">Sleep Quality</label>
          <span className="text-white font-medium">{formData.sleepQuality}/{SLEEP_QUALITY_MAX}</span>
        </div>
        <input
          id={sleepQualityId}
          type="range"
          min={SLEEP_QUALITY_MIN}
          max={SLEEP_QUALITY_MAX}
          value={formData.sleepQuality}
          onChange={(e) => onUpdate({ sleepQuality: parseInt(e.target.value) })}
          aria-valuemin={SLEEP_QUALITY_MIN}
          aria-valuemax={SLEEP_QUALITY_MAX}
          aria-valuenow={formData.sleepQuality}
          data-testid="sleepQuality-input"
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Poor</span>
          <span>Excellent</span>
        </div>
        {validationErrors.sleepQuality && (
          <p className="text-xs text-red-400 mt-1" data-testid="sleepQuality-error">{validationErrors.sleepQuality}</p>
        )}
      </div>
    </Panel>
  );
}
