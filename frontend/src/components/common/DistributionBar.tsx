import { useRef, useCallback, useState } from 'react';

export interface DistributionSegment {
  label: string;
  value: number; // ratio 0-1
  color: string; // Tailwind bg class e.g. 'bg-amber-500/80'
}

interface DistributionBarProps {
  segments: [DistributionSegment, DistributionSegment, DistributionSegment];
  onChange: (values: [number, number, number]) => void;
  title?: string;
  hint?: string;
  error?: string;
  minPercent?: number;
}

export function DistributionBar({
  segments,
  onChange,
  title,
  hint,
  error,
  minPercent = 5,
}: DistributionBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'handle1' | 'handle2' | null>(null);

  // Convert ratios (0-1) to percentages (0-100)
  const pct1 = segments[0].value * 100;
  const pct2 = segments[1].value * 100;
  const pct3 = segments[2].value * 100;

  // Handle positions
  const handle1Pos = pct1;
  const handle2Pos = pct1 + pct2;

  const total = segments[0].value + segments[1].value + segments[2].value;
  const isValid = Math.abs(total - 1.0) < 0.01;

  const getPercentFromEvent = useCallback((clientX: number): number => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = (x / rect.width) * 100;
    return Math.max(0, Math.min(100, percent));
  }, []);

  const handlePointerDown = useCallback(
    (handle: 'handle1' | 'handle2') => (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(handle);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;

      const percent = getPercentFromEvent(e.clientX);

      if (dragging === 'handle1') {
        const newFirst = Math.max(minPercent, Math.min(handle2Pos - minPercent, percent));
        const newSecond = handle2Pos - newFirst;
        const newThird = 100 - handle2Pos;

        onChange([newFirst / 100, newSecond / 100, newThird / 100]);
      } else if (dragging === 'handle2') {
        const newHandle2 = Math.max(handle1Pos + minPercent, Math.min(100 - minPercent, percent));
        const newFirst = handle1Pos;
        const newSecond = newHandle2 - handle1Pos;
        const newThird = 100 - newHandle2;

        onChange([newFirst / 100, newSecond / 100, newThird / 100]);
      }
    },
    [dragging, handle1Pos, handle2Pos, getPercentFromEvent, onChange, minPercent]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (dragging) {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        setDragging(null);
      }
    },
    [dragging]
  );

  const handleKeyDown = useCallback(
    (handle: 'handle1' | 'handle2') => (e: React.KeyboardEvent) => {
      const step = e.shiftKey ? 5 : 1;
      let newFirst = pct1;
      let newSecond = pct2;
      let newThird = pct3;

      if (handle === 'handle1') {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          const newPos = Math.max(minPercent, handle1Pos - step);
          newFirst = newPos;
          newSecond = handle2Pos - newPos;
          e.preventDefault();
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          const newPos = Math.min(handle2Pos - minPercent, handle1Pos + step);
          newFirst = newPos;
          newSecond = handle2Pos - newPos;
          e.preventDefault();
        }
      } else {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          const newPos = Math.max(handle1Pos + minPercent, handle2Pos - step);
          newSecond = newPos - handle1Pos;
          newThird = 100 - newPos;
          e.preventDefault();
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          const newPos = Math.min(100 - minPercent, handle2Pos + step);
          newSecond = newPos - handle1Pos;
          newThird = 100 - newPos;
          e.preventDefault();
        }
      }

      if (newFirst !== pct1 || newSecond !== pct2 || newThird !== pct3) {
        onChange([newFirst / 100, newSecond / 100, newThird / 100]);
      }
    },
    [pct1, pct2, pct3, handle1Pos, handle2Pos, onChange, minPercent]
  );

  return (
    <div className="space-y-4">
      {(title || isValid !== undefined) && (
        <div className="flex justify-between items-center">
          {title && <h3 className="text-lg font-medium text-slate-200">{title}</h3>}
          <span className={`text-sm ${isValid ? 'text-green-400' : 'text-red-400'}`}>
            {isValid ? '✓ 100%' : `${(total * 100).toFixed(0)}%`}
          </span>
        </div>
      )}

      {hint && <p className="text-xs text-slate-500">{hint}</p>}

      {/* Stacked Bar */}
      <div
        ref={containerRef}
        className="relative h-12 rounded-lg overflow-hidden cursor-default select-none touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* First Segment */}
        <div
          className={`absolute top-0 h-full ${segments[0].color} flex items-center justify-center transition-colors`}
          style={{ left: 0, width: `${pct1}%` }}
        >
          <span className="text-xs font-medium text-white drop-shadow-sm px-1 truncate">
            {pct1 >= 15 ? `${segments[0].label} ${pct1.toFixed(0)}%` : `${pct1.toFixed(0)}%`}
          </span>
        </div>

        {/* Second Segment */}
        <div
          className={`absolute top-0 h-full ${segments[1].color} flex items-center justify-center transition-colors`}
          style={{ left: `${pct1}%`, width: `${pct2}%` }}
        >
          <span className="text-xs font-medium text-white drop-shadow-sm px-1 truncate">
            {pct2 >= 15 ? `${segments[1].label} ${pct2.toFixed(0)}%` : `${pct2.toFixed(0)}%`}
          </span>
        </div>

        {/* Third Segment */}
        <div
          className={`absolute top-0 h-full ${segments[2].color} flex items-center justify-center transition-colors`}
          style={{ left: `${handle2Pos}%`, width: `${pct3}%` }}
        >
          <span className="text-xs font-medium text-white drop-shadow-sm px-1 truncate">
            {pct3 >= 15 ? `${segments[2].label} ${pct3.toFixed(0)}%` : `${pct3.toFixed(0)}%`}
          </span>
        </div>

        {/* Handle 1 */}
        <div
          role="slider"
          tabIndex={0}
          aria-label={`Adjust ${segments[0].label} and ${segments[1].label} split`}
          aria-valuenow={Math.round(pct1)}
          aria-valuemin={minPercent}
          aria-valuemax={Math.round(handle2Pos - minPercent)}
          className={`absolute top-0 h-full w-4 -ml-2 cursor-ew-resize z-10 flex items-center justify-center group
            ${dragging === 'handle1' ? 'scale-110' : ''}`}
          style={{ left: `${handle1Pos}%` }}
          onPointerDown={handlePointerDown('handle1')}
          onKeyDown={handleKeyDown('handle1')}
        >
          <div
            className={`w-1 h-8 rounded-full bg-white shadow-lg transition-transform
            ${dragging === 'handle1' ? 'bg-blue-300 scale-y-110' : 'group-hover:bg-blue-200 group-focus:bg-blue-200'}`}
          />
        </div>

        {/* Handle 2 */}
        <div
          role="slider"
          tabIndex={0}
          aria-label={`Adjust ${segments[1].label} and ${segments[2].label} split`}
          aria-valuenow={Math.round(handle2Pos)}
          aria-valuemin={Math.round(handle1Pos + minPercent)}
          aria-valuemax={100 - minPercent}
          className={`absolute top-0 h-full w-4 -ml-2 cursor-ew-resize z-10 flex items-center justify-center group
            ${dragging === 'handle2' ? 'scale-110' : ''}`}
          style={{ left: `${handle2Pos}%` }}
          onPointerDown={handlePointerDown('handle2')}
          onKeyDown={handleKeyDown('handle2')}
        >
          <div
            className={`w-1 h-8 rounded-full bg-white shadow-lg transition-transform
            ${dragging === 'handle2' ? 'bg-blue-300 scale-y-110' : 'group-hover:bg-blue-200 group-focus:bg-blue-200'}`}
          />
        </div>
      </div>

      {/* Legend with values */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {segments.map((segment, i) => {
          const pct = i === 0 ? pct1 : i === 1 ? pct2 : pct3;
          return (
            <div key={segment.label} className="flex items-center justify-center gap-2">
              <div className={`w-3 h-3 rounded ${segment.color}`} />
              <span className="text-sm text-slate-300">{segment.label}</span>
              <span className="text-sm font-medium text-slate-200">{pct.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
