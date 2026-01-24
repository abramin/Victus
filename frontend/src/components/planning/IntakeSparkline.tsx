interface IntakeSparklineProps {
  targetKcal: number;
  maxKcal?: number;
  isRefeedWeek?: boolean;
}

/**
 * Mini horizontal bar visualization for weekly calorie intake.
 * Shows intake as a filled bar relative to max, e.g., [======--] 1,444
 */
export function IntakeSparkline({
  targetKcal,
  maxKcal = 2500,
  isRefeedWeek = false,
}: IntakeSparklineProps) {
  const fillPercent = Math.min(100, Math.max(0, (targetKcal / maxKcal) * 100));

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-16 h-2 bg-gray-200 rounded-sm overflow-hidden"
        title={`${targetKcal.toLocaleString()} kcal${isRefeedWeek ? ' (Refeed)' : ''}`}
      >
        <div
          className={`h-full rounded-sm transition-all ${
            isRefeedWeek ? 'bg-emerald-500' : 'bg-blue-500'
          }`}
          style={{ width: `${fillPercent}%` }}
        />
      </div>
      <span className={`text-sm tabular-nums ${isRefeedWeek ? 'text-emerald-600 font-medium' : 'text-gray-900'}`}>
        {targetKcal.toLocaleString()}
      </span>
    </div>
  );
}
