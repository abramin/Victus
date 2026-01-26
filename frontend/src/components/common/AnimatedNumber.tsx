import { useEffect, useState } from 'react';
import { animate } from 'framer-motion';

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
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(displayValue, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (latest) => setDisplayValue(latest),
    });

    return () => controls.stop();
  }, [value, duration]);

  return <span className={className}>{formatFn(displayValue)}</span>;
}
