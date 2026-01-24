/**
 * Date utility functions for consistent date handling across the app.
 */

/**
 * Converts a Date to a YYYY-MM-DD string in local timezone.
 * Used as a key for date-based lookups.
 */
export const toDateKey = (date: Date): string => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

/**
 * Formats a YYYY-MM-DD string as "MMM DD" (e.g., "Jan 23").
 */
export const formatShortDate = (dateString: string): string => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * Checks if two dates represent the same calendar day.
 */
export const isSameDay = (left: Date, right: Date): boolean =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

/**
 * Checks if a date is today.
 */
export const isToday = (date: Date): boolean => isSameDay(date, new Date());

/**
 * Parses a YYYY-MM-DD string into a Date object.
 */
export const parseDateKey = (dateKey: string): Date => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Gets the number of days in a month.
 */
export const getDaysInMonth = (year: number, month: number): number =>
  new Date(year, month + 1, 0).getDate();

/**
 * Formats a date as a long date string (e.g., "Thursday, January 23, 2026").
 */
export const formatLongDate = (date: Date): string =>
  date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
