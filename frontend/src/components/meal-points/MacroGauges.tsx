import { motion } from 'framer-motion';
import type { MacroPoints } from '../../api/types';
import type { MacroSpent, MacroRemaining, GhostPreview } from './types';

type MacroType = 'protein' | 'carbs' | 'fats';
type FilterTab = 'all' | 'carb' | 'protein' | 'fat';

const MACRO_CONFIG: Record<
  MacroType,
  {
    label: string;
    shortLabel: string;
    fillColor: string;
    trackColor: string;
    textColor: string;
    ghostColor: string;
  }
> = {
  protein: {
    label: 'Protein',
    shortLabel: 'PROT',
    fillColor: 'bg-purple-500',
    trackColor: 'bg-purple-500/20',
    textColor: 'text-purple-400',
    ghostColor: 'bg-purple-300/50',
  },
  carbs: {
    label: 'Carbs',
    shortLabel: 'CARB',
    fillColor: 'bg-orange-500',
    trackColor: 'bg-orange-500/20',
    textColor: 'text-orange-400',
    ghostColor: 'bg-orange-300/50',
  },
  fats: {
    label: 'Fats',
    shortLabel: 'FAT',
    fillColor: 'bg-gray-400',
    trackColor: 'bg-gray-500/20',
    textColor: 'text-gray-400',
    ghostColor: 'bg-gray-300/50',
  },
};

interface MacroGaugeProps {
  macro: MacroType;
  target: number;
  spent: number;
  ghostPoints?: number;
  ghostOverflow?: boolean;
  variant: 'compact' | 'hero';
}

function MacroGauge({
  macro,
  target,
  spent,
  ghostPoints,
  ghostOverflow,
  variant,
}: MacroGaugeProps) {
  const config = MACRO_CONFIG[macro];
  const remaining = Math.max(0, target - spent);
  const fillPercent = target > 0 ? Math.min(100, (spent / target) * 100) : 0;

  // Ghost fills from where current fill ends
  const ghostPercent =
    ghostPoints && target > 0
      ? Math.min(100 - fillPercent, (ghostPoints / target) * 100)
      : 0;
  const overflowPercent =
    ghostOverflow && ghostPoints && target > 0
      ? Math.max(0, ((ghostPoints - remaining) / target) * 100)
      : 0;

  const isCompact = variant === 'compact';

  return (
    <div className={isCompact ? '' : 'space-y-2'}>
      {/* Bar Container */}
      <div className="flex items-center gap-2">
        {/* Label (compact only) */}
        {isCompact && (
          <span className={`text-xs font-medium w-10 ${config.textColor}`}>
            {config.shortLabel}
          </span>
        )}

        {/* Progress Bar */}
        <div
          className={`relative flex-1 overflow-hidden rounded-full ${config.trackColor} ${
            isCompact ? 'h-5' : 'h-8'
          }`}
        >
          {/* Filled Segment */}
          <motion.div
            className={`absolute inset-y-0 left-0 ${config.fillColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${fillPercent}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />

          {/* Ghost Segment (fits) */}
          {ghostPoints !== undefined && ghostPercent > 0 && !ghostOverflow && (
            <motion.div
              className={`absolute inset-y-0 ${config.ghostColor}`}
              style={{ left: `${fillPercent}%` }}
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: `${ghostPercent}%`, opacity: 0.7 }}
              transition={{ duration: 0.15 }}
            />
          )}

          {/* Ghost Segment (overflow) */}
          {ghostOverflow && ghostPoints !== undefined && (
            <>
              {/* Part that fits */}
              <motion.div
                className={`absolute inset-y-0 ${config.ghostColor}`}
                style={{ left: `${fillPercent}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${100 - fillPercent}%` }}
                transition={{ duration: 0.15 }}
              />
              {/* Overflow indicator */}
              <motion.div
                className="absolute inset-y-0 right-0 bg-red-500/70 w-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            </>
          )}

          {/* Glow effect when ghost fits */}
          {ghostPoints !== undefined && !ghostOverflow && ghostPercent > 0 && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ boxShadow: 'inset 0 0 0 0 transparent' }}
              animate={{
                boxShadow: `inset 0 0 8px 2px ${
                  macro === 'protein'
                    ? 'rgba(168, 85, 247, 0.3)'
                    : macro === 'carbs'
                      ? 'rgba(249, 115, 22, 0.3)'
                      : 'rgba(156, 163, 175, 0.3)'
                }`,
              }}
              transition={{ duration: 0.2 }}
              style={{ borderRadius: '9999px' }}
            />
          )}
        </div>

        {/* Remaining Number */}
        <span
          className={`text-sm font-semibold tabular-nums ${
            remaining === 0
              ? 'text-emerald-400'
              : ghostOverflow
                ? 'text-red-400'
                : config.textColor
          } ${isCompact ? 'w-8 text-right' : 'w-10 text-right'}`}
        >
          {remaining}
        </span>
      </div>

      {/* Hero mode: additional info below bar */}
      {!isCompact && (
        <div className="text-center">
          <div
            className={`text-2xl font-bold ${
              remaining === 0
                ? 'text-emerald-400'
                : ghostOverflow
                  ? 'text-red-400'
                  : config.textColor
            }`}
          >
            {remaining} pts remaining
          </div>
          <div className="text-sm text-gray-500">of {target} {config.label} Points</div>
        </div>
      )}
    </div>
  );
}

interface MacroGaugesProps {
  targets: MacroPoints | null;
  spent: MacroSpent;
  activeFilter: FilterTab;
  ghostPreview?: GhostPreview | null;
  className?: string;
}

export function MacroGauges({
  targets,
  spent,
  activeFilter,
  ghostPreview,
  className = '',
}: MacroGaugesProps) {
  if (!targets) {
    return (
      <div className={`text-gray-400 text-sm text-center py-2 ${className}`}>
        No targets available
      </div>
    );
  }

  // Map filter tab to hero macro
  const heroMacro: MacroType | null =
    activeFilter === 'protein'
      ? 'protein'
      : activeFilter === 'carb'
        ? 'carbs'
        : activeFilter === 'fat'
          ? 'fats'
          : null;

  // Hero mode: single large gauge
  if (heroMacro) {
    return (
      <motion.div
        className={className}
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <MacroGauge
          macro={heroMacro}
          target={targets[heroMacro]}
          spent={spent[heroMacro]}
          ghostPoints={
            ghostPreview?.macroType === heroMacro
              ? ghostPreview.pointsToConsume
              : undefined
          }
          ghostOverflow={
            ghostPreview?.macroType === heroMacro
              ? ghostPreview.wouldOverflow
              : undefined
          }
          variant="hero"
        />
      </motion.div>
    );
  }

  // All mode: three compact gauges
  const macros: MacroType[] = ['protein', 'carbs', 'fats'];

  return (
    <div className={`space-y-2 ${className}`}>
      {macros.map((macro) => (
        <MacroGauge
          key={macro}
          macro={macro}
          target={targets[macro]}
          spent={spent[macro]}
          ghostPoints={
            ghostPreview?.macroType === macro
              ? ghostPreview.pointsToConsume
              : undefined
          }
          ghostOverflow={
            ghostPreview?.macroType === macro
              ? ghostPreview.wouldOverflow
              : undefined
          }
          variant="compact"
        />
      ))}
    </div>
  );
}
