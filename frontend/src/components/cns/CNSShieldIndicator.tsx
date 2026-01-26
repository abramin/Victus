import { motion } from 'framer-motion';
import type { CNSStatus, CNSStatusBreakdown } from '../../api/types';
import { breatheAnimation } from '../../lib/animations';

interface CNSShieldIndicatorProps {
  cnsStatus: CNSStatusBreakdown;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

const STATUS_CONFIG: Record<
  CNSStatus,
  {
    label: string;
    integrity: number;
    shieldColor: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    description: string;
  }
> = {
  optimized: {
    label: 'Optimized',
    integrity: 100,
    shieldColor: 'text-green-400',
    bgColor: 'bg-green-900/30',
    borderColor: 'border-green-700',
    textColor: 'text-green-400',
    description: 'CNS fully recovered',
  },
  strained: {
    label: 'Strained',
    integrity: 60,
    shieldColor: 'text-yellow-400',
    bgColor: 'bg-yellow-900/30',
    borderColor: 'border-yellow-700',
    textColor: 'text-yellow-400',
    description: 'CNS under stress',
  },
  depleted: {
    label: 'Depleted',
    integrity: 20,
    shieldColor: 'text-red-400',
    bgColor: 'bg-red-900/30',
    borderColor: 'border-red-700',
    textColor: 'text-red-400',
    description: 'CNS protection active',
  },
};

const SIZE_CONFIG = {
  sm: {
    container: 'w-16 h-16',
    shield: 'w-10 h-10',
    fontSize: 'text-xs',
    labelSize: 'text-xs',
  },
  md: {
    container: 'w-24 h-24',
    shield: 'w-14 h-14',
    fontSize: 'text-sm',
    labelSize: 'text-sm',
  },
  lg: {
    container: 'w-32 h-32',
    shield: 'w-20 h-20',
    fontSize: 'text-base',
    labelSize: 'text-base',
  },
};

function ShieldIcon({ className, status }: { className: string; status: CNSStatus }) {
  // Shield SVG with cracks for strained/depleted states
  const hasCracks = status === 'strained' || status === 'depleted';
  const isShattered = status === 'depleted';

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      {/* Main shield shape */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2L4 6v6c0 5.25 3.5 9.74 8 11 4.5-1.26 8-5.75 8-11V6l-8-4z"
        fill={isShattered ? 'none' : 'currentColor'}
        fillOpacity={0.2}
      />
      {/* Cracks for strained state */}
      {hasCracks && !isShattered && (
        <>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8L10 12L12 11L11 15"
            strokeWidth={1}
            opacity={0.7}
          />
        </>
      )}
      {/* Multiple cracks for depleted state */}
      {isShattered && (
        <>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6L9 10L12 9L10 14"
            strokeWidth={1}
            opacity={0.8}
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14 8L15 11L13 12L14 16"
            strokeWidth={1}
            opacity={0.8}
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 9L7 13"
            strokeWidth={1}
            opacity={0.6}
          />
        </>
      )}
    </svg>
  );
}

export function CNSShieldIndicator({
  cnsStatus,
  size = 'md',
  showDetails = true,
}: CNSShieldIndicatorProps) {
  const config = STATUS_CONFIG[cnsStatus.status];
  const sizeConfig = SIZE_CONFIG[size];
  const deviationPercent = Math.round(cnsStatus.deviationPct * 100);
  const deviationSign = deviationPercent >= 0 ? '+' : '';

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Shield with integrity ring */}
      <div className={`relative ${sizeConfig.container} flex items-center justify-center`}>
        {/* Background ring showing integrity with breathing animation */}
        <motion.svg
          className="absolute inset-0 w-full h-full -rotate-90"
          animate={breatheAnimation}
        >
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-gray-700"
          />
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray={`${config.integrity * 2.83} 283`}
            className={config.shieldColor}
          />
        </motion.svg>
        {/* Shield icon */}
        <ShieldIcon className={`${sizeConfig.shield} ${config.shieldColor}`} status={cnsStatus.status} />
      </div>

      {/* Status label */}
      <div className="text-center">
        <span className={`font-medium ${sizeConfig.labelSize} ${config.textColor}`}>
          {config.label}
        </span>
        {showDetails && (
          <div className={`${sizeConfig.fontSize} text-gray-400 mt-0.5`}>
            HRV {cnsStatus.currentHrv}ms ({deviationSign}{deviationPercent}%)
          </div>
        )}
      </div>
    </div>
  );
}

// Compact inline version for use in cards
export function CNSStatusBadge({ status }: { status: CNSStatus }) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.borderColor} border`}
    >
      <ShieldIcon className={`w-3.5 h-3.5 ${config.shieldColor}`} status={status} />
      <span className={config.textColor}>{config.label}</span>
    </span>
  );
}
