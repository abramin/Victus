interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  error?: string;
  required?: boolean;
}

export function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  error,
  required = false,
}: NumberInputProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-slate-300">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          step={step}
          className={`
            w-full px-3 py-2 bg-slate-900/50 border rounded-md
            text-slate-100 placeholder-slate-500
            focus:outline-none focus:ring-2 focus:ring-blue-500
            ${error ? 'border-red-500' : 'border-slate-700'}
            ${unit ? 'pr-12' : ''}
          `}
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
            {unit}
          </span>
        )}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
