import { motion } from 'framer-motion';
import type { SolverSolution, SolverIngredient } from '../../api/types';
import { ingredientFlyIn, stackContainer } from '../../lib/animations';

interface MacroStackVisualizationProps {
  solution: SolverSolution;
  remainingCalories: number;
  onAnimationComplete?: () => void;
}

/**
 * Determines the dominant macro color for an ingredient based on calorie contribution.
 */
function getDominantMacroColor(proteinG: number, carbsG: number, fatG: number): string {
  const proteinCal = proteinG * 4;
  const carbsCal = carbsG * 4;
  const fatCal = fatG * 9;

  if (proteinCal >= carbsCal && proteinCal >= fatCal) {
    return 'bg-purple-500'; // Protein dominant
  }
  if (carbsCal >= proteinCal && carbsCal >= fatCal) {
    return 'bg-orange-400'; // Carb dominant
  }
  return 'bg-gray-400'; // Fat dominant
}

/**
 * Calculate calories for a single ingredient (approximation based on total solution).
 */
function getIngredientCalories(
  ingredient: SolverIngredient,
  solution: SolverSolution
): number {
  const totalIngredients = solution.ingredients.length;
  if (totalIngredients === 0) return 0;

  // Distribute total calories proportionally by weight
  const totalWeight = solution.ingredients.reduce((sum, ing) => sum + ing.amountG, 0);
  if (totalWeight === 0) return 0;

  return (ingredient.amountG / totalWeight) * solution.totalMacros.caloriesKcal;
}

/**
 * Calculate approximate macros for a single ingredient based on its weight proportion.
 */
function getIngredientMacros(
  ingredient: SolverIngredient,
  solution: SolverSolution
): { proteinG: number; carbsG: number; fatG: number } {
  const totalWeight = solution.ingredients.reduce((sum, ing) => sum + ing.amountG, 0);
  if (totalWeight === 0) return { proteinG: 0, carbsG: 0, fatG: 0 };

  const proportion = ingredient.amountG / totalWeight;
  return {
    proteinG: solution.totalMacros.proteinG * proportion,
    carbsG: solution.totalMacros.carbsG * proportion,
    fatG: solution.totalMacros.fatG * proportion,
  };
}

interface IngredientBlockProps {
  ingredient: SolverIngredient;
  widthPercent: number;
  color: string;
  index: number;
}

function IngredientBlock({ ingredient, widthPercent, color, index }: IngredientBlockProps) {
  return (
    <motion.div
      custom={index}
      variants={ingredientFlyIn}
      initial="hidden"
      animate="visible"
      className={`h-12 ${color} flex items-center justify-center px-2 overflow-hidden`}
      style={{ width: `${widthPercent}%`, minWidth: '40px' }}
    >
      <span className="text-white text-xs font-medium truncate">
        {ingredient.foodName.split('/')[0]}
      </span>
    </motion.div>
  );
}

export function MacroStackVisualization({
  solution,
  remainingCalories,
  onAnimationComplete,
}: MacroStackVisualizationProps) {
  const totalSolutionCalories = solution.totalMacros.caloriesKcal;
  const fillPercent = Math.min(100, (totalSolutionCalories / remainingCalories) * 100);

  // Calculate ingredient widths proportionally
  const ingredientData = solution.ingredients.map((ingredient) => {
    const ingredientCals = getIngredientCalories(ingredient, solution);
    const widthPercent = (ingredientCals / remainingCalories) * 100;
    const macros = getIngredientMacros(ingredient, solution);
    const color = getDominantMacroColor(macros.proteinG, macros.carbsG, macros.fatG);

    return {
      ingredient,
      widthPercent: Math.max(widthPercent, 5), // Minimum 5% width for visibility
      color,
    };
  });

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">Filling calorie gap</span>
        <span className="text-white font-medium">
          {Math.round(totalSolutionCalories)} / {Math.round(remainingCalories)} kcal
        </span>
      </div>

      {/* Gap Bar Container */}
      <div className="relative h-12 bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
        {/* Empty gap indicator */}
        <div
          className="absolute inset-0 bg-gray-700/30"
          style={{ width: `${100 - fillPercent}%`, right: 0, left: 'auto' }}
        />

        {/* Ingredient stack */}
        <motion.div
          variants={stackContainer}
          initial="hidden"
          animate="visible"
          onAnimationComplete={onAnimationComplete}
          className="flex h-full"
        >
          {ingredientData.map((data, index) => (
            <IngredientBlock
              key={index}
              ingredient={data.ingredient}
              widthPercent={data.widthPercent}
              color={data.color}
              index={index}
            />
          ))}
        </motion.div>
      </div>

      {/* Ingredient labels */}
      <div className="flex flex-wrap gap-2">
        {ingredientData.map((data, index) => (
          <motion.div
            key={index}
            custom={index}
            variants={ingredientFlyIn}
            initial="hidden"
            animate="visible"
            className="flex items-center gap-1.5 text-xs"
          >
            <div className={`w-3 h-3 rounded ${data.color}`} />
            <span className="text-gray-300">{data.ingredient.display}</span>
            <span className="text-gray-500">{data.ingredient.foodName}</span>
          </motion.div>
        ))}
      </div>

      {/* Match score */}
      <div className="flex items-center justify-center gap-2 pt-2">
        <span
          className={`text-sm font-mono px-2 py-0.5 rounded ${
            solution.matchScore >= 90
              ? 'text-emerald-400 bg-emerald-500/10'
              : solution.matchScore >= 75
                ? 'text-yellow-400 bg-yellow-500/10'
                : 'text-orange-400 bg-orange-500/10'
          }`}
        >
          {Math.round(solution.matchScore)}% match
        </span>
      </div>
    </div>
  );
}
