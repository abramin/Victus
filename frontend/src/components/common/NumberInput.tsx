import { useState, useEffect, useId, useRef } from 'react';

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
  testId?: string;
}

// Parse a string that may use comma or period as decimal separator
function parseLocaleNumber(str: string): number {
  // Replace comma with period for parsing
  const normalized = str.replace(',', '.');
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed || 0;
}

export function NumberInput({
  label,
  value,
  onChange,
  unit,
  error,
  required = false,
  testId,
}: NumberInputProps) {
  const inputId = useId();
  // Track the display string separately to allow typing with either decimal separator
  const [displayValue, setDisplayValue] = useState(() => (value === 0 ? '' : String(value)));
  // Track previous external value to detect external changes vs user input
  const prevValueRef = useRef(value);

  // Sync display value only when external value changes (e.g., derived calculations)
  useEffect(() => {
    // Only sync if the external value changed from outside (not from our own onChange)
    if (value !== prevValueRef.current) {
      prevValueRef.current = value;
      setDisplayValue(value === 0 ? '' : String(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplayValue(raw);
    const parsed = parseLocaleNumber(raw);
    prevValueRef.current = parsed; // Track that this change came from user input
    onChange(parsed);
  };

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-300">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          data-testid={testId}
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
      {error && <p className="text-sm text-red-400" data-testid={testId ? `${testId}-error` : undefined}>{error}</p>}
    </div>
  );
}
