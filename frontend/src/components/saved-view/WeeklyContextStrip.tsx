import { useState } from 'react';
import { Panel } from '../common/Panel';
import { useWeeklyDayTypes } from '../../hooks/useWeeklyDayTypes';
import { DAY_TYPE_BADGE, DAY_TYPE_OPTIONS } from '../../constants';
import type { DayType } from '../../api/types';

interface WeeklyContextStripProps {
  currentDate: string;
}

interface DayTypeSelectorModalProps {
  date: string;
  currentDayType?: DayType;
  onSelect: (dayType: DayType) => void;
  onClose: () => void;
}

function DayTypeSelectorModal({ date, currentDayType, onSelect, onClose }: DayTypeSelectorModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-gray-900 rounded-xl border border-gray-700 p-4 w-64"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-white font-medium text-sm mb-3">Plan Day Type for {date}</h3>
        <div className="space-y-2">
          {DAY_TYPE_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => onSelect(option.value)}
              className={`w-full px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                currentDayType === option.value
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                option.value === 'performance' ? 'bg-blue-500' :
                option.value === 'fatburner' ? 'bg-orange-500' : 'bg-purple-500'
              }`} />
              {option.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-3 w-full px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function WeeklyContextStrip({ currentDate }: WeeklyContextStripProps) {
  const { days, loading, error, setPlannedDayType } = useWeeklyDayTypes(currentDate);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const handleDayClick = (date: string, isPast: boolean, hasLog: boolean) => {
    // Can only plan future days that don't have logs
    if (!isPast && !hasLog) {
      setSelectedDate(date);
    }
  };

  const handleSelectDayType = async (dayType: DayType) => {
    if (selectedDate) {
      await setPlannedDayType(selectedDate, dayType);
      setSelectedDate(null);
    }
  };

  if (loading) {
    return (
      <Panel title="Weekly Microcycle">
        <div className="flex justify-center py-4">
          <div className="animate-pulse text-gray-500 text-sm">Loading...</div>
        </div>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel title="Weekly Microcycle">
        <div className="text-red-400 text-sm">{error}</div>
      </Panel>
    );
  }

  const selectedDayData = days.find(d => d.date === selectedDate);

  return (
    <Panel title="Weekly Microcycle">
      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const badge = day.dayType ? DAY_TYPE_BADGE[day.dayType] : null;
          const canClick = !day.isPast && !day.hasLog;

          return (
            <button
              key={day.date}
              onClick={() => handleDayClick(day.date, day.isPast, day.hasLog)}
              disabled={!canClick}
              className={`
                flex flex-col items-center py-2 px-1 rounded-lg transition-all
                ${day.isToday ? 'ring-2 ring-white/30 ring-offset-1 ring-offset-gray-900' : ''}
                ${canClick ? 'hover:bg-gray-800 cursor-pointer' : 'cursor-default'}
                ${day.isPast && !day.hasLog ? 'opacity-50' : ''}
              `}
            >
              {/* Day abbreviation */}
              <span className={`text-xs font-medium mb-1 ${
                day.isToday ? 'text-white' : 'text-gray-500'
              }`}>
                {day.dayOfWeek}
              </span>

              {/* Day type badge or empty slot */}
              {badge ? (
                <span className={`
                  px-2 py-0.5 rounded text-[10px] font-medium border
                  ${badge.className}
                  ${day.isPlanned ? 'border-dashed' : ''}
                `}>
                  {badge.label.slice(0, 4)}
                </span>
              ) : (
                <span className={`
                  px-2 py-0.5 rounded text-[10px] text-gray-600
                  ${canClick ? 'border border-dashed border-gray-700' : ''}
                `}>
                  {canClick ? '+' : '—'}
                </span>
              )}

              {/* Today indicator */}
              {day.isToday && (
                <span className="mt-1 text-[9px] text-gray-400 uppercase tracking-wider">
                  Today
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Day type selector modal */}
      {selectedDate && (
        <DayTypeSelectorModal
          date={selectedDate}
          currentDayType={selectedDayData?.dayType}
          onSelect={handleSelectDayType}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </Panel>
  );
}
