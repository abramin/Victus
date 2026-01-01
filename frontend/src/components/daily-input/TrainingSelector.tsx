import type { TrainingType } from '../../api/types';
import { Select } from '../common/Select';
import { NumberInput } from '../common/NumberInput';

const TRAINING_OPTIONS = [
  { value: 'rest', label: 'Rest Day - No training, recovery day' },
  { value: 'qigong', label: 'Qigong - Tai chi, breathwork, gentle movement' },
  { value: 'walking', label: 'Walking - Outdoor or treadmill walking' },
  { value: 'gmb', label: 'GMB - Ground-based movement practice' },
  { value: 'run', label: 'Running - Jogging or running outdoors/treadmill' },
  { value: 'row', label: 'Rowing - Ergometer or water rowing' },
  { value: 'cycle', label: 'Cycling - Indoor or outdoor cycling' },
  { value: 'hiit', label: 'HIIT - High-intensity interval training' },
  { value: 'strength', label: 'Strength - Weight training, resistance exercises' },
  { value: 'calisthenics', label: 'Calisthenics - Bodyweight exercises' },
  { value: 'mobility', label: 'Mobility - Stretching, yoga, flexibility work' },
  { value: 'mixed', label: 'Mixed - Combination of different activities' },
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
