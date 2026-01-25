import { useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';

interface RadialIntensitySelectorProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  disabled?: boolean;
}

const DEFAULT_RPE = 5;

const RPE_LABELS: Record<number, string> = {
  1: 'Rest',
  2: 'Easy',
  3: 'Easy',
  4: 'Mod',
  5: 'Mod',
  6: 'Mod',
  7: 'Hard',
  8: 'Hard',
  9: 'Max',
  10: 'Max',
};

// Tick mark positions and labels
const TICK_POSITIONS = [1, 3, 5, 7, 9];
const TICK_LABELS: Record<number, string> = {
  3: 'Easy',
  5: 'Mod',
  7: 'Hard',
};

function getRpeColor(rpe: number): string {
  if (rpe <= 3) return '#60a5fa'; // blue-400
  if (rpe <= 6) return '#a78bfa'; // purple-400
  if (rpe <= 8) return '#f472b6'; // pink-400
  return '#ef4444'; // red-500
}

function getRpeGradientId(rpe: number): string {
  if (rpe <= 3) return 'rpeGlowBlue';
  if (rpe <= 6) return 'rpeGlowPurple';
  if (rpe <= 8) return 'rpeGlowPink';
  return 'rpeGlowRed';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Semi-circle radial gauge for selecting RPE (Rate of Perceived Exertion) 1-10.
 * Features interactive drag to set value with color-coded glow effect.
 * Tick marks anchor the labels visually to the arc.
 */
export function RadialIntensitySelector({
  value,
  onChange,
  disabled = false,
}: RadialIntensitySelectorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const displayValue = value ?? DEFAULT_RPE;
  const displayLabel = RPE_LABELS[displayValue];
  const scoreColor = getRpeColor(displayValue);

  // SVG dimensions - sized to contain the arc and all labels within bounds
  const width = 220;
  const height = 165;
  const strokeWidth = 12;
  const centerX = width / 2;
  const centerY = 70;
  const radius = 60;

  // Arc geometry (half circle from left to right)
  const startAngle = Math.PI; // 180 degrees (left)
  const endAngle = 0; // 0 degrees (right)

  const startX = centerX + radius * Math.cos(startAngle);
  const startY = centerY + radius * Math.sin(startAngle);
  const endX = centerX + radius * Math.cos(endAngle);
  const endY = centerY + radius * Math.sin(endAngle);

  const arcPath = `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`;

  // Calculate filled arc based on RPE (1-10 maps to 0-180 degrees)
  const scoreNormalized = (displayValue - 1) / 9; // 0-1 range
  const scoreAngle = Math.PI * (1 - scoreNormalized);
  const scoreX = centerX + radius * Math.cos(scoreAngle);
  const scoreY = centerY + radius * Math.sin(scoreAngle);

  // Circumference and dash offset
  const circumference = Math.PI * radius;
  const scoreDashLength = circumference * scoreNormalized;

  // Calculate tick mark positions
  const getTickPosition = (rpe: number) => {
    const normalized = (rpe - 1) / 9;
    const angle = Math.PI * (1 - normalized);
    const innerRadius = radius - strokeWidth / 2 - 2;
    const outerRadius = radius + strokeWidth / 2 + 4;
    const labelRadius = radius + strokeWidth / 2 + 20;

    return {
      innerX: centerX + innerRadius * Math.cos(angle),
      innerY: centerY + innerRadius * Math.sin(angle),
      outerX: centerX + outerRadius * Math.cos(angle),
      outerY: centerY + outerRadius * Math.sin(angle),
      labelX: centerX + labelRadius * Math.cos(angle),
      labelY: centerY + labelRadius * Math.sin(angle),
      angle,
    };
  };

  // Convert pointer position to RPE value
  const pointerToRpe = useCallback((clientX: number, clientY: number): number => {
    if (!svgRef.current) return displayValue;

    const rect = svgRef.current.getBoundingClientRect();
    const svgCenterX = rect.left + centerX;
    const svgCenterY = rect.top + centerY;

    const x = clientX - svgCenterX;
    const y = clientY - svgCenterY;

    // Calculate angle from center (atan2 returns -PI to PI)
    let angle = Math.atan2(-y, x); // Negate y for SVG coordinate system

    // Clamp angle to valid range (0 to PI for the semi-circle)
    angle = clamp(angle, 0, Math.PI);

    // Map angle to RPE: PI (left) = 1, 0 (right) = 10
    const normalized = 1 - (angle / Math.PI);
    const rpe = Math.round(1 + normalized * 9);

    return clamp(rpe, 1, 10);
  }, [displayValue, centerX, centerY]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(true);
    const rpe = pointerToRpe(e.clientX, e.clientY);
    onChange(rpe);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [disabled, pointerToRpe, onChange]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || disabled) return;
    const rpe = pointerToRpe(e.clientX, e.clientY);
    onChange(rpe);
  }, [isDragging, disabled, pointerToRpe, onChange]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  return (
    <div className="flex flex-col items-center">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={`overflow-visible ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ touchAction: 'none' }}
      >
        {/* Gradient definitions for glow effects */}
        <defs>
          <radialGradient id="rpeGlowBlue" cx="50%" cy="100%" r="80%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
          </radialGradient>
          <radialGradient id="rpeGlowPurple" cx="50%" cy="100%" r="80%">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
          </radialGradient>
          <radialGradient id="rpeGlowPink" cx="50%" cy="100%" r="80%">
            <stop offset="0%" stopColor="#f472b6" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#f472b6" stopOpacity={0} />
          </radialGradient>
          <radialGradient id="rpeGlowRed" cx="50%" cy="100%" r="80%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
          </radialGradient>
          <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="35%" stopColor="#a78bfa" />
            <stop offset="70%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>

        {/* Background glow */}
        <ellipse
          cx={centerX}
          cy={centerY}
          rx={radius + 30}
          ry={radius + 20}
          fill={`url(#${getRpeGradientId(displayValue)})`}
        />

        {/* Background arc (grey) */}
        <path
          d={arcPath}
          fill="none"
          stroke="#334155"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Tick marks */}
        {TICK_POSITIONS.map((rpe) => {
          const pos = getTickPosition(rpe);
          return (
            <line
              key={`tick-${rpe}`}
              x1={pos.innerX}
              y1={pos.innerY}
              x2={pos.outerX}
              y2={pos.outerY}
              stroke="#64748b"
              strokeWidth={2}
              strokeLinecap="round"
            />
          );
        })}

        {/* Tick labels positioned above arc */}
        {Object.entries(TICK_LABELS).map(([rpeStr, label]) => {
          const rpe = parseInt(rpeStr);
          const pos = getTickPosition(rpe);
          return (
            <text
              key={`label-${rpe}`}
              x={pos.labelX}
              y={pos.labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#64748b"
              fontSize={10}
              className="select-none pointer-events-none"
            >
              {label}
            </text>
          );
        })}

        {/* Colored arc based on value */}
        <motion.path
          d={arcPath}
          fill="none"
          stroke="url(#arcGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - scoreDashLength }}
          transition={{ duration: isDragging ? 0.05 : 0.3, ease: 'easeOut' }}
        />

        {/* Touch target (invisible, 44px for accessibility) */}
        <motion.circle
          r={22}
          fill="transparent"
          className={disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}
          initial={{ cx: scoreX, cy: scoreY }}
          animate={{ cx: scoreX, cy: scoreY }}
          transition={{ duration: isDragging ? 0.05 : 0.3, ease: 'easeOut' }}
        />

        {/* Visible indicator dot */}
        <motion.circle
          r={strokeWidth / 2 + 3}
          fill={scoreColor}
          stroke="white"
          strokeWidth={2}
          className="pointer-events-none"
          initial={{ opacity: 0, cx: scoreX, cy: scoreY }}
          animate={{ opacity: 1, cx: scoreX, cy: scoreY }}
          transition={{ duration: isDragging ? 0.05 : 0.3, ease: 'easeOut' }}
          style={{ filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.5))' }}
        />

        {/* Center text - RPE Value */}
        <text
          x={centerX}
          y={centerY - 16}
          textAnchor="middle"
          fill={scoreColor}
          fontSize={28}
          fontWeight="bold"
          className="select-none pointer-events-none"
        >
          {displayValue}
        </text>

        {/* Center text - Label */}
        <text
          x={centerX}
          y={centerY + 4}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={12}
          className="select-none pointer-events-none"
        >
          {displayLabel}
        </text>
      </svg>

      {value === undefined && (
        <p className="text-xs text-gray-500 text-center mt-1">Defaulting to {DEFAULT_RPE} (Mod)</p>
      )}
    </div>
  );
}
