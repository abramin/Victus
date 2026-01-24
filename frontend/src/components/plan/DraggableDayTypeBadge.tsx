import { motion } from 'framer-motion';
import type { DayType } from '../../api/types';
import { DAY_TYPE_COLORS, DAY_TYPE_LABELS } from '../../constants';

interface DraggableDayTypeBadgeProps {
  dayType: DayType;
  date: string;
  isPast: boolean;
  isDragging?: boolean;
  onDragStart?: (date: string, dayType: DayType) => void;
  onDragEnd?: () => void;
}

/**
 * A day type badge that can be dragged to other calendar cells.
 * Only future days can be dragged; past days are read-only.
 */
export function DraggableDayTypeBadge({
  dayType,
  date,
  isPast,
  isDragging = false,
  onDragStart,
  onDragEnd,
}: DraggableDayTypeBadgeProps) {
  const colors = DAY_TYPE_COLORS[dayType];
  const label = DAY_TYPE_LABELS[dayType];

  // Past days are not draggable
  if (isPast) {
    return (
      <div
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${colors.bg} text-white opacity-70`}
      >
        {label}
      </div>
    );
  }

  return (
    <motion.div
      drag
      dragSnapToOrigin
      dragElastic={0.1}
      dragMomentum={false}
      onDragStart={() => onDragStart?.(date, dayType)}
      onDragEnd={() => onDragEnd?.()}
      whileDrag={{
        scale: 1.1,
        zIndex: 100,
        boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
      }}
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium cursor-grab active:cursor-grabbing ${
        colors.bg
      } text-white ${isDragging ? 'opacity-50' : ''}`}
      style={{ touchAction: 'none' }}
    >
      {label}
      {/* Drag handle indicator */}
      <svg
        className="w-2.5 h-2.5 ml-1 opacity-50"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
      </svg>
    </motion.div>
  );
}

interface DropTargetIndicatorProps {
  isActive: boolean;
  isValid: boolean;
}

/**
 * Visual indicator shown on cells when a drag operation is active.
 */
export function DropTargetIndicator({ isActive, isValid }: DropTargetIndicatorProps) {
  if (!isActive) return null;

  return (
    <div
      className={`absolute inset-0 pointer-events-none transition-colors ${
        isValid
          ? 'bg-blue-500/20 ring-2 ring-blue-500/50 ring-inset'
          : 'bg-red-500/10 ring-2 ring-red-500/30 ring-inset'
      }`}
    />
  );
}
