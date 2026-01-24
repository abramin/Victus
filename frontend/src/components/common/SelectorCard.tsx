import { ReactNode } from 'react';

export interface SelectorOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: ReactNode;
}

interface SelectorCardProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: SelectorOption<T>[];
  columns?: 2 | 3 | 4;
  error?: string;
  testId?: string;
}

export function SelectorCard<T extends string>({
  label,
  value,
  onChange,
  options,
  columns = 3,
  error,
  testId,
}: SelectorCardProps<T>) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300">{label}</label>
      <div className={`grid ${gridCols[columns]} gap-2`} role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(option.value)}
              data-testid={testId ? `${testId}-${option.value}` : undefined}
              className={`
                relative flex flex-col items-center justify-center p-4 rounded-lg
                border-2 transition-all duration-150 cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900
                ${
                  isSelected
                    ? 'bg-slate-800 border-white/40 text-white'
                    : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800/70 hover:border-slate-600'
                }
              `}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white" />
              )}

              {/* Icon */}
              {option.icon && (
                <div className={`text-2xl mb-1 ${isSelected ? 'opacity-100' : 'opacity-60'}`}>
                  {option.icon}
                </div>
              )}

              {/* Label */}
              <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                {option.label}
              </span>

              {/* Description */}
              {option.description && (
                <span className={`text-xs mt-0.5 text-center ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                  {option.description}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="text-sm text-red-400" data-testid={testId ? `${testId}-error` : undefined}>
          {error}
        </p>
      )}
    </div>
  );
}
