import type { TrainingType } from '../../api/types';
import { TRAINING_LABELS, TRAINING_ICONS, TRAINING_COLORS } from '../../constants';

interface TrainingTypeCardsProps {
  value: TrainingType;
  onChange: (type: TrainingType) => void;
  disabled?: boolean;
  /** Optional list of types to exclude from display */
  excludeTypes?: TrainingType[];
}

// Ordered list for consistent display
const TRAINING_TYPES_ORDER: TrainingType[] = [
  'rest',
  'walking',
  'qigong',
  'mobility',
  'gmb',
  'strength',
  'calisthenics',
  'run',
  'cycle',
  'row',
  'hiit',
  'mixed',
];

/**
 * Grid of training type icon cards.
 * Replaces dropdown selector with visual, tap-friendly cards.
 * Grid layout: 3 columns on mobile, 4 columns on desktop.
 */
export function TrainingTypeCards({
  value,
  onChange,
  disabled = false,
  excludeTypes = [],
}: TrainingTypeCardsProps) {
  const availableTypes = TRAINING_TYPES_ORDER.filter(
    (type) => !excludeTypes.includes(type)
  );

  return (
    <div className="space-y-2">
      <span className="text-sm text-gray-400">Training Type</span>
      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
        {availableTypes.map((type) => {
          const isSelected = value === type;
          const colors = TRAINING_COLORS[type];

          return (
            <button
              key={type}
              type="button"
              onClick={() => onChange(type)}
              disabled={disabled}
              className={`
                w-20 h-24 rounded-xl
                flex flex-col items-center justify-center gap-2
                border-2 transition-all duration-150
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${isSelected
                  ? `${colors.bg} border-white scale-105 shadow-lg`
                  : 'bg-gray-800 border-gray-700 hover:border-gray-500 hover:bg-gray-750'
                }
              `}
            >
              <span className="text-2xl">{TRAINING_ICONS[type]}</span>
              <span className={`text-xs font-medium ${isSelected ? 'text-white' : colors.text}`}>
                {TRAINING_LABELS[type]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
