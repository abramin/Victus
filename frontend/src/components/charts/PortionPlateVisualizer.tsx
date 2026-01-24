import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

interface PortionPlateVisualizerProps {
  /** Plate multiplier (0.25 = quarter, 0.5 = half, 1.0 = full) */
  plateMultiplier: number;
  /** Name of the selected food */
  foodName: string;
  /** Target points for the selected meal (used to calculate grams) */
  targetPoints?: number;
  /** Callback when close button is clicked */
  onClose?: () => void;
  /** Additional CSS classes */
  className?: string;
}

function getPortionDescription(multiplier: number): string {
  if (multiplier <= 0) return '';
  if (multiplier <= 0.25) return 'Quarter Plate';
  if (multiplier <= 0.5) return 'Half Plate';
  if (multiplier <= 0.75) return 'Three-Quarter Plate';
  return 'Full Plate';
}

const PLATE_COLOR = '#10b981'; // Emerald green for food portion
const EMPTY_COLOR = '#374151'; // Gray for empty portion

export function PortionPlateVisualizer({
  plateMultiplier,
  foodName,
  targetPoints,
  onClose,
  className = '',
}: PortionPlateVisualizerProps) {
  const isEmpty = !foodName || plateMultiplier <= 0;
  const portionDescription = getPortionDescription(plateMultiplier);

  // Calculate serving grams from target points and plate multiplier
  const servingGrams = targetPoints && plateMultiplier > 0
    ? Math.round(targetPoints * plateMultiplier)
    : null;

  // Data for the pie chart - filled portion vs empty
  const filledPercentage = Math.min(plateMultiplier * 100, 100);
  const emptyPercentage = 100 - filledPercentage;

  const data = [
    { name: 'Filled', value: filledPercentage, color: PLATE_COLOR },
    { name: 'Empty', value: emptyPercentage, color: EMPTY_COLOR },
  ];

  if (isEmpty) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 ${className}`}>
        <div className="w-32 h-32 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center">
          <span className="text-gray-500 text-sm text-center px-4">
            Select a food to see portion size
          </span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={`flex flex-col items-center ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
    >
      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="self-end mb-2 text-gray-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}

      {/* Food name */}
      <h3 className="text-lg font-semibold text-white mb-2">{foodName}</h3>

      {/* Plate visualization */}
      <div className="relative w-40 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={30}
              outerRadius={70}
              dataKey="value"
              stroke="none"
              startAngle={90}
              endAngle={-270}
              animationDuration={500}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center display - grams hero number or plate icon */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {servingGrams !== null ? (
            <>
              <span className="text-2xl font-bold text-white">{servingGrams}g</span>
              <span className="text-xs text-gray-400">serving</span>
            </>
          ) : (
            <span className="text-3xl">🍽️</span>
          )}
        </div>
      </div>

      {/* Portion description */}
      <p className="mt-3 text-emerald-400 font-medium">{portionDescription}</p>
      <p className="text-sm text-gray-400">
        {Math.round(plateMultiplier * 100)}% of your plate
      </p>
    </motion.div>
  );
}
