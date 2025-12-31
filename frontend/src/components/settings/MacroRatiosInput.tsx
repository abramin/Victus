interface MacroRatiosInputProps {
  carbRatio: number;
  proteinRatio: number;
  fatRatio: number;
  onChange: (carb: number, protein: number, fat: number) => void;
  error?: string;
  estimatedCalories?: number;
}

// Calculate grams from calories and ratio
// Protein/Carbs = 4 cal/g, Fat = 9 cal/g
function calculateGrams(
  calories: number,
  carbRatio: number,
  proteinRatio: number,
  fatRatio: number
) {
  return {
    carbsG: Math.round((calories * carbRatio) / 4),
    proteinG: Math.round((calories * proteinRatio) / 4),
    fatG: Math.round((calories * fatRatio) / 9),
  };
}

export function MacroRatiosInput({
  carbRatio,
  proteinRatio,
  fatRatio,
  onChange,
  error,
  estimatedCalories,
}: MacroRatiosInputProps) {
  const total = carbRatio + proteinRatio + fatRatio;
  const isValid = Math.abs(total - 1.0) < 0.01;

  const grams =
    estimatedCalories && estimatedCalories > 0
      ? calculateGrams(estimatedCalories, carbRatio, proteinRatio, fatRatio)
      : null;

  const handleCarbChange = (value: number) => {
    const newCarb = Math.min(1, Math.max(0, value / 100));
    onChange(newCarb, proteinRatio, fatRatio);
  };

  const handleProteinChange = (value: number) => {
    const newProtein = Math.min(1, Math.max(0, value / 100));
    onChange(carbRatio, newProtein, fatRatio);
  };

  const handleFatChange = (value: number) => {
    const newFat = Math.min(1, Math.max(0, value / 100));
    onChange(carbRatio, proteinRatio, newFat);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-slate-200">Macro Ratios</h3>
        <span className={`text-sm ${isValid ? 'text-green-400' : 'text-red-400'}`}>
          Total: {(total * 100).toFixed(0)}%
        </span>
      </div>

      {grams && (
        <div className="p-3 bg-slate-800/50 rounded-md">
          <div className="text-sm text-slate-400 mb-2">
            Based on ~{estimatedCalories?.toLocaleString()} cal/day:
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-amber-400 font-medium">{grams.carbsG}g</div>
              <div className="text-xs text-slate-500">Carbs</div>
            </div>
            <div>
              <div className="text-blue-400 font-medium">{grams.proteinG}g</div>
              <div className="text-xs text-slate-500">Protein</div>
            </div>
            <div>
              <div className="text-red-400 font-medium">{grams.fatG}g</div>
              <div className="text-xs text-slate-500">Fat</div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <RatioSlider
          label="Carbs"
          value={carbRatio * 100}
          onChange={handleCarbChange}
          color="bg-amber-500"
          grams={grams?.carbsG}
        />
        <RatioSlider
          label="Protein"
          value={proteinRatio * 100}
          onChange={handleProteinChange}
          color="bg-blue-500"
          grams={grams?.proteinG}
        />
        <RatioSlider
          label="Fat"
          value={fatRatio * 100}
          onChange={handleFatChange}
          color="bg-red-500"
          grams={grams?.fatG}
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {!isValid && !error && <p className="text-sm text-yellow-400">Ratios must sum to 100%</p>}
    </div>
  );
}

interface RatioSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  color: string;
  grams?: number;
}

function RatioSlider({ label, value, onChange, grams }: RatioSliderProps) {
  return (
    <div className="flex items-center gap-4">
      <span className="w-16 text-sm text-slate-400">{label}</span>
      <div className="flex-1 relative">
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>
      <span className="w-20 text-right text-sm text-slate-300">
        {value.toFixed(0)}%{grams !== undefined && <span className="text-slate-500"> ({grams}g)</span>}
      </span>
    </div>
  );
}
