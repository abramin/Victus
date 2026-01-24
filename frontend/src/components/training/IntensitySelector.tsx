interface IntensitySelectorProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  disabled?: boolean;
  allowClear?: boolean;
}

const DEFAULT_RPE = 5;

const RPE_LABELS: Record<number, string> = {
  1: 'Rest',
  2: 'Easy',
  3: 'Easy',
  4: 'Mod',
  5: 'Mod',
  6: 'Mod',
  7: 'Hard',
  8: 'Hard',
  9: 'Max',
  10: 'Max',
};

const RPE_TICKS = [
  { value: 1, label: 'Rest' },
  { value: 3, label: 'Easy' },
  { value: 5, label: 'Mod' },
  { value: 7, label: 'Hard' },
  { value: 10, label: 'Max' },
];

export function IntensitySelector({
  value,
  onChange,
  disabled = false,
  allowClear = true,
}: IntensitySelectorProps) {
  const displayValue = value ?? DEFAULT_RPE;
  const displayLabel = RPE_LABELS[displayValue];
  const trackColor =
    displayValue >= 9 ? '#ef4444' : displayValue >= 7 ? '#f97316' : '#60a5fa';
  const accentColor = disabled ? '#6b7280' : trackColor;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">Intensity (RPE)</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-200">
            {displayValue} - {displayLabel}
          </span>
          {allowClear && value !== undefined && (
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="text-xs text-gray-500 hover:text-gray-300"
              disabled={disabled}
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={displayValue}
        onChange={(e) => onChange(parseInt(e.target.value))}
        disabled={disabled}
        className="w-full disabled:opacity-50"
        style={{ accentColor }}
      />
      <div className="flex justify-between text-[11px] text-gray-500">
        {RPE_TICKS.map((tick) => (
          <span key={tick.value}>{tick.label}</span>
        ))}
      </div>
      {value === undefined && (
        <p className="text-xs text-gray-500">Defaulting to {DEFAULT_RPE} (Mod).</p>
      )}
    </div>
  );
}
