import type { ReactNode, HTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { hoverGlow } from '../../lib/animations';

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Title shown at the top of the panel */
  title?: string;
  /** Optional subtitle shown below the title */
  subtitle?: string;
  /** Content to render inside the panel */
  children: ReactNode;
  /** Additional CSS classes for the container */
  className?: string;
  /** Padding size variant */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Enable hover lift/glow effect */
  interactive?: boolean;
}

const PADDING_CLASSES = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-8',
} as const;

/**
 * Panel is the standard container component for sections in the app.
 * It provides consistent styling with dark background, rounded corners, and border.
 */
export function Panel({
  title,
  subtitle,
  children,
  className = '',
  padding = 'md',
  interactive = false,
  ...rest
}: PanelProps) {
  const baseClassName = `bg-gray-900 rounded-xl border border-gray-800 ${PADDING_CLASSES[padding]} ${className}`;

  const content = (
    <>
      {(title || subtitle) && (
        <div className={title || subtitle ? 'mb-4' : ''}>
          {title && <h3 className="text-sm font-medium text-white">{title}</h3>}
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </>
  );

  if (interactive) {
    // Don't spread HTML attributes into motion.div to avoid type conflicts
    return (
      <motion.div className={baseClassName} whileHover={hoverGlow}>
        {content}
      </motion.div>
    );
  }

  return (
    <div className={baseClassName} {...rest}>
      {content}
    </div>
  );
}
