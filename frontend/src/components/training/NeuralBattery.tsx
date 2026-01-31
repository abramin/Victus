import { useEffect, useState } from 'react';
import type { NeuralBattery as NeuralBatteryType } from '../../api/types';
import { getNeuralBattery } from '../../api/client';

interface NeuralBatteryProps {
  onCeilingChange?: (ceiling: number) => void;
}

export function NeuralBattery({ onCeilingChange }: NeuralBatteryProps) {
  const [battery, setBattery] = useState<NeuralBatteryType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    getNeuralBattery(controller.signal)
      .then((data) => {
        setBattery(data);
        if (data && onCeilingChange) {
          onCeilingChange(data.intensityCeiling);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [onCeilingChange]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-zinc-500 text-sm">
        <div className="w-3 h-8 rounded bg-zinc-800 animate-pulse" />
        Reading CNS...
      </div>
    );
  }

  if (!battery) {
    return (
      <div className="flex items-center gap-2 text-zinc-600 text-xs">
        <div className="w-3 h-8 rounded bg-zinc-800" />
        No HRV data
      </div>
    );
  }

  const segments = 5;
  const filledSegments = Math.round((battery.percentage / 100) * segments);

  return (
    <div className="flex items-center gap-3">
      {/* Battery icon */}
      <div className="flex flex-col-reverse gap-0.5">
        {Array.from({ length: segments }, (_, i) => (
          <div
            key={i}
            className="w-3 h-1.5 rounded-sm transition-colors"
            style={{
              backgroundColor: i < filledSegments ? battery.color : '#27272a',
            }}
          />
        ))}
      </div>

      {/* Info */}
      <div className="flex flex-col">
        <span className="text-xs font-mono" style={{ color: battery.color }}>
          {Math.round(battery.percentage)}%
        </span>
        <span className="text-[10px] text-zinc-500 max-w-[200px]">
          {battery.recommendation}
        </span>
      </div>
    </div>
  );
}
