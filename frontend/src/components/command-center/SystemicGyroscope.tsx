import { useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import type { SystemicLoad, SystemicPrescription, SystemicLoadState } from '../../api/types';
import { gyroscopeGlow, gyroscopeShake, gyroscopeTiltPulse } from '../../lib/animations';

const SIZE_CONFIG = {
  sm: { dim: 100, labelFs: 7, pctFs: 11, horizonStroke: 2, tickLen: 4, readoutFs: 9, dotR: 2.5 },
  md: { dim: 140, labelFs: 9, pctFs: 14, horizonStroke: 3, tickLen: 5, readoutFs: 10, dotR: 3 },
  lg: { dim: 180, labelFs: 11, pctFs: 17, horizonStroke: 4, tickLen: 7, readoutFs: 12, dotR: 3.5 },
} as const;

interface SystemicGyroscopeProps {
  load: SystemicLoad;
  prescription?: SystemicPrescription;
  size?: 'sm' | 'md' | 'lg';
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

function getHorizonColor(absTilt: number): string {
  if (absTilt <= 8) return '#22c55e';
  if (absTilt <= 18) return '#f97316';
  return '#ef4444';
}

export function SystemicGyroscope({ load, prescription, size = 'sm' }: SystemicGyroscopeProps) {
  const { dim, labelFs, pctFs, horizonStroke, tickLen, readoutFs, dotR } = SIZE_CONFIG[size];
  const r = dim / 2;
  const strokeWidth = 3;
  const innerR = r - strokeWidth * 2;
  const critical = isCritical(load);
  const glowVariant = getGlowVariant(load.state);
  const absTilt = Math.abs(load.tiltDegrees);
  const highTilt = absTilt > 15;
  const horizonColor = getHorizonColor(absTilt);

  // Spring-smoothed tilt for fluid rotation
  const tiltMotionValue = useMotionValue(load.tiltDegrees);
  const smoothTiltSpring = useSpring(tiltMotionValue, { stiffness: 80, damping: 20 });

  useEffect(() => {
    tiltMotionValue.set(load.tiltDegrees);
  }, [load.tiltDegrees, tiltMotionValue]);

  // Animation variant priority: critical shake > high-tilt pulse > glow
  const activeVariants = critical ? gyroscopeShake : highTilt ? gyroscopeTiltPulse : gyroscopeGlow;
  const activeAnimate = critical ? 'shake' : highTilt ? 'pulse' : glowVariant;

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        className={`relative rounded-full ${critical ? 'animate-chromatic-shake' : ''}`}
        style={{ width: dim, height: dim }}
        variants={activeVariants}
        animate={activeAnimate}
      >
        <svg
          width={dim}
          height={dim}
          viewBox={`0 0 ${dim} ${dim}`}
          className="block"
        >
          {/* Outer housing ring — tilt-severity colored */}
          <circle
            cx={r}
            cy={r}
            r={r - strokeWidth / 2}
            fill="none"
            stroke={horizonColor}
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

          {/* Horizon line — spring-smoothed tilt */}
          <motion.g style={{ rotate: smoothTiltSpring, transformOrigin: `${r}px ${r}px`, transformBox: 'fill-box' }}>
            <line
              x1={r - innerR + 4}
              y1={r}
              x2={r + innerR - 4}
              y2={r}
              stroke={horizonColor}
              strokeWidth={horizonStroke}
              strokeLinecap="round"
            />
            <circle cx={r} cy={r} r={dotR} fill={horizonColor} />
          </motion.g>

          {/* Neural label (left) */}
          <text
            x={r - innerR / 2}
            y={r - innerR / 3}
            textAnchor="middle"
            className="fill-zinc-500"
            fontSize={labelFs}
            fontFamily="monospace"
          >
            NEURAL
          </text>
          <text
            x={r - innerR / 2}
            y={r - innerR / 3 + Math.round(pctFs * 0.9)}
            textAnchor="middle"
            fill={load.neuralLoadPct > 70 ? '#ef4444' : load.neuralLoadPct > 50 ? '#f97316' : '#22c55e'}
            fontSize={pctFs}
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
            fontSize={labelFs}
            fontFamily="monospace"
          >
            MECH
          </text>
          <text
            x={r + innerR / 2}
            y={r - innerR / 3 + Math.round(pctFs * 0.9)}
            textAnchor="middle"
            fill={load.mechanicalLoadPct > 70 ? '#ef4444' : load.mechanicalLoadPct > 50 ? '#f97316' : '#22c55e'}
            fontSize={pctFs}
            fontFamily="monospace"
            fontWeight="bold"
          >
            {Math.round(load.mechanicalLoadPct)}%
          </text>

          {/* 12-tick ring (every 30 degrees, major at 0/90/180/270) */}
          {[...Array(12)].map((_, i) => {
            const angle = i * 30;
            const rad = (angle * Math.PI) / 180;
            const isMajor = angle % 90 === 0;
            const outerTick = innerR - 1;
            const innerTick = innerR - (isMajor ? tickLen + 2 : tickLen);
            return (
              <line
                key={angle}
                x1={r + Math.cos(rad) * innerTick}
                y1={r + Math.sin(rad) * innerTick}
                x2={r + Math.cos(rad) * outerTick}
                y2={r + Math.sin(rad) * outerTick}
                stroke={isMajor ? '#52525b' : '#3f3f46'}
                strokeWidth={isMajor ? 1.5 : 0.75}
              />
            );
          })}

          {/* Degree labels at cardinal positions (lg only) */}
          {size === 'lg' && [0, 90, 180, 270].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const labelR = innerR - tickLen - 8;
            return (
              <text
                key={`deg-${angle}`}
                x={r + Math.cos(rad) * labelR}
                y={r + Math.sin(rad) * labelR + 3}
                textAnchor="middle"
                className="fill-zinc-600"
                fontSize={8}
                fontFamily="monospace"
              >
                {angle}°
              </text>
            );
          })}
        </svg>
      </motion.div>

      {/* Digital readouts (md/lg only) */}
      {size !== 'sm' && (
        <div className="flex items-center gap-3 font-mono">
          <div className="text-center">
            <div className="text-zinc-500" style={{ fontSize: readoutFs - 2 }}>TILT</div>
            <div
              className="font-bold tabular-nums"
              style={{ fontSize: readoutFs, color: horizonColor }}
            >
              {load.tiltDegrees > 0 ? '+' : ''}{load.tiltDegrees.toFixed(1)}°
            </div>
          </div>
          <div className="w-px h-4 bg-zinc-700" />
          <div className="text-center">
            <div className="text-zinc-500" style={{ fontSize: readoutFs - 2 }}>IMBAL</div>
            <div
              className="font-bold tabular-nums"
              style={{ fontSize: readoutFs, color: horizonColor }}
            >
              {((load.imbalance ?? 0) * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      )}

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
