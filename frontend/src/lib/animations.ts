import type { Variants, Transition } from 'framer-motion';

// === TRANSITIONS ===

export const springBounce: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 20,
};

export const springGentle: Transition = {
  type: 'spring',
  stiffness: 100,
  damping: 15,
};

// === CONTAINER VARIANTS ===

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

// === ITEM VARIANTS ===

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.3 },
  },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  show: {
    opacity: 1,
    x: 0,
    transition: springBounce,
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

// === BREATHING ANIMATION ===
// For continuous "alive" effects on health rings/indicators

export const breatheAnimation = {
  scale: [1, 1.02, 1],
  opacity: [0.9, 1, 0.9],
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: 'easeInOut' as const,
  },
};

// === HOVER STATES ===

export const hoverLift = {
  y: -2,
  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
  borderColor: 'rgba(255, 255, 255, 0.1)',
  transition: { duration: 0.2 },
};

export const hoverGlow = {
  boxShadow: '0 0 20px rgba(255, 255, 255, 0.1)',
  borderColor: 'rgba(255, 255, 255, 0.15)',
  transition: { duration: 0.2 },
};

// === MUSCLE ANIMATION VARIANTS ===
// For Neural OS body map visualization

/**
 * Gentle pulse for fatigued muscles (60-85% fatigue)
 * Simulates blood flow / working tissue
 */
export const musclePulse: Variants = {
  idle: { scale: 1 },
  pulse: {
    scale: [1, 1.02, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Rapid pulse for overreached muscles (>85% fatigue)
 * More pronounced to signal warning state
 */
export const muscleOverreachPulse: Variants = {
  idle: { scale: 1 },
  pulse: {
    scale: [1, 1.04, 1],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Glow intensity animation for inflammation effect
 */
export const muscleGlow: Variants = {
  idle: { filter: 'brightness(1)' },
  glow: {
    filter: ['brightness(1)', 'brightness(1.2)', 'brightness(1)'],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Color morph transition for organic color changes
 * Use with useSpring for physics-based interpolation
 */
export const colorMorphTransition: Transition = {
  type: 'spring',
  stiffness: 50,
  damping: 20,
  mass: 1,
};

// === PLANNER ANIMATIONS ===
// For Workout Planner interactions

/**
 * Shiver effect for adjacent day cards when a session is dropped nearby.
 * Creates a ripple-like awareness effect.
 */
export const shiverAnimation: Variants = {
  idle: { x: 0 },
  shiver: {
    x: [0, -1, 1, -0.5, 0.5, 0],
    transition: { duration: 0.3, ease: 'easeInOut' },
  },
};

/**
 * Pulse animation for drop zone when receiving a session.
 */
export const dropReceivePulse: Variants = {
  idle: { scale: 1, boxShadow: '0 0 0 rgba(59, 130, 246, 0)' },
  pulse: {
    scale: [1, 1.02, 1],
    boxShadow: [
      '0 0 0 rgba(59, 130, 246, 0)',
      '0 0 20px rgba(59, 130, 246, 0.4)',
      '0 0 0 rgba(59, 130, 246, 0)',
    ],
    transition: { duration: 0.4 },
  },
};

/**
 * Stagger container for Smart Fill card dealing animation.
 * Faster stagger for dramatic card-dealing effect.
 */
export const dealingStagger: Variants = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

/**
 * Card dealing animation for Smart Fill feature.
 * Cards fly from deck position to their target day.
 */
export const cardDealVariants: Variants = {
  initial: {
    y: 100,
    scale: 0.8,
    opacity: 0,
    rotateZ: -5,
  },
  animate: {
    y: 0,
    scale: 1,
    opacity: 1,
    rotateZ: 0,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 20,
    },
  },
  exit: {
    y: -20,
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

/**
 * Selection ring animation for click-to-select cards.
 */
export const selectionRing: Variants = {
  unselected: {
    boxShadow: '0 0 0 0 rgba(255, 255, 255, 0)',
  },
  selected: {
    boxShadow: [
      '0 0 0 0 rgba(255, 255, 255, 0)',
      '0 0 0 4px rgba(255, 255, 255, 0.3)',
      '0 0 0 2px rgba(255, 255, 255, 0.5)',
    ],
    transition: { duration: 0.3 },
  },
};
