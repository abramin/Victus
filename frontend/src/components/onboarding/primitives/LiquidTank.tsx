import { useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface LiquidTankProps {
  label: string;
  value: number;
  maxValue: number;
  color: 'purple' | 'blue' | 'amber';
  onChange: (value: number) => void;
  unit?: string;
}

const COLOR_MAP = {
  purple: {
    fill: '#a855f7',
    glow: 'rgba(168, 85, 247, 0.4)',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
  },
  blue: {
    fill: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.4)',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
  },
  amber: {
    fill: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.4)',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
};

export function LiquidTank({
  label,
  value,
  maxValue,
  color,
  onChange,
  unit = 'g',
}: LiquidTankProps) {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const colorConfig = COLOR_MAP[color];

  // Calculate fill percentage (capped at 100%)
  const fillPercent = Math.min((value / maxValue) * 100, 100);
  const isOverflow = value > maxValue;

  // Handle pointer drag to adjust value
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateValueFromPointer(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    updateValueFromPointer(e);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const updateValueFromPointer = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const tankTop = rect.top + 16; // Account for padding
    const tankHeight = rect.height - 32; // Account for padding
    const pointerY = e.clientY;

    // Calculate percentage (inverted because Y increases downward)
    const percent = 1 - (pointerY - tankTop) / tankHeight;
    const clampedPercent = Math.max(0, Math.min(1, percent));
    const newValue = Math.round(clampedPercent * maxValue);
    onChange(newValue);
  };

  // Handle direct input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value) || 0;
    onChange(Math.max(0, newValue));
  };

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      {/* Label */}
      <div className={`font-mono text-xs tracking-wider ${colorConfig.text}`}>
        {label}
      </div>

      {/* The Glass Tube */}
      <div
        ref={containerRef}
        className={`relative w-16 h-48 bg-slate-900 rounded-full border-2 ${colorConfig.border} overflow-hidden cursor-ns-resize touch-none`}
        style={{
          boxShadow: isDragging ? `0 0 20px ${colorConfig.glow}` : 'none',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* The Liquid */}
        <motion.div
          className="absolute bottom-0 w-full"
          style={{
            backgroundColor: colorConfig.fill,
            opacity: 0.85,
          }}
          initial={{ height: 0 }}
          animate={{
            height: `${fillPercent}%`,
            filter: isOverflow ? 'brightness(1.3)' : 'brightness(1)',
          }}
          transition={{
            type: 'spring',
            stiffness: 80,
            damping: 15,
          }}
        >
          {/* Wave texture at liquid surface */}
          <div
            className="absolute top-0 left-0 right-0 h-3"
            style={{
              background: `linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%)`,
            }}
          />

          {/* Gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </motion.div>

        {/* Measurement tick marks */}
        <div className="absolute inset-0 flex flex-col justify-between py-4 px-1 pointer-events-none">
          {[100, 75, 50, 25, 0].map((percent) => (
            <div
              key={percent}
              className="flex items-center justify-end w-full"
            >
              <div className="h-[1px] w-3 bg-slate-600/50" />
            </div>
          ))}
        </div>

        {/* Overflow warning overlay */}
        {isOverflow && (
          <motion.div
            className="absolute inset-0 bg-red-500/20 pointer-events-none"
            animate={{
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </div>

      {/* Value display and input */}
      <div className="flex flex-col items-center gap-1">
        <input
          type="number"
          value={value}
          onChange={handleInputChange}
          className={`w-20 px-2 py-1 bg-slate-900/80 border ${
            isOverflow ? 'border-red-500/50' : colorConfig.border
          } rounded text-center font-mono text-lg text-white focus:outline-none focus:ring-1 ${
            isOverflow ? 'focus:ring-red-500/50' : 'focus:ring-white/30'
          }`}
        />
        <span className="font-mono text-xs text-slate-500">{unit}</span>
      </div>

      {/* Overflow warning */}
      {isOverflow && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-mono text-xs text-red-400 text-center"
        >
          OVERFLOW
        </motion.div>
      )}
    </div>
  );
}
