import { useState, useMemo } from 'react';
import type { TrainingProgram, ProgramDay } from '../../api/types';
import { installProgram } from '../../api/client';
import { DayChip } from './DayChip';
import { WeekdaySlot } from './WeekdaySlot';

interface ProgramInstallerProps {
  program: TrainingProgram;
  onClose: () => void;
  onInstalled: () => void;
}

/**
 * Modal for installing a training program by mapping program days to weekdays.
 * Uses drag-and-drop for intuitive day assignment.
 */
export function ProgramInstaller({ program, onClose, onInstalled }: ProgramInstallerProps) {
  // Get unique program days from the first week as template
  const templateDays = useMemo(() => {
    if (!program.weeks || program.weeks.length === 0) return [];
    return program.weeks[0].days;
  }, [program.weeks]);

  // weekDayMapping: index is weekday (0=Mon), value is program day number (0 = rest)
  const [weekDayMapping, setWeekDayMapping] = useState<number[]>(() => {
    // Initialize with empty mapping
    return [0, 0, 0, 0, 0, 0, 0];
  });

  // Start date defaults to next Monday
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    return nextMonday.toISOString().split('T')[0];
  });

  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get program day by day number
  const getDayByNumber = (dayNumber: number): ProgramDay | null => {
    return templateDays.find((d) => d.dayNumber === dayNumber) || null;
  };

  // Get assigned days mapping (weekday index -> ProgramDay or null)
  const assignedDays = useMemo(() => {
    return weekDayMapping.map((dayNumber) => getDayByNumber(dayNumber));
  }, [weekDayMapping, templateDays]);

  // Get unassigned program days
  const unassignedDays = useMemo(() => {
    const assignedDayNumbers = new Set(weekDayMapping.filter((n) => n > 0));
    return templateDays.filter((d) => !assignedDayNumbers.has(d.dayNumber));
  }, [weekDayMapping, templateDays]);

  // Handle drop on a weekday slot
  const handleDrop = (weekday: number, day: ProgramDay) => {
    setWeekDayMapping((prev) => {
      const next = [...prev];
      // Remove from previous slot if already assigned
      const prevSlot = prev.findIndex((n) => n === day.dayNumber);
      if (prevSlot !== -1) {
        next[prevSlot] = 0;
      }
      // Assign to new slot
      next[weekday] = day.dayNumber;
      return next;
    });
  };

  // Handle remove from a weekday slot
  const handleRemove = (weekday: number) => {
    setWeekDayMapping((prev) => {
      const next = [...prev];
      next[weekday] = 0;
      return next;
    });
  };

  // Count assigned days
  const assignedCount = weekDayMapping.filter((n) => n > 0).length;
  const requiredDays = program.trainingDaysPerWeek;
  const isReady = assignedCount >= requiredDays;

  // Handle install
  const handleInstall = async () => {
    if (!isReady) return;

    setInstalling(true);
    setError(null);

    try {
      await installProgram(program.id, { startDate, weekDayMapping });
      onInstalled();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install program');
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="installer-title"
        className="relative bg-slate-900 rounded-xl border border-slate-800 shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h2 id="installer-title" className="text-lg font-semibold text-white">
              Install Program
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">{program.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white transition-colors rounded"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <p className="text-slate-400 text-sm mb-6">
            Drag training days to your preferred weekdays. You need to assign at least{' '}
            <span className="text-white font-medium">{requiredDays} days</span> per week.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Available program days */}
            <div>
              <h3 className="text-sm font-medium text-white mb-3">
                Training Days
                {unassignedDays.length > 0 && (
                  <span className="ml-2 text-slate-400 font-normal">
                    ({unassignedDays.length} remaining)
                  </span>
                )}
              </h3>
              <div className="space-y-2">
                {unassignedDays.length > 0 ? (
                  unassignedDays.map((day) => (
                    <DayChip key={day.dayNumber} day={day} />
                  ))
                ) : (
                  <div className="text-sm text-slate-500 text-center py-4 bg-slate-800/30 rounded-lg">
                    All days assigned
                  </div>
                )}
              </div>
            </div>

            {/* Right: Weekday slots */}
            <div>
              <h3 className="text-sm font-medium text-white mb-3">
                Your Week
                <span className="ml-2 text-slate-400 font-normal">
                  ({assignedCount}/{requiredDays} assigned)
                </span>
              </h3>
              <div className="space-y-2">
                {[0, 1, 2, 3, 4, 5, 6].map((weekday) => (
                  <WeekdaySlot
                    key={weekday}
                    weekday={weekday}
                    assignedDay={assignedDays[weekday]}
                    onDrop={handleDrop}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Start date */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <label className="block text-sm font-medium text-white mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full max-w-xs px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg
                         text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                         [color-scheme:dark]"
            />
            <p className="text-xs text-slate-500 mt-1">
              Week 1 will begin on this date
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-800/30 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-slate-800 bg-slate-800/30">
          <div className="text-sm text-slate-400">
            {program.durationWeeks} weeks • {program.trainingDaysPerWeek} days/week
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleInstall}
              disabled={!isReady || installing}
              className={`
                px-6 py-2 rounded-lg font-medium transition-all
                ${isReady
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }
                ${installing ? 'opacity-50 cursor-wait' : ''}
                focus:outline-none focus:ring-2 focus:ring-blue-500
              `}
            >
              {installing ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Installing...
                </span>
              ) : (
                'Install Program'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
