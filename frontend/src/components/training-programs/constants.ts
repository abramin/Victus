import type { ProgramDifficulty, ProgramFocus, EquipmentType } from '../../api/types';

/**
 * Color configuration for program difficulty badges.
 */
export const DIFFICULTY_COLORS: Record<ProgramDifficulty, { bg: string; text: string; label: string }> = {
  beginner: { bg: 'bg-green-900/50', text: 'text-green-400', label: 'Beginner' },
  intermediate: { bg: 'bg-yellow-900/50', text: 'text-yellow-400', label: 'Intermediate' },
  advanced: { bg: 'bg-red-900/50', text: 'text-red-400', label: 'Advanced' },
};

/**
 * Color configuration for program focus badges.
 */
export const FOCUS_COLORS: Record<ProgramFocus, { bg: string; text: string; label: string; icon: string }> = {
  hypertrophy: { bg: 'bg-purple-900/50', text: 'text-purple-400', label: 'Hypertrophy', icon: '💪' },
  strength: { bg: 'bg-red-900/50', text: 'text-red-400', label: 'Strength', icon: '🏋️' },
  conditioning: { bg: 'bg-cyan-900/50', text: 'text-cyan-400', label: 'Conditioning', icon: '🏃' },
  general: { bg: 'bg-slate-700/50', text: 'text-slate-400', label: 'General', icon: '⚡' },
};

/**
 * Equipment type icons and labels.
 */
export const EQUIPMENT_CONFIG: Record<EquipmentType, { icon: string; label: string }> = {
  barbell: { icon: '🏋️', label: 'Barbell' },
  dumbbell: { icon: '💪', label: 'Dumbbell' },
  bodyweight: { icon: '🤸', label: 'Bodyweight' },
  machine: { icon: '🏢', label: 'Machine' },
  kettlebell: { icon: '🔔', label: 'Kettlebell' },
  bands: { icon: '🎗️', label: 'Bands' },
};

/**
 * Weekday labels for the installer.
 */
export const WEEKDAYS = [
  { num: 1, short: 'Mon', full: 'Monday' },
  { num: 2, short: 'Tue', full: 'Tuesday' },
  { num: 3, short: 'Wed', full: 'Wednesday' },
  { num: 4, short: 'Thu', full: 'Thursday' },
  { num: 5, short: 'Fri', full: 'Friday' },
  { num: 6, short: 'Sat', full: 'Saturday' },
  { num: 7, short: 'Sun', full: 'Sunday' },
];
