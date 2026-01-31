import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '../common/Modal';
import { TerminalLoader } from './TerminalLoader';
import { MacroStackVisualization } from './MacroStackVisualization';
import { SolutionCard } from './SolutionCard';
import { solveMacros } from '../../api/client';
import type {
  SolverSolution,
  SolverRequest,
  DayType,
  PlannedTrainingForSolver,
  FastingProtocol,
} from '../../api/types';
import { staggerContainer, fadeInUp } from '../../lib/animations';

interface MacroSolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  remainingCalories: number;
  remainingProteinG: number;
  remainingCarbsG: number;
  remainingFatG: number;
  onLogSolution?: (solution: SolverSolution) => void;
  /** Optional training context for semantic refinement */
  dayType?: DayType;
  plannedTraining?: PlannedTrainingForSolver[];
  activeProtocol?: FastingProtocol;
}

/**
 * Infer meal time from current hour.
 * Breakfast: 5-10, Lunch: 11-15, Dinner: 16-21, Snack: otherwise
 */
function inferMealTime(): 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 22) return 'dinner';
  return 'snack';
}

type ModalState = 'computing' | 'stacking' | 'results' | 'empty' | 'error';

const MIN_COMPUTING_TIME_MS = 1500;
const STACKING_DURATION_MS = 1500;

export function MacroSolverModal({
  isOpen,
  onClose,
  remainingCalories,
  remainingProteinG,
  remainingCarbsG,
  remainingFatG,
  onLogSolution,
  dayType,
  plannedTraining,
  activeProtocol,
}: MacroSolverModalProps) {
  const [state, setState] = useState<ModalState>('computing');
  const [solutions, setSolutions] = useState<SolverSolution[]>([]);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const fetchSolutions = useCallback(async () => {
    try {
      setState('computing');
      setError(null);

      const controller = new AbortController();
      controllerRef.current = controller;

      const request: SolverRequest = {
        remainingProteinG: Math.max(0, Math.round(remainingProteinG)),
        remainingCarbsG: Math.max(0, Math.round(remainingCarbsG)),
        remainingFatG: Math.max(0, Math.round(remainingFatG)),
        remainingCalories: Math.max(0, Math.round(remainingCalories)),
        // Training context for semantic refinement
        dayType,
        plannedTraining,
        mealTime: inferMealTime(),
        activeProtocol,
      };

      // Run API call and minimum delay in parallel
      const minDelay = new Promise((resolve) => setTimeout(resolve, MIN_COMPUTING_TIME_MS));
      const apiCall = solveMacros(request, controller.signal);

      const [, response] = await Promise.all([minDelay, apiCall]);

      if (response.computed && response.solutions.length > 0) {
        setSolutions(response.solutions);
        setState('stacking');

        // Transition to results after stacking animation
        setTimeout(() => {
          setState('results');
        }, STACKING_DURATION_MS);
      } else {
        setState('empty');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error('Solver error:', err);
      setError(err instanceof Error ? err.message : 'Failed to solve macros');
      setState('error');
    }
  }, [remainingCalories, remainingProteinG, remainingCarbsG, remainingFatG, dayType, plannedTraining]);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setState('computing');
      setSolutions([]);
      setError(null);
      if (controllerRef.current) {
        controllerRef.current.abort();
        controllerRef.current = null;
      }
      return;
    }

    fetchSolutions();

    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, [isOpen, fetchSolutions]);

  const handleLogMeal = (solution: SolverSolution) => {
    if (onLogSolution) {
      onLogSolution(solution);
    }
    onClose();
  };

  const handleRetry = () => {
    fetchSolutions();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="RATION GENERATOR">
      <div className="space-y-4">
        {/* Remaining budget summary */}
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-2">Remaining Budget</div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-white font-medium">{Math.round(remainingCalories)}</div>
              <div className="text-xs text-gray-500">kcal</div>
            </div>
            <div>
              <div className="text-purple-400 font-medium">{Math.round(remainingProteinG)}g</div>
              <div className="text-xs text-gray-500">protein</div>
            </div>
            <div>
              <div className="text-orange-400 font-medium">{Math.round(remainingCarbsG)}g</div>
              <div className="text-xs text-gray-500">carbs</div>
            </div>
            <div>
              <div className="text-gray-400 font-medium">{Math.round(remainingFatG)}g</div>
              <div className="text-xs text-gray-500">fat</div>
            </div>
          </div>
        </div>

        {/* Content based on state */}
        <AnimatePresence mode="wait">
          {state === 'computing' && (
            <motion.div
              key="computing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <TerminalLoader />
            </motion.div>
          )}

          {state === 'stacking' && solutions.length > 0 && (
            <motion.div
              key="stacking"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <MacroStackVisualization
                solution={solutions[0]}
                remainingCalories={remainingCalories}
              />
            </motion.div>
          )}

          {state === 'results' && (
            <motion.div
              key="results"
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="space-y-4"
            >
              <motion.div variants={fadeInUp} className="text-sm text-gray-400">
                Found {solutions.length} solution{solutions.length !== 1 ? 's' : ''} for your
                remaining macros:
              </motion.div>
              {solutions.map((solution, index) => (
                <motion.div key={index} variants={fadeInUp}>
                  <SolutionCard
                    solution={solution}
                    rank={index + 1}
                    onLogMeal={() => handleLogMeal(solution)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}

          {state === 'empty' && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8"
            >
              <div className="text-4xl mb-3">?</div>
              <h3 className="text-lg font-medium text-white mb-2">No matches found</h3>
              <p className="text-sm text-gray-400">
                We couldn&apos;t find a good combination with your pantry staples. Try adjusting
                your remaining targets or check your food preferences.
              </p>
            </motion.div>
          )}

          {state === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8"
            >
              <div className="text-4xl mb-3">!</div>
              <h3 className="text-lg font-medium text-white mb-2">Something went wrong</h3>
              <p className="text-sm text-gray-400">{error}</p>
              <button
                onClick={handleRetry}
                className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
              >
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}
