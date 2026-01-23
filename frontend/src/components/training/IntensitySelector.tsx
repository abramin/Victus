interface IntensitySelectorProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  disabled?: boolean;
}

const RPE_LABELS: Record<number, string> = {
  1: 'Very Light',
  2: 'Light',
  3: 'Light+',
  4: 'Moderate',
  5: 'Moderate+',
  6: 'Vigorous',
  7: 'Vigorous+',
  8: 'Hard',
  9: 'Very Hard',
  10: 'Max Effort',
};

export function IntensitySelector({
  value,
  onChange,
  disabled = false,
}: IntensitySelectorProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">Perceived Intensity (RPE)</span>
        {value !== undefined && (
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
      <div className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            disabled={disabled}
            className={`flex-1 h-10 rounded-lg border text-sm font-medium transition-colors ${
              value === level
                ? 'bg-white text-black border-white'
                : 'border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={RPE_LABELS[level]}
          >
            {level}
          </button>
        ))}
      </div>
      {value !== undefined && (
        <p className="text-xs text-gray-500 text-center">{RPE_LABELS[value]}</p>
      )}
    </div>
  );
}
