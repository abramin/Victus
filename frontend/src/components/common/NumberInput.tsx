import { useState, useEffect } from 'react';

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

// Parse a string that may use comma or period as decimal separator
function parseLocaleNumber(str: string): number {
  // Replace comma with period for parsing
  const normalized = str.replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

export function NumberInput({
  label,
  value,
  onChange,
  unit,
  error,
  required = false,
}: NumberInputProps) {
  // Track the display string separately to allow typing with either decimal separator
  const [displayValue, setDisplayValue] = useState(() => (value === 0 ? '' : String(value)));

  // Sync display value when external value changes (e.g., derived calculations)
  useEffect(() => {
    const currentParsed = parseLocaleNumber(displayValue);
    // Only update if the numeric value actually changed (avoid cursor jumps while typing)
    if (value !== currentParsed) {
      setDisplayValue(value === 0 ? '' : String(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplayValue(raw);
    onChange(parseLocaleNumber(raw));
  };

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-slate-300">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
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
