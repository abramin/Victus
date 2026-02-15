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

// === SEMANTIC BODY ANIMATIONS (Phase 4) ===

/**
 * Particle fly animation for semantic tokens flying to Body Map icon.
 * Tokens shrink and fly to target position.
 */
export const particleFly: Variants = {
  initial: {
    scale: 1,
    opacity: 1,
  },
  animate: (target: { x: number; y: number }) => ({
    x: target.x,
    y: target.y,
    scale: 0.1,
    opacity: 0,
    transition: {
      duration: 0.6,
      ease: [0.32, 0.72, 0, 1], // Custom easing for natural arc
    },
  }),
};

/**
 * Receive pulse animation for sidebar icon when particles arrive.
 */
export const iconReceivePulse: Variants = {
  idle: {
    scale: 1,
    filter: 'brightness(1)',
  },
  pulse: {
    scale: [1, 1.3, 1],
    filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)'],
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
};

/**
 * Token highlight glow for detected semantic tokens.
 */
export const tokenHighlight: Variants = {
  idle: {
    boxShadow: '0 0 0 rgba(59, 130, 246, 0)',
  },
  highlighted: {
    boxShadow: [
      '0 0 0 rgba(59, 130, 246, 0)',
      '0 0 8px rgba(59, 130, 246, 0.5)',
      '0 0 4px rgba(59, 130, 246, 0.3)',
    ],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// === MACRO TETRIS ANIMATIONS (Phase 2) ===

/**
 * Ingredient block fly-in from right for MacroStack visualization.
 * Each ingredient animates with spring physics and staggered delay.
 */
export const ingredientFlyIn: Variants = {
  hidden: {
    x: 100,
    opacity: 0,
    scale: 0.8,
  },
  visible: (i: number) => ({
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.12,
      type: 'spring',
      stiffness: 180,
      damping: 18,
    },
  }),
};

/**
 * Stack container for orchestrating ingredient animations.
 */
export const stackContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
};

/**
 * Terminal text line appearance for typewriter effect.
 */
export const terminalLine: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2 },
  },
};

/**
 * Success glow animation for terminal "Solution Found" message.
 */
export const successGlow: Variants = {
  initial: {
    textShadow: '0 0 0 rgba(16, 185, 129, 0)',
  },
  glow: {
    textShadow: [
      '0 0 0 rgba(16, 185, 129, 0)',
      '0 0 10px rgba(16, 185, 129, 0.8)',
      '0 0 5px rgba(16, 185, 129, 0.4)',
    ],
    transition: { duration: 0.5 },
  },
};

// === FUEL MIXTURE ANIMATIONS (Bio-Initialization) ===

/**
 * Liquid fill animation for macro tanks.
 * Uses spring physics for organic fluid feel.
 */
export const liquidFill: Variants = {
  empty: {
    height: 0,
  },
  filled: (fillPercent: number) => ({
    height: `${fillPercent}%`,
    transition: {
      type: 'spring',
      stiffness: 80,
      damping: 15,
    },
  }),
};

/**
 * Overflow warning flicker for tanks exceeding max.
 */
