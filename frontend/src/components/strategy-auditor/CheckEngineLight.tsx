import { motion } from 'framer-motion';
import type { AuditSeverity } from '../../api/types';

interface CheckEngineLightProps {
  severity?: AuditSeverity;
  hasMismatch: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Check Engine Light indicator.
 * Shows off (gray), amber (warning), or red (critical) based on audit status.
 */
export function CheckEngineLight({
  severity,
  hasMismatch,
  onClick,
  className = '',
}: CheckEngineLightProps) {
  // Determine light state
  const isOff = !hasMismatch;
  const isWarning = hasMismatch && severity === 'warning';
  const isCritical = hasMismatch && severity === 'critical';

  // Get colors based on state
  const getColors = () => {
    if (isOff) {
      return {
        bg: 'bg-gray-800',
        ring: 'ring-gray-700',
        glow: '',
        text: 'text-gray-500',
      };
    }
    if (isCritical) {
      return {
        bg: 'bg-red-600',
        ring: 'ring-red-500',
        glow: 'shadow-[0_0_12px_rgba(239,68,68,0.5)]',
        text: 'text-red-400',
      };
    }
    // Warning
    return {
      bg: 'bg-amber-500',
      ring: 'ring-amber-400',
      glow: 'shadow-[0_0_12px_rgba(245,158,11,0.5)]',
      text: 'text-amber-400',
    };
  };

  const colors = getColors();

  return (
    <button
      onClick={onClick}
      disabled={isOff}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-lg
        transition-all duration-200
        ${isOff ? 'cursor-default opacity-60' : 'cursor-pointer hover:opacity-90'}
        ${className}
      `}
      title={
        isOff
          ? 'No strategy mismatches detected'
          : isCritical
            ? 'Critical strategy mismatch!'
            : 'Strategy mismatch detected'
      }
    >
      {/* Engine icon with light */}
      <div className="relative">
        <motion.div
          className={`
            w-4 h-4 rounded-full ${colors.bg} ${colors.glow}
            ring-2 ${colors.ring}
          `}
          animate={
            hasMismatch
              ? {
                  scale: [1, 1.1, 1],
                  opacity: [1, 0.8, 1],
                }
              : {}
          }
          transition={
            hasMismatch
              ? {
                  duration: isCritical ? 0.8 : 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }
              : {}
          }
        />
      </div>

      {/* Label */}
      <span className={`text-xs font-medium ${colors.text}`}>
        {isOff ? 'OK' : isCritical ? 'ALERT' : 'CHECK'}
      </span>

      {/* Chevron indicator when there's something to click */}
      {hasMismatch && (
        <svg
          className={`w-3 h-3 ${colors.text}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </button>
  );
}
