import { Panel } from '../common/Panel';

interface MealCardProps {
  meal: 'Breakfast' | 'Lunch' | 'Dinner';
  carbPoints: number;
  proteinPoints: number;
  fatPoints: number;
  carbGrams?: number;
  proteinGrams?: number;
  fatGrams?: number;
  totalKcal?: number;
  onViewBreakdown?: () => void;
  isSelected?: boolean;
  onSelect?: () => void;
}

interface MacroBarProps {
  label: string;
  current: number;
  color: string;
  bgColor: string;
}

function MacroBar({ label, current, color, bgColor }: MacroBarProps) {
  // For display purposes, show points as progress toward a reasonable max
  const maxPoints = 100; // Visual max for the bar
  const percentage = Math.min((current / maxPoints) * 100, 100);

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-10 uppercase">{label}</span>
      <div className={`flex-1 h-2 rounded-full ${bgColor}`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`text-xs font-medium w-8 text-right ${color.replace('bg-', 'text-').replace('-500', '-400')}`}>
        {current}
      </span>
    </div>
  );
}

export function MealCard({
  meal,
  carbPoints,
  proteinPoints,
  fatPoints,
  totalKcal,
  onViewBreakdown,
  isSelected = false,
  onSelect,
}: MealCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`
        w-full text-left transition-all duration-200 rounded-xl
        ${isSelected 
          ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-gray-900' 
          : 'hover:ring-1 hover:ring-gray-600'
        }
      `}
    >
      <Panel className={isSelected ? 'bg-gray-800/80' : ''}>
        {/* Header Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-medium">{meal}</h3>
            {isSelected && (
              <span className="text-xs text-emerald-400 font-medium">● Active</span>
            )}
          </div>
          {totalKcal !== undefined && (
            <span className="text-gray-500 text-xs">{totalKcal} kcal</span>
          )}
        </div>

        {/* Macro Progress Bars */}
        <div className="space-y-2">
          <MacroBar 
            label="Prot" 
            current={proteinPoints} 
            color="bg-purple-500"
            bgColor="bg-purple-500/20"
          />
          <MacroBar 
            label="Carb" 
            current={carbPoints} 
            color="bg-orange-500"
            bgColor="bg-orange-500/20"
          />
          <MacroBar 
            label="Fat" 
            current={fatPoints} 
            color="bg-gray-400"
            bgColor="bg-gray-600/30"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end mt-3 pt-2 border-t border-gray-800">
          <span
            onClick={(e) => {
              e.stopPropagation();
              onViewBreakdown?.();
            }}
            className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
          >
            Details
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </Panel>
    </button>
  );
}
