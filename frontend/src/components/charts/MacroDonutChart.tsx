import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface MacroDonutChartProps {
  /** Carbs percentage (0-100) */
  carbs: number;
  /** Protein percentage (0-100) */
  protein: number;
  /** Fat percentage (0-100) */
  fat: number;
  /** Size in pixels (default: 48) */
  size?: number;
  /** Optional center label (e.g., date number) */
  centerLabel?: string;
  /** Additional CSS classes */
  className?: string;
}

const COLORS = {
  carbs: '#f97316', // Orange for carbs
  protein: '#a855f7', // Purple for protein
  fat: '#6b7280', // Grey for fats
};

export function MacroDonutChart({
  carbs,
  protein,
  fat,
  size = 48,
  centerLabel,
  className = '',
}: MacroDonutChartProps) {
  // Normalize values if they exceed 100%
  const total = carbs + protein + fat;
  const normalizedCarbs = total > 0 ? (carbs / total) * 100 : 0;
  const normalizedProtein = total > 0 ? (protein / total) * 100 : 0;
  const normalizedFat = total > 0 ? (fat / total) * 100 : 0;

  const data = [
    { name: 'Carbs', value: normalizedCarbs, color: COLORS.carbs },
    { name: 'Protein', value: normalizedProtein, color: COLORS.protein },
    { name: 'Fat', value: normalizedFat, color: COLORS.fat },
  ].filter(d => d.value > 0);

  // If all values are 0, show an empty ring
  if (data.length === 0) {
    data.push({ name: 'Empty', value: 100, color: '#374151' });
  }

  const innerRadius = size * 0.3;
  const outerRadius = size * 0.45;

  return (
    <div
      className={`relative ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            dataKey="value"
            stroke="none"
            startAngle={90}
            endAngle={-270}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {centerLabel && (
        <div
          className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-200"
          style={{ fontSize: `${size * 0.25}px` }}
        >
          {centerLabel}
        </div>
      )}
    </div>
  );
}
