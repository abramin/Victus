import { useState } from 'react';
import type { CreateDailyLogRequest, TrainingType, DayType } from '../../api/types';
import { Card } from '../common/Card';
import { NumberInput } from '../common/NumberInput';
import { Button } from '../common/Button';
import { Select } from '../common/Select';
import { TrainingSelector } from './TrainingSelector';
import { SleepQualityInput } from './SleepQualityInput';

const DAY_TYPE_OPTIONS = [
  { value: 'fatburner', label: 'Fatburner (Lower Carbs)' },
  { value: 'performance', label: 'Performance (Higher Carbs)' },
  { value: 'metabolize', label: 'Metabolize (Maintenance)' },
];

interface DailyLogFormProps {
  onSubmit: (log: CreateDailyLogRequest) => Promise<unknown>;
  saving: boolean;
  error: string | null;
}

const DEFAULT_LOG: CreateDailyLogRequest = {
  weightKg: 0,
  sleepQuality: 50,
  plannedTrainingSessions: [
    {
      type: 'rest',
      durationMin: 0,
    },
  ],
  dayType: 'fatburner',
};

export function DailyLogForm({ onSubmit, saving, error }: DailyLogFormProps) {
  const [formData, setFormData] = useState<CreateDailyLogRequest>(DEFAULT_LOG);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.weightKg || formData.weightKg < 30 || formData.weightKg > 300) {
      errors.weight = 'Weight must be between 30 and 300 kg';
    }

    if (formData.bodyFatPercent !== undefined) {
      if (formData.bodyFatPercent < 3 || formData.bodyFatPercent > 70) {
        errors.bodyFat = 'Body fat must be between 3 and 70%';
      }
    }

    if (formData.restingHeartRate !== undefined) {
      if (formData.restingHeartRate < 30 || formData.restingHeartRate > 200) {
        errors.heartRate = 'Heart rate must be between 30 and 200 bpm';
      }
    }

    if (formData.sleepQuality < 1 || formData.sleepQuality > 100) {
      errors.sleepQuality = 'Sleep quality must be between 1 and 100';
    }

    if (formData.sleepHours !== undefined) {
      if (formData.sleepHours < 0 || formData.sleepHours > 24) {
        errors.sleepHours = 'Sleep hours must be between 0 and 24';
      }
    }

    const primarySession = formData.plannedTrainingSessions[0];
    if (!primarySession?.type) {
      errors.trainingType = 'Training type is required';
    }

    if (
      primarySession?.type !== 'rest' &&
      (primarySession?.durationMin ?? 0) <= 0
    ) {
      errors.trainingDuration = 'Duration is required for non-rest training';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Morning Biometrics */}
      <Card title="Morning Check-In">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumberInput
            label="Weight"
            value={formData.weightKg}
            onChange={(v) => updateFormData({ weightKg: v })}
            min={30}
            max={300}
            step={0.1}
            unit="kg"
            error={validationErrors.weight}
            required
          />

          <NumberInput
            label="Body Fat"
            value={formData.bodyFatPercent || 0}
            onChange={(v) => updateFormData({ bodyFatPercent: v || undefined })}
            min={3}
            max={70}
            step={0.1}
            unit="%"
            error={validationErrors.bodyFat}
          />

          <NumberInput
            label="Resting Heart Rate"
            value={formData.restingHeartRate || 0}
            onChange={(v) => updateFormData({ restingHeartRate: v || undefined })}
            min={30}
            max={200}
            step={1}
            unit="bpm"
            error={validationErrors.heartRate}
          />
        </div>
      </Card>

      {/* Sleep Quality */}
      <Card title="Sleep">
        <div className="space-y-4">
          <SleepQualityInput
            value={formData.sleepQuality}
            onChange={(v) => updateFormData({ sleepQuality: v })}
            error={validationErrors.sleepQuality}
          />

          <NumberInput
            label="Sleep Duration"
            value={formData.sleepHours || 0}
            onChange={(v) => updateFormData({ sleepHours: v || undefined })}
            min={0}
            max={24}
            step={0.5}
            unit="hrs"
            error={validationErrors.sleepHours}
          />
        </div>
      </Card>

      {/* Training Plan */}
      <Card title="Today's Training">
        <div className="space-y-4">
          <TrainingSelector
            type={formData.plannedTrainingSessions[0]?.type ?? 'rest'}
            duration={formData.plannedTrainingSessions[0]?.durationMin ?? 0}
            onTypeChange={(type: TrainingType) =>
              updateFormData({
                plannedTrainingSessions: [
                  {
                    ...formData.plannedTrainingSessions[0],
                    type,
                    durationMin: type === 'rest' ? 0 : (formData.plannedTrainingSessions[0]?.durationMin ?? 0),
                  },
                ],
              })
            }
            onDurationChange={(duration: number) =>
              updateFormData({
                plannedTrainingSessions: [
                  { ...formData.plannedTrainingSessions[0], durationMin: duration },
                ],
              })
            }
            typeError={validationErrors.trainingType}
            durationError={validationErrors.trainingDuration}
          />

          <Select
            label="Day Type"
            value={formData.dayType}
            onChange={(value) => updateFormData({ dayType: value as DayType })}
            options={DAY_TYPE_OPTIONS}
            required
          />
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-900/50 border border-red-700 rounded-md">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button type="submit" loading={saving}>
          Calculate Targets
        </Button>
      </div>
    </form>
  );
}
