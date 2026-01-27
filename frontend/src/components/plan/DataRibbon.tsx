import { motion } from 'framer-motion';
import { useMemo } from 'react';
import type { CalendarSummaryPoint } from '../../api/types';
import { ribbonPath } from '../../lib/animations';
import { getHeatmapColor } from '../../utils';

// SVG viewBox constants
const SVG_ROW_HEIGHT = 100;
const SVG_WIDTH = 100;
const MAX_AMPLITUDE_PERCENT = 0.25; // Max wave height as percentage of row height

// Stroke width constants (in pixels)
const STROKE_WIDTH_MIN = 2;
const STROKE_WIDTH_RANGE = 6;
const STROKE_WIDTH_DEFAULT = 4;

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
 * Continuous "Stress Ribbon" that flows across calendar rows.
 * Visualizes the correlation between training load and calorie intake:
 * - Vertical amplitude = Training load (loadNormalized)
 * - Stroke thickness = Calorie intake (caloriesNormalized)
 * - Color gradient = Load intensity (blue → red)
 */
export function DataRibbon({ days, columns = 7, rowHeight = 140 }: DataRibbonProps) {
  const pathData = useMemo(() => {
    if (days.length === 0) return { path: '', viewHeight: SVG_ROW_HEIGHT };

    // Calculate number of rows
    const rows = Math.ceil(days.length / columns);
    const viewHeight = rows * SVG_ROW_HEIGHT;

    // Calculate cell dimensions in viewBox units
    const cellWidth = SVG_WIDTH / columns;
    const cellHeight = SVG_ROW_HEIGHT;
    const maxAmplitude = cellHeight * MAX_AMPLITUDE_PERCENT;
    const baseY = cellHeight / 2; // Center line for each row

    // Build SVG path using cubic bezier curves for smooth flow
    let path = '';
    days.forEach((day, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);

      const x = (col + 0.5) * cellWidth; // Center of cell
      const y = baseY + row * cellHeight - day.loadNormalized * maxAmplitude; // Higher load = lower y (wave goes up)

      if (index === 0) {
        path += `M ${x} ${y}`;
      } else {
        // Cubic bezier curve to previous point
        // Note: prevIndex is always >= 0 here because index > 0 in this branch
        const prevIndex = index - 1;
        const prevCol = prevIndex % columns;
        const prevRow = Math.floor(prevIndex / columns);
        const prevX = (prevCol + 0.5) * cellWidth;
        const prevY = baseY + prevRow * cellHeight - days[prevIndex].loadNormalized * maxAmplitude;

        // Control points for smooth curve
        const controlX1 = prevX + cellWidth / 3;
        const controlY1 = prevY;
        const controlX2 = x - cellWidth / 3;
        const controlY2 = y;

        path += ` C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${x} ${y}`;
      }
    });

    return { path, viewHeight };
  }, [days, columns]);

  // Calculate stroke width range based on max calorie normalization
  const strokeWidthData = useMemo(() => {
    return days.map((day) => ({
      x: day.date,
      width: STROKE_WIDTH_MIN + day.caloriesNormalized * STROKE_WIDTH_RANGE,
    }));
  }, [days]);

  // Use average stroke width for simplicity (could be enhanced with gradient stroke-width)
  const avgStrokeWidth = strokeWidthData.length > 0
    ? strokeWidthData.reduce((sum, d) => sum + d.width, 0) / strokeWidthData.length
    : STROKE_WIDTH_DEFAULT;

  // Calculate gradient color based on average load
  const avgLoad = days.length > 0
    ? days.reduce((sum, d) => sum + d.loadNormalized, 0) / days.length
    : 0;
  const ribbonColor = getHeatmapColor(avgLoad);

  const rows = Math.ceil(days.length / columns);
  const viewHeight = rows * SVG_ROW_HEIGHT;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox={`0 0 ${SVG_WIDTH} ${viewHeight}`}
      preserveAspectRatio="none"
      style={{ zIndex: 0 }}
    >
      <defs>
        <filter id="ribbon-glow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
          <feComposite in2="SourceGraphic" operator="over" />
        </filter>
        <linearGradient id="ribbon-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.6" />
          <stop offset="50%" stopColor={ribbonColor} stopOpacity="0.6" />
          <stop offset="100%" stopColor="#DC2626" stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {pathData.path && (
        <motion.path
          d={pathData.path}
          fill="none"
          stroke="url(#ribbon-gradient)"
          strokeWidth={avgStrokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={ribbonPath}
          initial="hidden"
          animate="visible"
          filter="url(#ribbon-glow)"
          opacity={0.6}
        />
      )}
    </svg>
  );
}
