import { DAY_TYPE_COLORS, DAY_TYPE_OPTIONS, TRAINING_ICONS, TRAINING_LABELS } from '../../constants';
import type { TrainingType } from '../../api/types';

/**
 * Legend explaining the visual elements in the calendar.
 * Shows day type colors, training icons, and adherence indicators.
 */
export function CalendarLegend() {
  // Show a subset of training types for the legend
  const legendTrainingTypes: TrainingType[] = ['strength', 'hiit', 'run', 'rest'];

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 text-sm">
      <h3 className="text-gray-300 font-medium mb-3">Legend</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Day Types */}
        <div>
          <h4 className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Day Types</h4>
          <div className="space-y-1.5">
            {DAY_TYPE_OPTIONS.map((option) => {
              const colors = DAY_TYPE_COLORS[option.value];
              return (
                <div key={option.value} className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded ${colors.bg}`} />
                  <span className="text-gray-400 text-xs">{option.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Training Types */}
        <div>
          <h4 className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Training</h4>
          <div className="space-y-1.5">
            {legendTrainingTypes.map((type) => (
              <div key={type} className="flex items-center gap-2">
                <span className="text-sm">{TRAINING_ICONS[type]}</span>
                <span className="text-gray-400 text-xs">{TRAINING_LABELS[type]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Adherence */}
        <div>
          <h4 className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">Adherence</h4>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
              <span className="text-gray-400 text-xs">Complete</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </span>
              <span className="text-gray-400 text-xs">Partial</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </span>
              <span className="text-gray-400 text-xs">Missed</span>
            </div>
          </div>
        </div>

        {/* States */}
        <div>
          <h4 className="text-[10px] uppercase tracking-wider text-gray-500 mb-2">States</h4>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded ring-2 ring-blue-500/50 bg-gray-700" />
              <span className="text-gray-400 text-xs">Today</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-gray-900/50" />
              <span className="text-gray-400 text-xs">Past</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-gray-700/50" />
              <span className="text-gray-400 text-xs">Future</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact inline legend for the calendar header.
 */
export function CompactCalendarLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-gray-500">
      {DAY_TYPE_OPTIONS.map((option) => {
        const colors = DAY_TYPE_COLORS[option.value];
        return (
          <div key={option.value} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded ${colors.bg}`} />
            <span>{option.label}</span>
          </div>
        );
      })}
    </div>
  );
}
