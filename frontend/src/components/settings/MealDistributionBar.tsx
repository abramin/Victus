import { useRef, useCallback, useState, useEffect } from 'react';

interface MealDistributionBarProps {
  breakfast: number;
  lunch: number;
  dinner: number;
  onChange: (breakfast: number, lunch: number, dinner: number) => void;
  error?: string;
}

const MIN_PERCENT = 5; // Minimum 5% per meal to prevent zero-width segments

export function MealDistributionBar({
  breakfast,
  lunch,
  dinner,
  onChange,
  error,
}: MealDistributionBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'handle1' | 'handle2' | null>(null);
  
  // Convert ratios (0-1) to percentages (0-100)
  const breakfastPct = breakfast * 100;
  const lunchPct = lunch * 100;
  const dinnerPct = dinner * 100;
  
  // Handle positions: handle1 is after breakfast, handle2 is after lunch
  const handle1Pos = breakfastPct;
  const handle2Pos = breakfastPct + lunchPct;
  
  const total = breakfast + lunch + dinner;
  const isValid = Math.abs(total - 1.0) < 0.01;

  const getPercentFromEvent = useCallback((clientX: number): number => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = (x / rect.width) * 100;
    return Math.max(0, Math.min(100, percent));
  }, []);

  const handlePointerDown = useCallback((handle: 'handle1' | 'handle2') => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(handle);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    
    const percent = getPercentFromEvent(e.clientX);
    
    if (dragging === 'handle1') {
      // Handle1: divides breakfast from lunch
      // Breakfast: 0 to handle1Pos
      // Lunch: handle1Pos to handle2Pos
      // Dinner: handle2Pos to 100
      
      const newBreakfast = Math.max(MIN_PERCENT, Math.min(handle2Pos - MIN_PERCENT, percent));
      const newLunch = handle2Pos - newBreakfast;
      const newDinner = 100 - handle2Pos;
      
      onChange(newBreakfast / 100, newLunch / 100, newDinner / 100);
    } else if (dragging === 'handle2') {
      // Handle2: divides lunch from dinner
      const newHandle2 = Math.max(handle1Pos + MIN_PERCENT, Math.min(100 - MIN_PERCENT, percent));
      const newBreakfast = handle1Pos;
      const newLunch = newHandle2 - handle1Pos;
      const newDinner = 100 - newHandle2;
      
      onChange(newBreakfast / 100, newLunch / 100, newDinner / 100);
    }
  }, [dragging, handle1Pos, handle2Pos, getPercentFromEvent, onChange]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (dragging) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setDragging(null);
    }
  }, [dragging]);

  // Keyboard accessibility for handles
  const handleKeyDown = useCallback((handle: 'handle1' | 'handle2') => (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 5 : 1;
    let newBreakfast = breakfastPct;
    let newLunch = lunchPct;
    let newDinner = dinnerPct;
    
    if (handle === 'handle1') {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        const newPos = Math.max(MIN_PERCENT, handle1Pos - step);
        newBreakfast = newPos;
        newLunch = handle2Pos - newPos;
        e.preventDefault();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        const newPos = Math.min(handle2Pos - MIN_PERCENT, handle1Pos + step);
        newBreakfast = newPos;
        newLunch = handle2Pos - newPos;
        e.preventDefault();
      }
    } else {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        const newPos = Math.max(handle1Pos + MIN_PERCENT, handle2Pos - step);
        newLunch = newPos - handle1Pos;
        newDinner = 100 - newPos;
        e.preventDefault();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        const newPos = Math.min(100 - MIN_PERCENT, handle2Pos + step);
        newLunch = newPos - handle1Pos;
        newDinner = 100 - newPos;
        e.preventDefault();
      }
    }
    
    if (newBreakfast !== breakfastPct || newLunch !== lunchPct || newDinner !== dinnerPct) {
      onChange(newBreakfast / 100, newLunch / 100, newDinner / 100);
    }
  }, [breakfastPct, lunchPct, dinnerPct, handle1Pos, handle2Pos, onChange]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-slate-200">Meal Distribution</h3>
        <span className={`text-sm ${isValid ? 'text-green-400' : 'text-red-400'}`}>
          {isValid ? '✓ 100%' : `${(total * 100).toFixed(0)}%`}
        </span>
      </div>

      {/* Visual hint */}
      <p className="text-xs text-slate-500">
        Drag the handles to adjust how calories are distributed across meals
      </p>

      {/* Stacked Bar */}
      <div 
        ref={containerRef}
        className="relative h-12 rounded-lg overflow-hidden cursor-default select-none touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Breakfast Segment */}
        <div 
          className="absolute top-0 h-full bg-amber-500/80 flex items-center justify-center transition-colors"
          style={{ left: 0, width: `${breakfastPct}%` }}
        >
          <span className="text-xs font-medium text-white drop-shadow-sm px-1 truncate">
            {breakfastPct >= 15 ? `Breakfast ${breakfastPct.toFixed(0)}%` : `${breakfastPct.toFixed(0)}%`}
          </span>
        </div>
        
        {/* Lunch Segment */}
        <div 
          className="absolute top-0 h-full bg-emerald-500/80 flex items-center justify-center transition-colors"
          style={{ left: `${breakfastPct}%`, width: `${lunchPct}%` }}
        >
          <span className="text-xs font-medium text-white drop-shadow-sm px-1 truncate">
            {lunchPct >= 15 ? `Lunch ${lunchPct.toFixed(0)}%` : `${lunchPct.toFixed(0)}%`}
          </span>
        </div>
        
        {/* Dinner Segment */}
        <div 
          className="absolute top-0 h-full bg-indigo-500/80 flex items-center justify-center transition-colors"
          style={{ left: `${handle2Pos}%`, width: `${dinnerPct}%` }}
        >
          <span className="text-xs font-medium text-white drop-shadow-sm px-1 truncate">
            {dinnerPct >= 15 ? `Dinner ${dinnerPct.toFixed(0)}%` : `${dinnerPct.toFixed(0)}%`}
          </span>
        </div>

        {/* Handle 1: Between Breakfast and Lunch */}
        <div
          role="slider"
          tabIndex={0}
          aria-label="Adjust breakfast and lunch split"
          aria-valuenow={Math.round(breakfastPct)}
          aria-valuemin={MIN_PERCENT}
          aria-valuemax={Math.round(handle2Pos - MIN_PERCENT)}
          className={`absolute top-0 h-full w-4 -ml-2 cursor-ew-resize z-10 flex items-center justify-center group
            ${dragging === 'handle1' ? 'scale-110' : ''}`}
          style={{ left: `${handle1Pos}%` }}
          onPointerDown={handlePointerDown('handle1')}
          onKeyDown={handleKeyDown('handle1')}
        >
          <div className={`w-1 h-8 rounded-full bg-white shadow-lg transition-transform
            ${dragging === 'handle1' ? 'bg-blue-300 scale-y-110' : 'group-hover:bg-blue-200 group-focus:bg-blue-200'}`} 
          />
        </div>

        {/* Handle 2: Between Lunch and Dinner */}
        <div
          role="slider"
          tabIndex={0}
          aria-label="Adjust lunch and dinner split"
          aria-valuenow={Math.round(handle2Pos)}
          aria-valuemin={Math.round(handle1Pos + MIN_PERCENT)}
          aria-valuemax={100 - MIN_PERCENT}
          className={`absolute top-0 h-full w-4 -ml-2 cursor-ew-resize z-10 flex items-center justify-center group
            ${dragging === 'handle2' ? 'scale-110' : ''}`}
          style={{ left: `${handle2Pos}%` }}
          onPointerDown={handlePointerDown('handle2')}
          onKeyDown={handleKeyDown('handle2')}
        >
          <div className={`w-1 h-8 rounded-full bg-white shadow-lg transition-transform
            ${dragging === 'handle2' ? 'bg-blue-300 scale-y-110' : 'group-hover:bg-blue-200 group-focus:bg-blue-200'}`} 
          />
        </div>
      </div>

      {/* Legend with values */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="flex items-center justify-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-500/80" />
          <span className="text-sm text-slate-300">Breakfast</span>
          <span className="text-sm font-medium text-slate-200">{breakfastPct.toFixed(0)}%</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-500/80" />
          <span className="text-sm text-slate-300">Lunch</span>
          <span className="text-sm font-medium text-slate-200">{lunchPct.toFixed(0)}%</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <div className="w-3 h-3 rounded bg-indigo-500/80" />
          <span className="text-sm text-slate-300">Dinner</span>
          <span className="text-sm font-medium text-slate-200">{dinnerPct.toFixed(0)}%</span>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
