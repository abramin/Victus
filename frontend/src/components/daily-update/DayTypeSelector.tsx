import type { DayType, CreateDailyLogRequest } from '../../api/types';
import { DAY_TYPE_OPTIONS } from '../../constants';

interface DayTypeSelectorProps {
  selectedDayType: DayType;
  onDayTypeChange: (dayType: DayType) => void;
}

export function DayTypeSelector({ selectedDayType, onDayTypeChange }: DayTypeSelectorProps) {
  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      <h3 className="text-white font-medium mb-4">Day Type</h3>
      <div className="space-y-3">
        {DAY_TYPE_OPTIONS.map((dt) => (
          <label
            key={dt.value}
            className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-colors ${
              selectedDayType === dt.value
                ? 'bg-gray-800 border-2 border-white/30'
                : 'bg-gray-800/50 border-2 border-transparent hover:bg-gray-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedDayType === dt.value ? 'border-white bg-white' : 'border-gray-600'
              }`}
            >
              {selectedDayType === dt.value && (
                <div className="w-2 h-2 rounded-full bg-black" />
              )}
            </div>
            <div>
              <div className="text-white font-medium">{dt.label}</div>
              <div className="text-sm text-gray-400">{dt.description}</div>
            </div>
            <input
              type="radio"
              name="dayType"
              value={dt.value}
              checked={selectedDayType === dt.value}
              onChange={() => onDayTypeChange(dt.value)}
              className="sr-only"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
