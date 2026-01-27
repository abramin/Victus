import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TrainingType, TrainingConfig } from '../../api/types';
import { cardDealVariants } from '../../lib/animations';
import { TRAINING_ICONS, TRAINING_LABELS } from '../../constants';
import { getSessionCategory } from './sessionCategories';

/**
 * Smart Fill schedule - balanced weekly distribution.
 * Each day maps to a training type with default duration and RPE.
 */
const SMART_FILL_SCHEDULE: {
  dayOffset: number;
  trainingType: TrainingType;
  durationMin: number;
  rpe: number;
}[] = [
  { dayOffset: 0, trainingType: 'strength', durationMin: 60, rpe: 7 },      // Monday
  { dayOffset: 1, trainingType: 'run', durationMin: 30, rpe: 6 },          // Tuesday
  { dayOffset: 2, trainingType: 'mobility', durationMin: 30, rpe: 4 },     // Wednesday (Recovery)
  { dayOffset: 3, trainingType: 'calisthenics', durationMin: 45, rpe: 7 }, // Thursday
  { dayOffset: 4, trainingType: 'row', durationMin: 30, rpe: 6 },          // Friday
  { dayOffset: 5, trainingType: 'hiit', durationMin: 25, rpe: 8 },         // Saturday
  // Sunday: Rest (no session)
];

interface SmartFillButtonProps {
  weekDates: string[];
  configs: TrainingConfig[];
  onFillComplete: (sessions: { date: string; trainingType: TrainingType; durationMin: number; rpe: number; loadScore: number }[]) => void;
  disabled?: boolean;
}

interface FlyingCard {
  id: string;
  trainingType: TrainingType;
  dayOffset: number;
}

/**
 * Smart Fill button with card-dealing animation.
 * Generates a balanced weekly workout schedule with animated card placement.
 */
export function SmartFillButton({
  weekDates,
  configs,
  onFillComplete,
  disabled,
}: SmartFillButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [flyingCards, setFlyingCards] = useState<FlyingCard[]>([]);

  const handleSmartFill = useCallback(() => {
    if (isAnimating || disabled) return;

    // Start animation
    setIsAnimating(true);

    // Create flying cards for animation
    const cards: FlyingCard[] = SMART_FILL_SCHEDULE.map((item, index) => ({
      id: `smart-fill-${index}-${Date.now()}`,
      trainingType: item.trainingType,
      dayOffset: item.dayOffset,
    }));

    setFlyingCards(cards);

    // After animation completes, trigger the actual fill
    const animationDuration = cards.length * 80 + 500; // stagger + settle time
    setTimeout(() => {
      // Prepare sessions with load scores from configs
      const sessions = SMART_FILL_SCHEDULE.map((item) => {
        const config = configs.find((c) => c.type === item.trainingType);
        const loadScore = config?.loadScore ?? 3; // Default load score
        return {
          date: weekDates[item.dayOffset],
          trainingType: item.trainingType,
          durationMin: item.durationMin,
          rpe: item.rpe,
          loadScore,
        };
      }).filter((s) => s.date); // Filter out undefined dates

      onFillComplete(sessions);
      setFlyingCards([]);
      setIsAnimating(false);
    }, animationDuration);
  }, [isAnimating, disabled, weekDates, configs, onFillComplete]);

  return (
    <div className="relative">
      {/* Main button */}
      <motion.button
        onClick={handleSmartFill}
        disabled={disabled || isAnimating}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`
          flex items-center gap-2 px-4 py-2
          bg-gradient-to-r from-purple-600 to-blue-600
          hover:from-purple-500 hover:to-blue-500
          text-white font-medium text-sm rounded-lg
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          shadow-lg shadow-purple-500/20
        `}
      >
        <svg
          className={`w-4 h-4 ${isAnimating ? 'animate-spin' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isAnimating ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          )}
        </svg>
        {isAnimating ? 'Filling...' : 'Smart Fill'}
      </motion.button>

      {/* Flying cards overlay */}
      <AnimatePresence>
        {flyingCards.length > 0 && (
          <div className="fixed inset-0 pointer-events-none z-50">
            {flyingCards.map((card, index) => {
              const category = getSessionCategory(card.trainingType);
              const emoji = TRAINING_ICONS[card.trainingType];
              const label = TRAINING_LABELS[card.trainingType];

              return (
                <motion.div
                  key={card.id}
                  variants={cardDealVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  custom={index}
                  transition={{
                    delay: index * 0.08,
                  }}
                  className={`
                    absolute left-1/2 bottom-20
                    w-20 h-24 rounded-lg
                    bg-gray-800 border-2 ${category.borderClass}
                    flex flex-col items-center justify-center
                    shadow-lg
                  `}
                  style={{
                    boxShadow: `0 0 20px ${category.glowColor}`,
                    // Offset each card slightly for visual spread
                    transform: `translateX(${(index - 3) * 30}px)`,
                  }}
                >
                  <span className="text-2xl mb-1">{emoji}</span>
                  <span className="text-[10px] text-white font-medium truncate px-1">
                    {label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
