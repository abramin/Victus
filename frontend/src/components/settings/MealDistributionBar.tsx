import { DistributionBar } from '../common/DistributionBar';

interface MealDistributionBarProps {
  breakfast: number;
  lunch: number;
  dinner: number;
  onChange: (breakfast: number, lunch: number, dinner: number) => void;
  error?: string;
}

export function MealDistributionBar({
  breakfast,
  lunch,
  dinner,
  onChange,
  error,
}: MealDistributionBarProps) {
  return (
    <DistributionBar
      title="Meal Distribution"
      hint="Drag the handles to adjust how calories are distributed across meals"
      segments={[
        { label: 'Breakfast', value: breakfast, color: 'bg-amber-500/80' },
        { label: 'Lunch', value: lunch, color: 'bg-emerald-500/80' },
        { label: 'Dinner', value: dinner, color: 'bg-indigo-500/80' },
      ]}
      onChange={([b, l, d]) => onChange(b, l, d)}
      error={error}
    />
  );
}