export const overflowFlicker: Variants = {
  idle: {
    opacity: 0,
  },
  warning: {
    opacity: [0.2, 0.5, 0.2],
    transition: {
      duration: 0.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Engage button pulsing glow animation.
 */
export const engagePulse: Variants = {
  idle: {
    boxShadow: '0 0 5px rgba(16, 185, 129, 0.3)',
  },
  pulse: {
    boxShadow: [
      '0 0 5px rgba(16, 185, 129, 0.3)',
      '0 0 30px rgba(16, 185, 129, 0.6)',
      '0 0 5px rgba(16, 185, 129, 0.3)',
    ],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// === CHEF-IN-THE-LOOP ANIMATIONS (Semantic Refiner) ===

/**
 * Pulsing match score indicator for Blueprint Card.
 * Creates a subtle breathing effect to draw attention.
 */
export const matchScorePulse: Variants = {
  idle: { scale: 1, opacity: 1 },
  pulse: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.85, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Glowing instruction box for tactical prep section.
 * Emerald glow effect to distinguish AI-generated content.
 */
export const instructionGlow: Variants = {
  idle: {
    boxShadow: '0 0 0 rgba(16, 185, 129, 0)',
  },
  glow: {
    boxShadow: [
      '0 0 0 rgba(16, 185, 129, 0)',
      '0 0 15px rgba(16, 185, 129, 0.3)',
      '0 0 8px rgba(16, 185, 129, 0.15)',
    ],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Absurdity alert warning animation.
 * Amber pulse with pulsating glow for logistic warnings.
 */
export const absurdityAlertPulse: Variants = {
  idle: {
    opacity: 1,
    boxShadow: '0 0 10px rgba(245, 158, 11, 0.2)',
  },
  warning: {
    opacity: [1, 0.85, 1],
    boxShadow: [
      '0 0 10px rgba(245, 158, 11, 0.2)',
      '0 0 20px rgba(245, 158, 11, 0.5)',
      '0 0 10px rgba(245, 158, 11, 0.2)',
    ],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Typewriter cursor blink animation.
 */
export const cursorBlink: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: [1, 0, 1],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'steps(2)',
    },
  },
};
// === NEURAL CALENDAR ANIMATIONS ===

/**
 * Cell heatmap glow animation for load-based visualization.
 */
export const cellHeatmapGlow: Variants = {
  idle: { boxShadow: 'inset 0 0 0 rgba(255, 255, 255, 0)' },
  glow: (intensity: number) => ({
    boxShadow: `inset 0 0 ${intensity * 20}px rgba(${
      intensity > 0.5 ? '239, 68, 68' : '59, 130, 246'
    }, ${intensity * 0.3})`,
    transition: { duration: 0.3 },
  }),
};

/**
 * Cell hover expansion for meso-tier semantic zoom.
 */
export const cellExpand: Variants = {
  collapsed: {
    scale: 1,
    zIndex: 1,
    boxShadow: 'none',
  },
  expanded: {
    scale: 1.08,
    zIndex: 50,
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
    transition: { type: 'spring', stiffness: 180, damping: 20 },
  },
};

/**
 * Drawer slide animation for Tactical Briefing side panel.
 */
export const drawerSlide: Variants = {
  closed: { 
    x: '100%',
    opacity: 0,
  },
  open: { 
    x: 0, 
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
};

/**
 * Data Ribbon path animation for calendar visualization.
 */
export const ribbonPath: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 0.7,
    transition: { duration: 1.5, ease: 'easeInOut' },
  },
  pulse: {
    opacity: [0.5, 0.8, 0.5],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
};

/**
 * Pulsing border animation for Today cell.
 * Creates a breathing effect with white ↔ emerald color shift.
 */
export const todayPulse: Variants = {
  idle: {
    boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.5)'
  },
  pulse: {
    boxShadow: [
      '0 0 0 1px rgba(255, 255, 255, 0.5)',
      '0 0 0 1px rgba(16, 185, 129, 0.8)',
      '0 0 0 1px rgba(255, 255, 255, 0.5)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Vertical scanline animation for Today cell.
 * Creates a retro CRT monitor effect with continuous vertical movement.
 */
export const todayScanline: Variants = {
  hidden: {
    y: '-100%'
  },
  visible: {
    y: '100%',
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// === TACTICAL KITCHEN ANIMATIONS ===

/**
 * Ring fill glow animation for the holographic plate.
 * Adds a neon glow effect when macros are consumed.
 */
export const ringFillGlow: Variants = {
  idle: { filter: 'drop-shadow(0 0 0 transparent)' },
  glow: {
    filter: 'drop-shadow(0 0 8px currentColor)',
    transition: { duration: 0.3 },
  },
};

/**
 * Ring overflow pulse animation.
 * Pulses red when a macro target is exceeded.
 */
export const ringOverflowPulse: Variants = {
  idle: { opacity: 1 },
  pulse: {
    opacity: [1, 0.6, 1],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Food chip tap feedback animation.
 * Provides visual feedback for tap and double-tap interactions.
 */
export const chipTapFeedback: Variants = {
  idle: { scale: 1 },
  tap: {
    scale: [1, 1.1, 0.95, 1],
    transition: { duration: 0.3 },
  },
  doubleTap: {
    scale: [1, 1.15, 0.9, 1.05, 1],
    boxShadow: [
      '0 0 0 rgba(16, 185, 129, 0)',
      '0 0 20px rgba(16, 185, 129, 0.6)',
      '0 0 0 rgba(16, 185, 129, 0)',
    ],
    transition: { duration: 0.4 },
  },
};

/**
 * Food pill pop-in animation for the plate visualization.
 */
export const foodPillPopIn: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
    },
  },
  exit: {
    scale: 0,
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

// === SYSTEMIC GYROSCOPE ===

export const gyroscopeGlow: Variants = {
  prime: {
    boxShadow: [
      '0 0 8px rgba(34, 197, 94, 0.3)',
      '0 0 18px rgba(34, 197, 94, 0.5)',
      '0 0 8px rgba(34, 197, 94, 0.3)',
    ],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
  },
  warning: {
    boxShadow: [
      '0 0 8px rgba(249, 115, 22, 0.3)',
      '0 0 22px rgba(249, 115, 22, 0.5)',
      '0 0 8px rgba(249, 115, 22, 0.3)',
    ],
    transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
  },
  critical: {
    boxShadow: [
      '0 0 12px rgba(239, 68, 68, 0.4)',
      '0 0 30px rgba(239, 68, 68, 0.7)',
      '0 0 12px rgba(239, 68, 68, 0.4)',
    ],
    transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const gyroscopeShake: Variants = {
  shake: {
    x: [0, -1.5, 1.5, -1, 1, 0],
    transition: {
      duration: 0.4,
      repeat: Infinity,
      repeatDelay: 4,
      ease: 'easeInOut' as const,
    },
  },
};

export const gyroscopeTiltPulse: Variants = {
  idle: { scale: 1 },
  pulse: {
    scale: [1, 1.06, 1],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};
