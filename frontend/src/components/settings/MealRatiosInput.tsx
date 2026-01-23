interface MealRatiosInputProps {
  breakfast: number;
  lunch: number;
  dinner: number;
  onChange: (breakfast: number, lunch: number, dinner: number) => void;
  error?: string;
}

export function MealRatiosInput({
  breakfast,
  lunch,
  dinner,
  onChange,
  error,
}: MealRatiosInputProps) {
  const total = breakfast + lunch + dinner;
  const isValid = Math.abs(total - 1.0) < 0.01;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-slate-200">Meal Distribution</h3>
        <span className={`text-sm ${isValid ? 'text-green-400' : 'text-red-400'}`}>
          Total: {(total * 100).toFixed(0)}%
        </span>
      </div>

      <div className="space-y-3">
        <MealSlider
          label="Breakfast"
          value={breakfast * 100}
          onChange={(v) => onChange(v / 100, lunch, dinner)}
        />
        <MealSlider
          label="Lunch"
          value={lunch * 100}
          onChange={(v) => onChange(breakfast, v / 100, dinner)}
        />
        <MealSlider
          label="Dinner"
          value={dinner * 100}
          onChange={(v) => onChange(breakfast, lunch, v / 100)}
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {!isValid && !error && <p className="text-sm text-yellow-400">Meal ratios must sum to 100%</p>}
    </div>
  );
}

interface MealSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

function MealSlider({ label, value, onChange }: MealSliderProps) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-20 text-sm text-slate-400">{label}</span>
      <div className="flex-1 relative">
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>
      <span className="w-12 text-right text-sm text-slate-300">{value.toFixed(0)}%</span>
    </div>
  );
}
