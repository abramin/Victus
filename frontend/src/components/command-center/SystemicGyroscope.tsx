import { motion } from 'framer-motion';
import type { SystemicLoad, SystemicPrescription, SystemicLoadState } from '../../api/types';
import { gyroscopeGlow, gyroscopeShake } from '../../lib/animations';

interface SystemicGyroscopeProps {
  load: SystemicLoad;
  prescription?: SystemicPrescription;
  size?: 'sm' | 'md';
}

function getGlowVariant(state: SystemicLoadState): 'prime' | 'warning' | 'critical' {
  switch (state) {
    case 'prime_state':
      return 'prime';
    case 'system_critical':
      return 'critical';
    default:
      return 'warning';
  }
}

function isCritical(load: SystemicLoad): boolean {
  return load.state === 'system_critical' || Math.abs(load.tiltDegrees) > 30;
}

export function SystemicGyroscope({ load, prescription, size = 'sm' }: SystemicGyroscopeProps) {
  const dim = size === 'sm' ? 100 : 140;
  const r = dim / 2;
  const strokeWidth = 3;
  const innerR = r - strokeWidth * 2;
  const critical = isCritical(load);
  const glowVariant = getGlowVariant(load.state);

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        className={`relative rounded-full ${critical ? 'animate-chromatic-shake' : ''}`}
        style={{ width: dim, height: dim }}
        variants={gyroscopeGlow}
        animate={glowVariant}
        {...(critical ? { variants: gyroscopeShake, animate: 'shake' } : {})}
      >
        <svg
          width={dim}
          height={dim}
          viewBox={`0 0 ${dim} ${dim}`}
          className="block"
        >
          {/* Outer housing ring */}
          <circle
            cx={r}
            cy={r}
            r={r - strokeWidth / 2}
            fill="none"
            stroke={load.statusColor}
            strokeWidth={strokeWidth}
            strokeOpacity={0.4}
          />

          {/* Inner dark fill */}
          <circle
            cx={r}
            cy={r}
            r={innerR}
            fill="#0f1419"
          />

          {/* Horizon line — tilts based on load imbalance */}
          <g transform={`rotate(${load.tiltDegrees}, ${r}, ${r})`}>
            <line
              x1={r - innerR + 6}
              y1={r}
              x2={r + innerR - 6}
              y2={r}
              stroke={load.statusColor}
              strokeWidth={2}
              strokeLinecap="round"
            />
            {/* Small center indicator dot */}
            <circle cx={r} cy={r} r={2.5} fill={load.statusColor} />
          </g>

          {/* Neural label (left) */}
          <text
            x={r - innerR / 2}
            y={r - innerR / 3}
            textAnchor="middle"
            className="fill-zinc-500"
            fontSize={size === 'sm' ? 7 : 9}
            fontFamily="monospace"
          >
            NEURAL
          </text>
          <text
            x={r - innerR / 2}
            y={r - innerR / 3 + (size === 'sm' ? 10 : 13)}
            textAnchor="middle"
            fill={load.neuralLoadPct > 70 ? '#ef4444' : load.neuralLoadPct > 50 ? '#f97316' : '#22c55e'}
            fontSize={size === 'sm' ? 11 : 14}
            fontFamily="monospace"
            fontWeight="bold"
          >
            {Math.round(load.neuralLoadPct)}%
          </text>

          {/* Mechanical label (right) */}
          <text
            x={r + innerR / 2}
            y={r - innerR / 3}
            textAnchor="middle"
            className="fill-zinc-500"
            fontSize={size === 'sm' ? 7 : 9}
            fontFamily="monospace"
          >
            MECH
          </text>
          <text
            x={r + innerR / 2}
            y={r - innerR / 3 + (size === 'sm' ? 10 : 13)}
            textAnchor="middle"
            fill={load.mechanicalLoadPct > 70 ? '#ef4444' : load.mechanicalLoadPct > 50 ? '#f97316' : '#22c55e'}
            fontSize={size === 'sm' ? 11 : 14}
            fontFamily="monospace"
            fontWeight="bold"
          >
            {Math.round(load.mechanicalLoadPct)}%
          </text>

          {/* Tick marks at 0, 90, 180, 270 degrees */}
          {[0, 90, 180, 270].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const outerTick = innerR - 1;
            const innerTick = innerR - 5;
            return (
              <line
                key={angle}
                x1={r + Math.cos(rad) * innerTick}
                y1={r + Math.sin(rad) * innerTick}
                x2={r + Math.cos(rad) * outerTick}
                y2={r + Math.sin(rad) * outerTick}
                stroke="#3f3f46"
                strokeWidth={1}
              />
            );
          })}
        </svg>
      </motion.div>

      {/* Status label */}
      <div className="text-center">
        <div
          className="text-[9px] font-mono tracking-widest font-semibold"
          style={{ color: load.statusColor }}
        >
          {load.statusLabel}
        </div>
        {prescription && (
          <div className="text-[8px] text-zinc-500 font-mono mt-0.5">
            {prescription.prescriptionName}
          </div>
        )}
      </div>
    </div>
  );
}
