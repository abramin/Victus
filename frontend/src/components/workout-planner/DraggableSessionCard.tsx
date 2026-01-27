import { useState } from 'react';
import type { TrainingConfig, TrainingType } from '../../api/types';
import { TRAINING_LABELS, TRAINING_ICONS } from '../../constants';
import { getSessionCategory } from './sessionCategories';

interface DraggableSessionCardProps {
  trainingConfig: TrainingConfig;
  disabled?: boolean;
  isSelected?: boolean;
  onDragStart?: (trainingType: TrainingType, config: TrainingConfig) => void;
  onDragEnd?: () => void;
  onClick?: (trainingType: TrainingType, config: TrainingConfig) => void;
}

/**
 * A draggable "trading card" representing a training type.
 * Features a glowing border colored by category (strength/cardio/recovery/mixed).
 */
export function DraggableSessionCard({
  trainingConfig,
  disabled,
  isSelected,
  onDragStart,
  onDragEnd,
  onClick,
}: DraggableSessionCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const { type, loadScore } = trainingConfig;
  const category = getSessionCategory(type);
  const emoji = TRAINING_ICONS[type];
  const label = TRAINING_LABELS[type];

  // Load indicator bars (0-5 scale)
  const loadBars = Math.min(5, Math.round(loadScore));

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    // Set drag data as JSON
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        type: 'training-session',
        trainingType: type,
        config: trainingConfig
      })
    );
    e.dataTransfer.effectAllowed = 'copy';
    setIsDragging(true);
    onDragStart?.(type, trainingConfig);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnd?.();
  };

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger click if we just finished dragging
    if (isDragging) return;
    e.stopPropagation();
    onClick?.(type, trainingConfig);
  };

  if (disabled) {
    return (
      <div className="w-28 h-32 rounded-xl border-2 border-gray-700 bg-gray-800 opacity-50 cursor-not-allowed p-2.5 relative overflow-hidden">
        <span className="absolute top-2 right-2 text-3xl opacity-10">{emoji}</span>
        <p className="text-sm font-semibold text-white mb-2">{label}</p>
        <LoadIndicator loadBars={loadBars} color={category.color} />
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      className={`
        w-24 h-28 rounded-xl border-2 ${category.borderClass}
        bg-gray-800 cursor-grab active:cursor-grabbing
        p-2 relative overflow-hidden
        transition-all duration-200
        hover:scale-105 hover:shadow-lg
        ${isDragging ? 'opacity-50 scale-105' : ''}
        ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900 scale-105' : ''}
      `}
      style={{
        boxShadow: isDragging || isSelected
          ? `0 0 20px ${category.glowColor}`
          : `0 0 10px ${category.glowColor}`,
      }}
    >
      {/* Large background emoji */}
      <span className="absolute top-2 right-2 text-3xl opacity-15">{emoji}</span>

      {/* Type label */}
      <p className={`text-sm font-semibold text-white mb-2 ${category.textClass}`}>{label}</p>

      {/* Load indicator */}
      <div className="mt-auto">
        <p className="text-[10px] uppercase text-gray-500 mb-1">Load</p>
        <LoadIndicator loadBars={loadBars} color={category.color} />
      </div>

      {/* Drag handle indicator */}
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-50">
        <svg className="w-3 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
        </svg>
      </div>
    </div>
  );
}

function LoadIndicator({ loadBars, color }: { loadBars: number; color: string }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="w-3.5 h-1.5 rounded-sm"
          style={{ backgroundColor: i <= loadBars ? color : '#334155' }}
        />
      ))}
    </div>
  );
}

/**
 * Drag data type for session cards.
 */
export interface SessionDragData {
  type: 'training-session';
  trainingType: TrainingType;
  config: TrainingConfig;
}

/**
 * Parse session drag data from a drag event.
 */
export function parseSessionDragData(e: React.DragEvent): SessionDragData | null {
  try {
    const data = JSON.parse(e.dataTransfer.getData('application/json'));
    if (data?.type === 'training-session') {
      return data as SessionDragData;
    }
  } catch {
    // Invalid JSON or no data
  }
  return null;
}
