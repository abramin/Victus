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
