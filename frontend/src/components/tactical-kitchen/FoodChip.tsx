import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { FoodReference, FoodCategory } from '../../api/types';
import { DEFAULT_SERVING_G } from './useTacticalKitchenState';

const DOUBLE_TAP_THRESHOLD = 300; // ms
const LONG_PRESS_THRESHOLD = 500; // ms

const CATEGORY_EMOJI: Record<FoodCategory, string> = {
  high_protein: '🥩',
  high_carb: '🍚',
  high_fat: '🥑',
  vegetable: '🥬',
  fruit: '🍎',
};

const CATEGORY_COLORS: Record<FoodCategory, string> = {
  high_protein: 'border-purple-500/40',
  high_carb: 'border-orange-500/40',
  high_fat: 'border-gray-500/40',
  vegetable: 'border-green-500/40',
  fruit: 'border-pink-500/40',
};

interface FoodChipProps {
  food: FoodReference;
  onTap: () => void;
  onDoubleTap: () => void;
  onLongPress: () => void;
}

export function FoodChip({ food, onTap, onDoubleTap, onLongPress }: FoodChipProps) {
  const [lastTap, setLastTap] = useState(0);
  const [isPressed, setIsPressed] = useState(false);
  const [tapCount, setTapCount] = useState<1 | 2 | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const tapTimeout = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggered = useRef(false);

  const clearTimers = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (tapTimeout.current) {
      clearTimeout(tapTimeout.current);
      tapTimeout.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(() => {
    setIsPressed(true);
    longPressTriggered.current = false;

    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      onLongPress();
      setIsPressed(false);
    }, LONG_PRESS_THRESHOLD);
  }, [onLongPress]);

  const handlePointerUp = useCallback(() => {
    clearTimers();
    setIsPressed(false);

    if (longPressTriggered.current) {
      return;
    }

    const now = Date.now();
    const timeSinceLastTap = now - lastTap;

    if (timeSinceLastTap < DOUBLE_TAP_THRESHOLD) {
      // Double tap detected
      setTapCount(2);
      onDoubleTap();
      setLastTap(0);
      setTimeout(() => setTapCount(null), 300);
    } else {
      // Wait to see if another tap comes
      tapTimeout.current = setTimeout(() => {
        setTapCount(1);
        onTap();
        setTimeout(() => setTapCount(null), 300);
      }, DOUBLE_TAP_THRESHOLD);
      setLastTap(now);
    }
  }, [lastTap, onTap, onDoubleTap, clearTimers]);

  const handlePointerLeave = useCallback(() => {
    clearTimers();
    setIsPressed(false);
    longPressTriggered.current = false;
  }, [clearTimers]);

  const displayName = food.foodItem.length > 10
    ? food.foodItem.substring(0, 10) + '…'
    : food.foodItem;

  return (
    <motion.button
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
      animate={{
        scale: isPressed ? 0.95 : tapCount ? [1, 1.1, 1] : 1,
        boxShadow: tapCount === 2
          ? ['0 0 0 rgba(16, 185, 129, 0)', '0 0 20px rgba(16, 185, 129, 0.6)', '0 0 0 rgba(16, 185, 129, 0)']
          : '0 0 0 rgba(0, 0, 0, 0)',
      }}
      transition={{ duration: 0.2 }}
      className={`
        relative flex flex-col items-center justify-center
        w-20 h-20 rounded-xl
        bg-slate-800/80 border-2 ${CATEGORY_COLORS[food.category]}
        select-none touch-none
        active:bg-slate-700/80
        transition-colors
      `}
      style={{ WebkitTouchCallout: 'none' }}
    >
      {/* Tap indicator */}
      {tapCount && (
        <motion.span
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold"
        >
          +{tapCount}
        </motion.span>
      )}

      <span className="text-2xl">{CATEGORY_EMOJI[food.category]}</span>
      <span className="text-[11px] text-white font-medium truncate w-full px-1 text-center mt-1">
        {displayName}
      </span>
      <span className="text-[9px] text-slate-500">{DEFAULT_SERVING_G}g</span>
    </motion.button>
  );
}
