import type { TrainingConfig, TrainingType } from '../../api/types';
import { DraggableSessionCard } from './DraggableSessionCard';
import { SESSION_CATEGORIES } from './sessionCategories';

interface SessionDeckProps {
  configs: TrainingConfig[];
  loading?: boolean;
  onDragStart?: (trainingType: TrainingType, config: TrainingConfig) => void;
  onDragEnd?: () => void;
}

/**
 * The "Deck" - a horizontal scrollable drawer containing all training type cards.
 * Cards are grouped by category: Strength, Cardio, Recovery, Mixed.
 */
export function SessionDeck({ configs, loading, onDragStart, onDragEnd }: SessionDeckProps) {
  if (loading) {
    return (
      <div className="bg-gray-900 border-t border-gray-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">Session Library</h3>
          <span className="text-gray-500 text-sm">Loading...</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-28 h-32 rounded-xl bg-gray-800 animate-pulse flex-shrink-0"
            />
          ))}
        </div>
      </div>
    );
  }

  // Group configs by category
  const strengthConfigs = configs.filter((c) =>
    SESSION_CATEGORIES.strength.types.includes(c.type)
  );
  const cardioConfigs = configs.filter((c) =>
    SESSION_CATEGORIES.cardio.types.includes(c.type)
  );
  const recoveryConfigs = configs.filter((c) =>
    SESSION_CATEGORIES.recovery.types.includes(c.type)
  );
  const mixedConfigs = configs.filter((c) =>
    SESSION_CATEGORIES.mixed.types.includes(c.type)
  );

  // Combine in display order: strength, cardio, recovery, mixed
  const sortedConfigs = [
    ...strengthConfigs,
    ...cardioConfigs,
    ...recoveryConfigs,
    ...mixedConfigs
  ];

  return (
    <div className="bg-gray-900 border-t border-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">Session Library</h3>
        <span className="text-gray-500 text-sm">Drag to calendar</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
        {sortedConfigs.map((config) => (
          <div key={config.type} className="flex-shrink-0">
            <DraggableSessionCard
              trainingConfig={config}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
