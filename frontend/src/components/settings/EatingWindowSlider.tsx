import { useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';

// Time conversion utilities
function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function snapToStep(minutes: number, step: number): number {
  return Math.round(minutes / step) * step;
}

interface EatingWindowSliderProps {
  windowDurationMinutes: number;  // 480 for 8h, 240 for 4h
  startTime: string;              // "HH:MM" format
  onStartTimeChange: (start: string, end: string) => void;
  stepMinutes?: number;           // default 30
}

const MINUTES_IN_DAY = 24 * 60; // 1440
const HOUR_MARKERS = [0, 6, 12, 18, 24];

export function EatingWindowSlider({
  windowDurationMinutes,
  startTime,
  onStartTimeChange,
  stepMinutes = 30,
}: EatingWindowSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  // Convert start time to minutes and calculate position
  const startMinutes = parseTimeToMinutes(startTime);
  const maxStartMinutes = MINUTES_IN_DAY - windowDurationMinutes;

  // Calculate percentages for positioning
  const windowWidthPercent = (windowDurationMinutes / MINUTES_IN_DAY) * 100;
  const windowLeftPercent = (startMinutes / MINUTES_IN_DAY) * 100;

  const getMinutesFromEvent = useCallback((clientX: number): number => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = x / rect.width;
    const minutes = percent * MINUTES_IN_DAY;
    return Math.max(0, Math.min(maxStartMinutes, minutes));
  }, [maxStartMinutes]);

  const updatePosition = useCallback((newStartMinutes: number) => {
    const snapped = snapToStep(newStartMinutes, stepMinutes);
    const clamped = Math.max(0, Math.min(maxStartMinutes, snapped));
    const newEndMinutes = clamped + windowDurationMinutes;
    onStartTimeChange(
      minutesToTimeString(clamped),
      minutesToTimeString(newEndMinutes)
    );
  }, [stepMinutes, maxStartMinutes, windowDurationMinutes, onStartTimeChange]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    // Calculate position relative to where the user clicked on the window
    // We want the window center to follow the cursor
    const minutes = getMinutesFromEvent(e.clientX);
    const centeredStart = minutes - windowDurationMinutes / 2;
    updatePosition(centeredStart);
  }, [dragging, getMinutesFromEvent, windowDurationMinutes, updatePosition]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (dragging) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setDragging(false);
    }
  }, [dragging]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 60 : stepMinutes; // Shift = 1 hour, otherwise step
    let newStart = startMinutes;

    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      newStart = Math.max(0, startMinutes - step);
      e.preventDefault();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      newStart = Math.min(maxStartMinutes, startMinutes + step);
      e.preventDefault();
    }

    if (newStart !== startMinutes) {
      updatePosition(newStart);
    }
  }, [startMinutes, maxStartMinutes, stepMinutes, updatePosition]);

  const endMinutes = startMinutes + windowDurationMinutes;
  const endTime = minutesToTimeString(endMinutes);

  return (
    <div className="space-y-3 pt-2">
      <label className="text-sm font-medium text-slate-400">Eating Window</label>

      {/* Track Container */}
      <div
        ref={containerRef}
        className="relative h-10 bg-slate-800 rounded-lg select-none touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Eating Window Block */}
        <motion.div
          role="slider"
          tabIndex={0}
          aria-label="Eating window position"
          aria-valuenow={startMinutes}
          aria-valuemin={0}
          aria-valuemax={maxStartMinutes}
          aria-valuetext={`${startTime} to ${endTime}`}
          className={`absolute top-0 h-full rounded-lg flex items-center justify-center
            ${dragging ? 'cursor-grabbing scale-y-[1.05]' : 'cursor-grab hover:brightness-110'}
            bg-emerald-500/80 transition-transform`}
          style={{
            left: `${windowLeftPercent}%`,
            width: `${windowWidthPercent}%`,
          }}
          onPointerDown={handlePointerDown}
          onKeyDown={handleKeyDown}
          animate={{ scale: dragging ? 1.02 : 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        >
          <span className="text-sm font-medium text-white drop-shadow-sm select-none">
            {startTime} - {endTime}
          </span>
        </motion.div>

        {/* Hour Markers */}
        {HOUR_MARKERS.map((hour) => {
          const percent = (hour / 24) * 100;
          return (
            <div
              key={hour}
              className="absolute top-full pt-1 -translate-x-1/2 pointer-events-none"
              style={{ left: `${percent}%` }}
            >
              <div className="w-px h-1.5 bg-slate-600 mx-auto" />
              <span className="text-[10px] text-slate-500">
                {hour.toString().padStart(2, '0')}:00
              </span>
            </div>
          );
        })}
      </div>

      {/* Spacer for hour markers */}
      <div className="h-4" />

      {/* Duration hint */}
      <div className="text-xs text-slate-500 text-center">
        {windowDurationMinutes / 60} hour eating window • Drag to adjust
      </div>
    </div>
  );
}
