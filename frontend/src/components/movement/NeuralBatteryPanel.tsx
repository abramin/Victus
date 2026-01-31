import { useEffect, useState } from 'react';
import type { NeuralBattery as NeuralBatteryType } from '../../api/types';
import { getNeuralBattery } from '../../api/client';

interface NeuralBatteryPanelProps {
  onCeilingChange?: (ceiling: number) => void;
  onBatteryLoad?: (battery: NeuralBatteryType) => void;
  projectedDrain?: number;
}

export function NeuralBatteryPanel({ onCeilingChange, onBatteryLoad, projectedDrain = 0 }: NeuralBatteryPanelProps) {
  const [battery, setBattery] = useState<NeuralBatteryType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    getNeuralBattery(controller.signal)
      .then((data) => {
        setBattery(data);
        if (data && onCeilingChange) onCeilingChange(data.intensityCeiling);
        if (data && onBatteryLoad) onBatteryLoad(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [onCeilingChange, onBatteryLoad]);

  const segments = 8;
  const pct = battery ? battery.percentage : 0;
  const color = battery?.color ?? '#3f3f46';
  const status = battery?.status?.toUpperCase() ?? '—';

  const filledSegments = Math.round((pct / 100) * segments);
  const drainSegments = Math.round((projectedDrain / 100) * segments);
  const ghostStart = Math.max(0, filledSegments - drainSegments);

  // After-drain percentage
  const remaining = Math.max(0, pct - projectedDrain);

  return (
    <div className="bg-slate-900 border border-slate-700/60 rounded-xl p-4 flex flex-col h-full">
      <h2 className="text-[10px] font-semibold tracking-widest text-slate-500 uppercase mb-4">
        Neural Battery
      </h2>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-20 rounded bg-slate-800 animate-pulse" />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          {/* Large battery */}
          <div className="relative">
            <div className="w-6 h-1.5 mx-auto bg-slate-700 rounded-t-sm" />
            <div className="w-12 border-2 rounded-md p-0.5 flex flex-col-reverse gap-0.5"
              style={{ borderColor: color }}>
              {Array.from({ length: segments }, (_, i) => {
                let bg: string;
                if (i < ghostStart) {
                  // Solid — remaining after drain
                  bg = color;
                } else if (i < filledSegments) {
                  // Ghost — will be drained
                  bg = color;
                } else {
                  bg = '#1e293b';
                }
                const isGhost = i >= ghostStart && i < filledSegments && projectedDrain > 0;
                return (
                  <div
                    key={i}
                    className="w-full h-2 rounded-sm transition-colors"
                    style={{
                      backgroundColor: bg,
                      opacity: isGhost ? 0.3 : 1,
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Percentage with projected */}
          <div className="text-center">
            <span className="text-2xl font-bold font-mono" style={{ color }}>
              {Math.round(pct)}%
            </span>
            {projectedDrain > 0 && (
              <span className="text-sm font-mono text-slate-500 ml-1">
                → {Math.round(remaining)}%
              </span>
            )}
          </div>

          {/* Status label */}
          <span className="text-[10px] font-semibold tracking-widest" style={{ color }}>
            {status}
          </span>
        </div>
      )}
    </div>
  );
}
