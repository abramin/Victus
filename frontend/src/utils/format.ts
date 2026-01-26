/**
 * Global number formatting utilities.
 * Provides consistent decimal precision across the app.
 */

/** Default decimal places for weight values (kg) */
export const WEIGHT_DECIMALS = 2;

/** Default decimal places for percentage values */
export const PERCENT_DECIMALS = 0;

/**
 * Formats a weight value with consistent decimal places.
 * @param value - The weight in kg
 * @param decimals - Number of decimal places (default: 2)
 */
export const formatWeight = (value: number, decimals = WEIGHT_DECIMALS): string =>
  value.toFixed(decimals);

/**
 * Formats a number with the specified decimal places.
 * @param value - The number to format
 * @param decimals - Number of decimal places
 */
export const formatNumber = (value: number, decimals: number): string =>
  value.toFixed(decimals);

/**
 * Formats a percentage value with consistent decimal places.
 * @param value - The percentage value (e.g., 85 for 85%)
 * @param decimals - Number of decimal places (default: 0)
 */
export const formatPercent = (value: number, decimals = PERCENT_DECIMALS): string =>
  value.toFixed(decimals);
