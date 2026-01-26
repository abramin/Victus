import { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { TerminalLoader } from './TerminalLoader';
import { SolutionCard } from './SolutionCard';
import { solveMacros } from '../../api/client';
import type { SolverSolution, SolverRequest } from '../../api/types';

interface MacroSolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  remainingCalories: number;
  remainingProteinG: number;
  remainingCarbsG: number;
  remainingFatG: number;
  onLogSolution?: (solution: SolverSolution) => void;
}

type ModalState = 'loading' | 'results' | 'empty' | 'error';

export function MacroSolverModal({
  isOpen,
  onClose,
  remainingCalories,
  remainingProteinG,
  remainingCarbsG,
  remainingFatG,
  onLogSolution,
}: MacroSolverModalProps) {
  const [state, setState] = useState<ModalState>('loading');
  const [solutions, setSolutions] = useState<SolverSolution[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setState('loading');
      setSolutions([]);
      setError(null);
      return;
    }

    const controller = new AbortController();

    const fetchSolutions = async () => {
      try {
        setState('loading');
        setError(null);

        const request: SolverRequest = {
          remainingProteinG: Math.max(0, Math.round(remainingProteinG)),
          remainingCarbsG: Math.max(0, Math.round(remainingCarbsG)),
          remainingFatG: Math.max(0, Math.round(remainingFatG)),
          remainingCalories: Math.max(0, Math.round(remainingCalories)),
        };

        const response = await solveMacros(request, controller.signal);

        if (response.computed && response.solutions.length > 0) {
          setSolutions(response.solutions);
          setState('results');
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
    };

    fetchSolutions();

    return () => controller.abort();
  }, [isOpen, remainingCalories, remainingProteinG, remainingCarbsG, remainingFatG]);

  const handleLogMeal = (solution: SolverSolution) => {
    if (onLogSolution) {
      onLogSolution(solution);
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Auto-Fill Macros">
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
        {state === 'loading' && <TerminalLoader />}

        {state === 'results' && (
          <div className="space-y-4">
            <div className="text-sm text-gray-400">
              Found {solutions.length} solution{solutions.length !== 1 ? 's' : ''} for your remaining
              macros:
            </div>
            {solutions.map((solution, index) => (
              <SolutionCard
                key={index}
                solution={solution}
                rank={index + 1}
                onLogMeal={() => handleLogMeal(solution)}
              />
            ))}
          </div>
        )}

        {state === 'empty' && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🤔</div>
            <h3 className="text-lg font-medium text-white mb-2">No matches found</h3>
            <p className="text-sm text-gray-400">
              We couldn&apos;t find a good combination with your pantry staples. Try adjusting your
              remaining targets or check your food preferences.
            </p>
          </div>
        )}

        {state === 'error' && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">⚠️</div>
            <h3 className="text-lg font-medium text-white mb-2">Something went wrong</h3>
            <p className="text-sm text-gray-400">{error}</p>
            <button
              onClick={() => setState('loading')}
              className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
