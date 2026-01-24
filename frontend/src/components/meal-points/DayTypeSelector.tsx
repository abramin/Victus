import type { DayType } from '../../api/types';
import { DAY_TYPE_OPTIONS } from '../../constants';

const DAY_TYPE_STYLES: Record<DayType, {
  icon: string;
  selected: string;
  unselected: string;
}> = {
  performance: {
    icon: '⚡',
    selected: 'bg-blue-900/60 border-blue-500 ring-1 ring-blue-500/50',
    unselected: 'bg-gray-800/50 border-gray-700 hover:border-blue-500/50',
  },
  fatburner: {
    icon: '🔥',
    selected: 'bg-orange-900/60 border-orange-500 ring-1 ring-orange-500/50',
    unselected: 'bg-gray-800/50 border-gray-700 hover:border-orange-500/50',
  },
  metabolize: {
    icon: '🥗',
    selected: 'bg-emerald-900/60 border-emerald-500 ring-1 ring-emerald-500/50',
    unselected: 'bg-gray-800/50 border-gray-700 hover:border-emerald-500/50',
  },
};

interface DayTypeSelectorProps {
  selectedDayType: DayType;
  onSelect: (dayType: DayType) => void;
}

export function DayTypeSelector({ selectedDayType, onSelect }: DayTypeSelectorProps) {
  return (
    <div className="w-full">
      <span className="text-xs text-gray-500 mb-2 block">Day Type</span>
      <div className="flex flex-col gap-2">
        {DAY_TYPE_OPTIONS.map((dt) => {
          const isSelected = selectedDayType === dt.value;
          const styles = DAY_TYPE_STYLES[dt.value];

          return (
            <label
              key={dt.value}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all border-2 ${
                isSelected ? styles.selected : styles.unselected
              }`}
            >
              <input
                type="radio"
                name="dayType"
                value={dt.value}
                checked={isSelected}
                onChange={() => onSelect(dt.value)}
                className="sr-only"
              />
              <span className="text-xl">{styles.icon}</span>
              <div className="flex-1 min-w-0">
                <div className={`font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                  {dt.label}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {dt.description}
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                isSelected ? 'border-white' : 'border-gray-600'
              }`}>
                {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
