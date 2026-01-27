import { motion } from 'framer-motion';
import type { SolverSolution } from '../../api/types';
import { hoverLift } from '../../lib/animations';

interface SolutionCardProps {
  solution: SolverSolution;
  onLogMeal: () => void;
  rank: number;
}

export function SolutionCard({ solution, onLogMeal, rank }: SolutionCardProps) {
  const matchColor =
    solution.matchScore >= 90
      ? 'text-emerald-400'
      : solution.matchScore >= 75
        ? 'text-yellow-400'
        : 'text-orange-400';

  const matchBg =
    solution.matchScore >= 90
      ? 'bg-emerald-500/10'
      : solution.matchScore >= 75
        ? 'bg-yellow-500/10'
        : 'bg-orange-500/10';

  const matchBorder =
    solution.matchScore >= 90
      ? 'hover:border-emerald-500/30'
      : solution.matchScore >= 75
        ? 'hover:border-yellow-500/30'
        : 'hover:border-orange-500/30';

  return (
    <motion.div
      whileHover={hoverLift}
      className={`bg-gray-900 border border-gray-800 rounded-xl p-4 transition-colors ${matchBorder}`}
    >
      {/* Header with match score */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">#{rank}</span>
          <h3 className="text-white font-medium">{solution.recipeName}</h3>
        </div>
        <span className={`text-sm font-mono px-2 py-0.5 rounded ${matchColor} ${matchBg}`}>
          {Math.round(solution.matchScore)}% match
        </span>
      </div>

      {/* Ingredients list */}
      <div className="space-y-1.5 mb-4">
        {solution.ingredients.map((ing, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            <span className="text-emerald-400 font-medium">{ing.display}</span>
            <span className="text-gray-600">-</span>
            <span className="text-gray-300">{ing.foodName}</span>
          </div>
        ))}
      </div>

      {/* Macro summary */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="text-center p-2 bg-gray-800/50 rounded">
          <div className="text-white font-medium text-sm">
            {Math.round(solution.totalMacros.caloriesKcal)}
          </div>
          <div className="text-xs text-gray-500">kcal</div>
        </div>
        <div className="text-center p-2 bg-gray-800/50 rounded">
          <div className="text-purple-400 font-medium text-sm">
            {Math.round(solution.totalMacros.proteinG)}g
          </div>
          <div className="text-xs text-gray-500">protein</div>
        </div>
        <div className="text-center p-2 bg-gray-800/50 rounded">
          <div className="text-orange-400 font-medium text-sm">
            {Math.round(solution.totalMacros.carbsG)}g
          </div>
          <div className="text-xs text-gray-500">carbs</div>
        </div>
        <div className="text-center p-2 bg-gray-800/50 rounded">
          <div className="text-gray-400 font-medium text-sm">
            {Math.round(solution.totalMacros.fatG)}g
          </div>
          <div className="text-xs text-gray-500">fat</div>
        </div>
      </div>

      {/* Why explanation */}
      <p className="text-xs text-gray-500 mb-4 italic">{solution.whyText}</p>

      {/* Log action */}
      <button
        onClick={onLogMeal}
        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors text-sm"
      >
        Log This Meal
      </button>
    </motion.div>
  );
}
