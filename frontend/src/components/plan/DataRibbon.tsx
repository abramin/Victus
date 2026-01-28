import { motion } from 'framer-motion';
import { useMemo } from 'react';
import type { CalendarSummaryPoint } from '../../api/types';
import { ribbonPath } from '../../lib/animations';

// SVG viewBox constants
const SVG_ROW_HEIGHT = 100;
const SVG_WIDTH = 100;
const MAX_AMPLITUDE_PERCENT = 0.3; // Max wave height as percentage of row height (30%)
const BASELINE_PERCENT = 0.9; // Baseline at bottom 10% of row

// Stroke width constants (in pixels)
const STROKE_WIDTH_MIN = 1;
const STROKE_WIDTH_RANGE = 5;

interface DataRibbonProps {
  days: CalendarSummaryPoint[];
  /**
   * Number of columns in the calendar grid (typically 7 for a week)
   */
  columns?: number;
  /**
   * Height of each calendar row in pixels
   */
  rowHeight?: number;
}

/**
 * EKG-style biometric sparkline that visualizes training load vs calorie intake.
 *
 * Visual Language:
 * - Height (Amplitude) = Training Load (high peak = intense session, flat = rest)
 * - Thickness (Stroke Width) = Calories (thick = high intake, thin = deficit)
 *
 * Anchored to bottom of calendar rows with discrete peaks centered on days.
 */
export function DataRibbon({ days, columns = 7, rowHeight = 140 }: DataRibbonProps) {
  // Calculate path data and fill area
  const { pathData, areaPath, rows } = useMemo(() => {
    if (days.length === 0) return { pathData: '', areaPath: '', rows: 1 };

    const rows = Math.ceil(days.length / columns);
    const cellWidth = SVG_WIDTH / columns;
    const cellHeight = SVG_ROW_HEIGHT;
    const maxAmplitude = cellHeight * MAX_AMPLITUDE_PERCENT;
    const baseY = cellHeight * BASELINE_PERCENT; // Bottom baseline

    // Build SVG path for the waveform
    let path = '';
    const points: Array<{ x: number; y: number }> = [];

    days.forEach((day, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);

      const x = (col + 0.5) * cellWidth; // Center of cell
      const y = baseY + row * cellHeight - day.loadNormalized * maxAmplitude; // Higher load = lower y

      points.push({ x, y });

      if (index === 0) {
        path += `M ${x} ${y}`;
      } else {
        const prevIndex = index - 1;
        const prevCol = prevIndex % columns;
        const prevRow = Math.floor(prevIndex / columns);
        const prevX = (prevCol + 0.5) * cellWidth;
        const prevY = baseY + prevRow * cellHeight - days[prevIndex].loadNormalized * maxAmplitude;

        // Tighter control points for discrete peaks (reduced from cellWidth/3 to cellWidth/6)
        const controlX1 = prevX + cellWidth / 6;
        const controlY1 = prevY;
        const controlX2 = x - cellWidth / 6;
        const controlY2 = y;

        path += ` C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${x} ${y}`;
      }
    });

    // Create filled area path by closing the path back to baseline
    let area = path;
    if (days.length > 0) {
      const lastCol = (days.length - 1) % columns;
      const lastRow = Math.floor((days.length - 1) / columns);
      const lastX = (lastCol + 0.5) * cellWidth;
      const lastBaseY = baseY + lastRow * cellHeight;

      area += ` L ${lastX} ${lastBaseY}`; // Drop to baseline

      // Return to start baseline
      const firstX = (0 + 0.5) * cellWidth;
      const firstBaseY = baseY + 0 * cellHeight;
      area += ` L ${firstX} ${firstBaseY} Z`;
    }

    return { pathData: path, areaPath: area, rows };
  }, [days, columns]);

  const viewHeight = rows * SVG_ROW_HEIGHT;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox={`0 0 ${SVG_WIDTH} ${viewHeight}`}
      preserveAspectRatio="none"
      style={{ zIndex: 0, filter: 'drop-shadow(0 2px 4px rgba(6, 182, 212, 0.3))' }}
    >
      <defs>
        {/* Vertical gradient for filled area (fade from top to bottom) */}
        <linearGradient id="ribbon-fill-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.05" />
        </linearGradient>
        {/* Horizontal gradient for stroke (color progression across month) */}
        <linearGradient id="ribbon-stroke-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
      </defs>

      {/* Filled area graph */}
      {areaPath && (
        <motion.path
          d={areaPath}
          fill="url(#ribbon-fill-gradient)"
          stroke="none"
          variants={ribbonPath}
          initial="hidden"
          animate="visible"
          opacity={0.6}
        />
      )}

      {/* Stroke segments with variable width based on calories */}
      {days.map((day, index) => {
        if (index === 0) return null;

        const prevDay = days[index - 1];
        const col = index % columns;
        const prevCol = (index - 1) % columns;
        const row = Math.floor(index / columns);
        const prevRow = Math.floor((index - 1) / columns);

        const cellWidth = SVG_WIDTH / columns;
        const cellHeight = SVG_ROW_HEIGHT;
        const maxAmplitude = cellHeight * MAX_AMPLITUDE_PERCENT;
        const baseY = cellHeight * BASELINE_PERCENT;

        const x = (col + 0.5) * cellWidth;
        const prevX = (prevCol + 0.5) * cellWidth;
        const y = baseY + row * cellHeight - day.loadNormalized * maxAmplitude;
        const prevY = baseY + prevRow * cellHeight - prevDay.loadNormalized * maxAmplitude;

        // Variable stroke width: average calories of adjacent days
        const avgCalories = (day.caloriesNormalized + prevDay.caloriesNormalized) / 2;
        const strokeWidth = STROKE_WIDTH_MIN + avgCalories * STROKE_WIDTH_RANGE;

        const controlX1 = prevX + cellWidth / 6;
        const controlX2 = x - cellWidth / 6;
        const segmentPath = `M ${prevX} ${prevY} C ${controlX1} ${prevY}, ${controlX2} ${y}, ${x} ${y}`;

        return (
          <motion.path
            key={`segment-${index}`}
            d={segmentPath}
            fill="none"
            stroke="url(#ribbon-stroke-gradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            variants={ribbonPath}
            initial="hidden"
            animate="visible"
            opacity={0.85}
          />
        );
      })}
    </svg>
  );
}
