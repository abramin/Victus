import type { TrainingConfig, TrainingType } from '../../api/types';
import { DraggableSessionCard } from './DraggableSessionCard';
import { SESSION_CATEGORIES } from './sessionCategories';

interface SessionDeckProps {
  configs: TrainingConfig[];
  loading?: boolean;
  selectedSession?: { type: TrainingType; config: TrainingConfig } | null;
  onDragStart?: (trainingType: TrainingType, config: TrainingConfig) => void;
  onDragEnd?: () => void;
  onSelectSession?: (trainingType: TrainingType, config: TrainingConfig) => void;
}

/**
 * The "Deck" - a grouped grid of training type cards.
 * Cards are organized by category: Strength, Cardio, Recovery, Mixed.
 * Supports both drag-to-add and click-to-select interactions.
 */
export function SessionDeck({
  configs,
  loading,
  selectedSession,
  onDragStart,
  onDragEnd,
  onSelectSession,
}: SessionDeckProps) {
  if (loading) {
    return (
      <div className="bg-gray-900 border-t border-gray-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold text-sm">Session Library</h3>
          <span className="text-gray-500 text-xs">Loading...</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="w-24 h-28 rounded-xl bg-gray-800 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  // Group configs by category
  const groupedConfigs: { category: (typeof SESSION_CATEGORIES)[keyof typeof SESSION_CATEGORIES]; key: string; configs: TrainingConfig[] }[] = [
    {
      category: SESSION_CATEGORIES.strength,
      key: 'strength',
      configs: configs.filter((c) => SESSION_CATEGORIES.strength.types.includes(c.type)),
    },
    {
      category: SESSION_CATEGORIES.cardio,
      key: 'cardio',
      configs: configs.filter((c) => SESSION_CATEGORIES.cardio.types.includes(c.type)),
    },
    {
      category: SESSION_CATEGORIES.recovery,
      key: 'recovery',
      configs: configs.filter((c) => SESSION_CATEGORIES.recovery.types.includes(c.type)),
    },
    {
      category: SESSION_CATEGORIES.mixed,
      key: 'mixed',
      configs: configs.filter((c) => SESSION_CATEGORIES.mixed.types.includes(c.type)),
    },
  ].filter((g) => g.configs.length > 0);

  return (
    <div className="bg-gray-900 border-t border-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold text-sm">Session Library</h3>
        <span className="text-gray-500 text-xs">
          {selectedSession ? 'Click a day to place' : 'Drag or click to select'}
        </span>
      </div>

      <div className="space-y-3">
        {groupedConfigs.map(({ category, key, configs: categoryConfigs }) => (
          <div key={key}>
            {/* Category header */}
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                {category.label}
              </span>
            </div>

            {/* Grid of cards */}
            <div className="flex flex-wrap gap-2">
              {categoryConfigs.map((config) => (
                <DraggableSessionCard
                  key={config.type}
                  trainingConfig={config}
                  isSelected={selectedSession?.type === config.type}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onClick={onSelectSession}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
