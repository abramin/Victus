interface MacroRatiosInputProps {
  carbRatio: number;
  proteinRatio: number;
  fatRatio: number;
  onChange: (carb: number, protein: number, fat: number) => void;
  error?: string;
}

export function MacroRatiosInput({
  carbRatio,
  proteinRatio,
  fatRatio,
  onChange,
  error,
}: MacroRatiosInputProps) {
  const total = carbRatio + proteinRatio + fatRatio;
  const isValid = Math.abs(total - 1.0) < 0.01;

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

      <div className="space-y-3">
        <RatioSlider
          label="Carbs"
          value={carbRatio * 100}
          onChange={handleCarbChange}
          color="bg-amber-500"
        />
        <RatioSlider
          label="Protein"
          value={proteinRatio * 100}
          onChange={handleProteinChange}
          color="bg-blue-500"
        />
        <RatioSlider
          label="Fat"
          value={fatRatio * 100}
          onChange={handleFatChange}
          color="bg-red-500"
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
}

function RatioSlider({ label, value, onChange, color }: RatioSliderProps) {
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
      <span className="w-12 text-right text-sm text-slate-300">{value.toFixed(0)}%</span>
    </div>
  );
}
