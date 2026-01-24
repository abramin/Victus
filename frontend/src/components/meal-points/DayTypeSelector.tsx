import type { DayType } from '../../api/types';
import { DAY_TYPE_OPTIONS } from '../../constants';

interface DayTypeSelectorProps {
  selectedDayType: DayType;
  onSelect: (dayType: DayType) => void;
}

export function DayTypeSelector({ selectedDayType, onSelect }: DayTypeSelectorProps) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-xs text-gray-500 mb-1">Day Strategy</span>
      <div className="flex items-center gap-1 bg-gray-900 rounded-lg p-1">
        {DAY_TYPE_OPTIONS.map((dt) => (
          <button
            key={dt.value}
            onClick={() => onSelect(dt.value)}
            title={dt.description}
            className={`px-4 py-2 rounded-md text-sm transition-colors ${
              selectedDayType === dt.value
                ? 'bg-blue-600 text-white font-semibold border-2 border-blue-500'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {dt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
