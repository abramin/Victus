import type { DayType } from '../../api/types';
import { DAY_TYPE_OPTIONS } from '../../constants';
import { Panel } from '../common/Panel';

const DAY_TYPE_CARD_STYLES: Record<DayType, {
  icon: string;
  selected: string;
  unselected: string;
  iconColor: string;
  textColor: string;
}> = {
  performance: {
    icon: '⚡',
    selected: 'bg-blue-900/60 border-blue-500',
    unselected: 'bg-gray-800/50 border-gray-700 hover:border-blue-500/50',
    iconColor: 'text-blue-400',
    textColor: 'text-blue-300',
  },
  fatburner: {
    icon: '🔥',
    selected: 'bg-orange-900/60 border-orange-500',
    unselected: 'bg-gray-800/50 border-gray-700 hover:border-orange-500/50',
    iconColor: 'text-orange-400',
    textColor: 'text-orange-300',
  },
  metabolize: {
    icon: '🥗',
    selected: 'bg-emerald-900/60 border-emerald-500',
    unselected: 'bg-gray-800/50 border-gray-700 hover:border-emerald-500/50',
    iconColor: 'text-emerald-400',
    textColor: 'text-emerald-300',
  },
};

interface DayTypeSelectorProps {
  selectedDayType: DayType;
  onDayTypeChange: (dayType: DayType) => void;
  /** 'list' shows vertical radio buttons, 'cards' shows colored card grid */
  variant?: 'list' | 'cards';
  /** Shows "Auto-selected for rest day" hint in cards variant */
  showAutoSelectedHint?: boolean;
}

export function DayTypeSelector({
  selectedDayType,
  onDayTypeChange,
  variant = 'list',
  showAutoSelectedHint = false,
}: DayTypeSelectorProps) {
  if (variant === 'cards') {
    return (
      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-medium">Day Type</h3>
          {showAutoSelectedHint && (
            <span className="text-xs text-orange-400">Auto-selected for rest day</span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {DAY_TYPE_OPTIONS.map((dt) => {
            const isSelected = selectedDayType === dt.value;
            const cardStyles = DAY_TYPE_CARD_STYLES[dt.value as DayType];

            return (
              <label
                key={dt.value}
                className={`flex flex-col items-center text-center p-4 rounded-xl cursor-pointer transition-all border-2 min-h-[120px] ${
                  isSelected ? cardStyles.selected : cardStyles.unselected
                }`}
              >
                <span className="text-3xl mb-2">{cardStyles.icon}</span>
                <span className={`font-semibold ${isSelected ? cardStyles.textColor : 'text-white'}`}>
                  {dt.label}
                </span>
                <span className="text-xs text-gray-400 mt-1 leading-tight">
                  {dt.description}
                </span>
                <input
                  type="radio"
                  name="dayType"
                  value={dt.value}
                  checked={isSelected}
                  onChange={() => onDayTypeChange(dt.value)}
                  className="sr-only"
                />
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  // Default: list variant
  return (
    <Panel title="Day Type">
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
    </Panel>
  );
}
