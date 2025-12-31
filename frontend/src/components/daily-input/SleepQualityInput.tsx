import type { SleepQuality } from '../../api/types';
import { NumberInput } from '../common/NumberInput';

interface SleepQualityInputProps {
  value: SleepQuality;
  onChange: (value: SleepQuality) => void;
  error?: string;
}

export function SleepQualityInput({ value, onChange, error }: SleepQualityInputProps) {
  return (
    <div className="space-y-1">
      <NumberInput
        label="Sleep Quality"
        value={value}
        onChange={(v) => onChange(Math.round(v))}
        min={1}
        max={100}
        step={1}
        unit="%"
        error={error}
        required
      />
      <p className="text-xs text-slate-500">Garmin sleep score (1-100).</p>
    </div>
  );
}
