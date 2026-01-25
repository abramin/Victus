import { useState, useMemo } from 'react';
import type { TrainingConfig, TrainingType } from '../../api/types';
import { Modal } from '../common/Modal';
import { TRAINING_LABELS, TRAINING_ICONS } from '../../constants';
import { getSessionCategory } from './sessionCategories';
import { calculateSessionLoad, formatLoad } from './loadCalculations';

interface ConfigureSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainingType: TrainingType;
  trainingConfig: TrainingConfig;
  targetDate: string;
  onConfirm: (session: {
    trainingType: TrainingType;
    durationMin: number;
    rpe: number;
    loadScore: number;
  }) => void;
}

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

/**
 * Modal for configuring a training session's duration and RPE after dropping on calendar.
 */
export function ConfigureSessionModal({
  isOpen,
  onClose,
  trainingType,
  trainingConfig,
  targetDate,
  onConfirm,
}: ConfigureSessionModalProps) {
  const [durationMin, setDurationMin] = useState(60);
  const [rpe, setRpe] = useState(5);

  const category = getSessionCategory(trainingType);
  const emoji = TRAINING_ICONS[trainingType];
  const label = TRAINING_LABELS[trainingType];

  // Calculate projected load
  const projectedLoad = useMemo(
    () => calculateSessionLoad(trainingConfig.loadScore, durationMin, rpe),
    [trainingConfig.loadScore, durationMin, rpe]
  );

  // Format target date for display
  const formattedDate = useMemo(() => {
    const date = new Date(targetDate + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }, [targetDate]);

  const handleConfirm = () => {
    onConfirm({
      trainingType,
      durationMin,
      rpe,
      loadScore: trainingConfig.loadScore,
    });
    // Reset for next use
    setDurationMin(60);
    setRpe(5);
  };

  const handleClose = () => {
    // Reset state on close
    setDurationMin(60);
    setRpe(5);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Configure Session">
      {/* Session info header */}
      <div className="flex items-center gap-3 mb-6 p-3 bg-gray-800 rounded-lg border border-gray-700">
        <span className="text-3xl">{emoji}</span>
        <div>
          <p className={`font-semibold ${category.textClass}`}>{label}</p>
          <p className="text-sm text-gray-400">{formattedDate}</p>
        </div>
      </div>

      {/* Duration picker */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Duration (minutes)
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {DURATION_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setDurationMin(preset)}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${durationMin === preset
                  ? `${category.bgClass} ${category.textClass} border ${category.borderClass}`
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                }
              `}
            >
              {preset}m
            </button>
          ))}
        </div>
        <input
          type="range"
          min={5}
          max={180}
          step={5}
          value={durationMin}
          onChange={(e) => setDurationMin(Number(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>5m</span>
          <span className="text-white font-medium">{durationMin}m</span>
          <span>180m</span>
        </div>
      </div>

      {/* RPE picker */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Planned Intensity (RPE 1-10)
        </label>
        <div className="grid grid-cols-10 gap-1 mb-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRpe(value)}
              className={`
                py-2 rounded text-sm font-medium transition-colors
                ${rpe === value
                  ? getRpeColor(value)
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }
              `}
            >
              {value}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Easy</span>
          <span>Moderate</span>
          <span>Max Effort</span>
        </div>
      </div>

      {/* Load preview */}
      <div className="mb-6 p-3 bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Calculated Load</span>
          <span className="text-lg font-bold text-white">{formatLoad(projectedLoad)}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Load = {trainingConfig.loadScore} × ({durationMin}/60) × ({rpe}/3)
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleClose}
          className="flex-1 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg border border-gray-700 hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium"
        >
          Add Session
        </button>
      </div>
    </Modal>
  );
}

function getRpeColor(rpe: number): string {
  if (rpe <= 3) return 'bg-green-600 text-white';
  if (rpe <= 5) return 'bg-yellow-600 text-white';
  if (rpe <= 7) return 'bg-orange-600 text-white';
  return 'bg-red-600 text-white';
}
