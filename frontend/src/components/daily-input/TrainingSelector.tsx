import type { TrainingType } from '../../api/types';
import { Select } from '../common/Select';
import { NumberInput } from '../common/NumberInput';

const TRAINING_OPTIONS = [
  { value: 'rest', label: 'Rest Day' },
  { value: 'qigong', label: 'Qigong' },
  { value: 'walking', label: 'Walking' },
  { value: 'gmb', label: 'GMB' },
  { value: 'run', label: 'Running' },
  { value: 'row', label: 'Rowing' },
  { value: 'cycle', label: 'Cycling' },
  { value: 'hiit', label: 'HIIT' },
  { value: 'strength', label: 'Strength' },
  { value: 'calisthenics', label: 'Calisthenics' },
  { value: 'mobility', label: 'Mobility' },
  { value: 'mixed', label: 'Mixed' },
];

interface TrainingSelectorProps {
  type: TrainingType;
  duration: number;
  onTypeChange: (type: TrainingType) => void;
  onDurationChange: (duration: number) => void;
  typeError?: string;
  durationError?: string;
}

export function TrainingSelector({
  type,
  duration,
  onTypeChange,
  onDurationChange,
  typeError,
  durationError,
}: TrainingSelectorProps) {
  const showDuration = type !== 'rest';

  return (
    <div className="space-y-4">
      <Select
        label="Training Type"
        value={type}
        onChange={(value) => onTypeChange(value as TrainingType)}
        options={TRAINING_OPTIONS}
        error={typeError}
        required
      />
      {showDuration && (
        <NumberInput
          label="Duration"
          value={duration}
          onChange={onDurationChange}
          min={0}
          max={480}
          step={5}
          unit="min"
          error={durationError}
          required
        />
      )}
    </div>
  );
}
