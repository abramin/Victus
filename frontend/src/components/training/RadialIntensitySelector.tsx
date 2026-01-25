import { useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';

interface RadialIntensitySelectorProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  disabled?: boolean;
  allowClear?: boolean;
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
 */
export function RadialIntensitySelector({
  value,
  onChange,
  disabled = false,
  allowClear = true,
}: RadialIntensitySelectorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const displayValue = value ?? DEFAULT_RPE;
  const displayLabel = RPE_LABELS[displayValue];
  const scoreColor = getRpeColor(displayValue);

  // SVG dimensions
  const width = 200;
  const height = 120;
  const strokeWidth = 12;
  const centerX = width / 2;
  const centerY = height - 10;
  const radius = Math.min(centerX, centerY) - strokeWidth / 2 - 5;

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
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">Intensity (RPE)</span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-200">
            {displayValue} - {displayLabel}
          </span>
          {allowClear && value !== undefined && (
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="text-xs text-gray-500 hover:text-gray-300"
              disabled={disabled}
            >
              Clear
            </button>
          )}
        </div>
      </div>

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

          {/* Indicator dot */}
          <motion.circle
            cx={scoreX}
            cy={scoreY}
            r={strokeWidth / 2 + 3}
            fill={scoreColor}
            stroke="white"
            strokeWidth={2}
            initial={{ opacity: 0 }}
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

        {/* Tick labels */}
        <div className="flex justify-between w-full px-2 text-[11px] text-gray-500 mt-1">
          <span>Rest</span>
          <span>Easy</span>
          <span>Mod</span>
          <span>Hard</span>
          <span>Max</span>
        </div>
      </div>

      {value === undefined && (
        <p className="text-xs text-gray-500 text-center">Defaulting to {DEFAULT_RPE} (Mod).</p>
      )}
    </div>
  );
}
