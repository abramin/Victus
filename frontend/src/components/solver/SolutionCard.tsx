import { motion } from 'framer-motion';
import type { SolverSolution, SolverIngredient } from '../../api/types';
import {
  hoverLift,
  matchScorePulse,
  instructionGlow,
  absurdityAlertPulse,
  cursorBlink,
} from '../../lib/animations';
import { useTypewriter } from '../../hooks/useTypewriter';

interface SolutionCardProps {
  solution: SolverSolution;
  onLogMeal: () => void;
  rank: number;
}

// Inline SVG Icons for tactical ingredient display
function ProteinIcon() {
  return (
    <svg className="w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 11h.01M11 15h.01M16 16h.01M3 3l18 18" />
      <path d="M19.4 14.9C20.2 13.4 21 11 21 8c-5 0-7.5 1.2-9.4 3.3" />
      <path d="M5.2 5.2C3.6 6.5 2 9.7 2 13c5 0 7.5-1.2 9.4-3.3" />
    </svg>
  );
}

function CarbIcon() {
  return (
    <svg className="w-4 h-4 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 22 16 8" />
      <path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
      <path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
      <path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
      <path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z" />
      <path d="M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" />
      <path d="M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" />
      <path d="M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" />
    </svg>
  );
}

function FatIcon() {
  return (
    <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />
    </svg>
  );
}

function EnergyIcon() {
  return (
    <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M3 5h4" />
      <path d="M19 17v4" />
      <path d="M17 19h4" />
    </svg>
  );
}

/**
 * Get the appropriate icon for an ingredient based on its primary macro category.
 */
function getIngredientIcon(ing: SolverIngredient) {
  const name = ing.foodName.toLowerCase();

  // Protein-rich foods
  if (
    name.includes('chicken') ||
    name.includes('beef') ||
    name.includes('fish') ||
    name.includes('egg') ||
    name.includes('whey') ||
    name.includes('protein') ||
    name.includes('tofu') ||
    name.includes('greek yogurt')
  ) {
    return <ProteinIcon />;
  }

  // Carb-rich foods
  if (
    name.includes('rice') ||
    name.includes('oat') ||
    name.includes('bread') ||
    name.includes('pasta') ||
    name.includes('potato') ||
    name.includes('quinoa') ||
    name.includes('banana')
  ) {
    return <CarbIcon />;
  }

  // Fat-rich foods
  if (
    name.includes('avocado') ||
    name.includes('almond') ||
    name.includes('nut') ||
    name.includes('olive') ||
    name.includes('cheese') ||
    name.includes('butter') ||
    name.includes('oil')
  ) {
    return <FatIcon />;
  }

  // Default energy icon
  return <EnergyIcon />;
}

export function SolutionCard({ solution, onLogMeal, rank }: SolutionCardProps) {
  const refinement = solution.refinement;

  // Use mission title if available, otherwise fall back to recipe name
  const displayTitle = refinement?.missionTitle || solution.recipeName;

  // Typewriter effect for the title
  const { displayText: animatedTitle, isComplete } = useTypewriter(displayTitle, {
    charDelay: 25,
    startDelay: rank * 150, // Stagger start based on rank
  });

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
      ? 'border-emerald-500/20'
      : solution.matchScore >= 75
        ? 'border-yellow-500/20'
        : 'border-orange-500/20';

  // Context insight: prefer refinement's contextual insight, fall back to whyText
  const contextInsight = refinement?.contextualInsight || solution.whyText;

  return (
    <motion.div
      whileHover={hoverLift}
      className={`bg-gray-900 border ${matchBorder} rounded-xl p-4 transition-colors hover:border-opacity-50`}
    >
      {/* Header with pulsing match score */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500 font-mono">#{rank}</span>
        <motion.div
          variants={matchScorePulse}
          initial="idle"
          animate="pulse"
          className={`text-sm font-mono px-2 py-0.5 rounded ${matchColor} ${matchBg}`}
        >
          {Math.round(solution.matchScore)}%
        </motion.div>
      </div>

      {/* Mission Title with typewriter effect */}
      <h3 className="text-white font-mono font-bold text-sm mb-3 tracking-wide min-h-[2.5rem]">
        {animatedTitle}
        {!isComplete && (
          <motion.span
            variants={cursorBlink}
            initial="hidden"
            animate="visible"
            className="text-emerald-400 ml-0.5"
          >
            _
          </motion.span>
        )}
      </h3>

      {/* Ingredients list with tactical icons */}
      <div className="space-y-1.5 mb-4">
        {solution.ingredients.map((ing, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            {getIngredientIcon(ing)}
            <span className="text-emerald-400 font-medium">{ing.display}</span>
            <span className="text-gray-600">-</span>
            <span className="text-gray-300">{ing.foodName}</span>
          </div>
        ))}
      </div>

      {/* Operational Steps - glowing instruction box */}
      {refinement?.tacticalPrep && (
        <motion.div
          variants={instructionGlow}
          initial="idle"
          animate="glow"
          className="bg-emerald-900/20 border border-emerald-500/20 rounded-lg p-3 mb-4"
        >
          <span className="text-xs text-emerald-500 font-mono font-bold block mb-1">
            OPERATIONAL STEPS:
          </span>
          <p className="text-sm text-gray-300">{refinement.tacticalPrep}</p>
        </motion.div>
      )}

      {/* Logistic Alert - Enhanced with pulsating border */}
      {refinement?.absurdityAlert && (
        <motion.div
          variants={absurdityAlertPulse}
          initial="idle"
          animate="warning"
          className="flex items-start gap-2 bg-amber-900/30 border-2 border-amber-500/50 rounded-lg p-3 mb-4 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
        >
          <AlertTriangleIcon />
          <div className="flex-1">
            <span className="text-xs text-amber-400 font-mono font-bold block mb-1">
              LOGISTIC ALERT:
            </span>
            <span className="text-sm text-amber-200">{refinement.absurdityAlert}</span>
          </div>
        </motion.div>
      )}

      {/* Flavor Patch - Zero-calorie taste suggestions */}
      {refinement?.flavorPatch && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-start gap-2 bg-cyan-900/20 border border-cyan-500/20 rounded-lg p-3 mb-4"
        >
          <SparklesIcon />
          <div className="flex-1">
            <span className="text-xs text-cyan-400 font-mono font-bold block mb-1">
              FLAVOR PATCH:
            </span>
            <span className="text-sm text-cyan-200">{refinement.flavorPatch}</span>
          </div>
        </motion.div>
      )}

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

      {/* Contextual Insight */}
      <p className="text-xs text-emerald-400/70 mb-4 italic">{contextInsight}</p>

      {/* LLM indicator badge */}
      {refinement?.generatedByLlm && (
        <div className="flex items-center gap-1 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-gray-500">AI Enhanced</span>
        </div>
      )}

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
