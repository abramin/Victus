/**
 * Math utility functions for calculations across the app.
 */

/**
 * Rounds a number to the nearest multiple of 5.
 * Used for meal point calculations.
 */
export const roundToNearest5 = (value: number): number =>
  Math.round(value / 5) * 5;

/**
 * Builds an SVG path string from a series of points.
 * Used for trend charts and graphs.
 * 
 * @param points - Array of data points
 * @param toX - Function to convert index to X coordinate
 * @param toY - Function to convert value to Y coordinate
 * @param getValue - Function to extract the numeric value from a point
 */
export const buildSvgPath = <T>(
  points: T[],
  toX: (index: number) => number,
  toY: (value: number) => number,
  getValue: (point: T) => number
): string =>
  points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${toX(index)} ${toY(getValue(point))}`)
    .join(' ');

/**
 * Clamps a value between a minimum and maximum.
 */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * Calculates a percentage, handling division by zero.
 */
export const safePercent = (value: number, total: number): number =>
  total === 0 ? 0 : (value / total) * 100;
