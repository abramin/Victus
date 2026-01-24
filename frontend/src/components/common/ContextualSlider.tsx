import { useId, useMemo } from 'react';

export interface SliderZone {
  /** End percentage (0-100) for this zone */
  upTo: number;
  /** Label shown when value is in this zone */
  label: string;
  /** Color class for the zone (tailwind text color) */
  color: string;
}

interface ContextualSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  zones: SliderZone[];
  error?: string;
  testId?: string;
}

export function ContextualSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = '',
  zones,
  error,
  testId,
}: ContextualSliderProps) {
  const sliderId = useId();

  // Calculate percentage position
  const percentage = ((value - min) / (max - min)) * 100;

  // Find current zone
  const currentZone = useMemo(() => {
    for (const zone of zones) {
      if (percentage <= zone.upTo) {
        return zone;
      }
    }
    return zones[zones.length - 1];
  }, [percentage, zones]);

  // Build gradient stops from zones
  const gradientStops = useMemo(() => {
    const colorMap: Record<string, string> = {
      'text-blue-400': '#60a5fa',
      'text-green-400': '#4ade80',
      'text-yellow-400': '#facc15',
      'text-orange-400': '#fb923c',
      'text-red-400': '#f87171',
      'text-slate-400': '#94a3b8',
    };

    let prevStop = 0;
    const stops: string[] = [];
    
    for (const zone of zones) {
      const color = colorMap[zone.color] || '#94a3b8';
      stops.push(`${color} ${prevStop}%`);
      stops.push(`${color} ${zone.upTo}%`);
      prevStop = zone.upTo;
    }

    return `linear-gradient(to right, ${stops.join(', ')})`;
  }, [zones]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label htmlFor={sliderId} className="block text-sm font-medium text-slate-300">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${currentZone.color}`}>
            {currentZone.label}
          </span>
          <span className="text-sm font-bold text-white">
            {value}{unit}
          </span>
        </div>
      </div>

      <div className="relative">
        {/* Track with gradient */}
        <div
          className="absolute inset-0 h-2 rounded-full top-1/2 -translate-y-1/2 opacity-30"
          style={{ background: gradientStops }}
        />

        {/* Filled portion */}
        <div
          className="absolute h-2 rounded-full top-1/2 -translate-y-1/2"
          style={{
            width: `${percentage}%`,
            background: gradientStops,
          }}
        />

        {/* Input range */}
        <input
          id={sliderId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          data-testid={testId}
          className="relative w-full h-2 bg-transparent rounded-lg appearance-none cursor-pointer z-10
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:border-slate-900
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:bg-white
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:border-2
            [&::-moz-range-thumb]:border-slate-900
            [&::-moz-range-thumb]:cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900
          "
        />
      </div>

      {/* Zone labels under track */}
      <div className="flex justify-between text-xs text-slate-500">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>

      {error && (
        <p className="text-sm text-red-400" data-testid={testId ? `${testId}-error` : undefined}>
          {error}
        </p>
      )}
    </div>
  );
}

// Pre-configured zones for common use cases
export const BODY_FAT_ZONES: SliderZone[] = [
  { upTo: 15, label: 'Athletic', color: 'text-blue-400' },
  { upTo: 25, label: 'Healthy', color: 'text-green-400' },
  { upTo: 35, label: 'Above Average', color: 'text-yellow-400' },
  { upTo: 100, label: 'High', color: 'text-orange-400' },
];

export const TOLERANCE_ZONES: SliderZone[] = [
  { upTo: 30, label: 'Strict', color: 'text-blue-400' },
  { upTo: 60, label: 'Moderate', color: 'text-yellow-400' },
  { upTo: 100, label: 'Relaxed', color: 'text-orange-400' },
];
