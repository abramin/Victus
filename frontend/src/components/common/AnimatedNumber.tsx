import { useEffect, useRef } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedNumberProps {
  /** The target value to animate to */
  value: number;
  /** Animation duration in seconds (default 0.8) */
  duration?: number;
  /** Custom format function (default: locale string with rounding) */
  formatFn?: (value: number) => string;
  /** Additional CSS classes */
  className?: string;
}

const defaultFormat = (v: number) => Math.round(v).toLocaleString();

/**
 * AnimatedNumber displays a number that animates from 0 to the target value.
 * On subsequent value changes, it smoothly transitions to the new value.
 */
export function AnimatedNumber({
  value,
  duration = 0.8,
  formatFn = defaultFormat,
  className,
}: AnimatedNumberProps) {
  const spring = useSpring(0, {
    stiffness: 100 / duration,
    damping: 20,
  });

  const display = useTransform(spring, formatFn);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      // Animate from 0 on first render
      spring.set(value);
      isFirstRender.current = false;
    } else {
      // Animate to new value on subsequent changes
      spring.set(value);
    }
  }, [value, spring]);

  return <motion.span className={className}>{display}</motion.span>;
}
