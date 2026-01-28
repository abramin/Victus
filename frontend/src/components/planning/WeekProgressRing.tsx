import { motion } from 'framer-motion';

interface WeekProgressRingProps {
  daysLogged: number;
  totalDays?: number;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CONFIG = {
  sm: { diameter: 60, strokeWidth: 6, fontSize: 14 },
  md: { diameter: 80, strokeWidth: 8, fontSize: 18 },
  lg: { diameter: 100, strokeWidth: 10, fontSize: 22 },
};

export function WeekProgressRing({
  daysLogged,
  totalDays = 7,
  size = 'md',
}: WeekProgressRingProps) {
  const config = SIZE_CONFIG[size];
  const { diameter, strokeWidth, fontSize } = config;

  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const centerX = diameter / 2;
  const centerY = diameter / 2;

  // Calculate segment angle (360 / 7 = 51.43 degrees per day)
  const segmentAngle = 360 / totalDays;
  const gapAngle = 3; // Gap between segments in degrees

  // Generate segments
  const segments = Array.from({ length: totalDays }, (_, i) => {
    const isLogged = i < daysLogged;
    const startAngle = i * segmentAngle - 90; // -90 to start at top
    const endAngle = startAngle + segmentAngle - gapAngle;

    // Convert angles to radians
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    // Calculate arc path
    const startX = centerX + radius * Math.cos(startRad);
    const startY = centerY + radius * Math.sin(startRad);
    const endX = centerX + radius * Math.cos(endRad);
    const endY = centerY + radius * Math.sin(endRad);

    const largeArcFlag = segmentAngle - gapAngle > 180 ? 1 : 0;

    const pathD = `
      M ${centerX} ${centerY}
      L ${startX} ${startY}
      A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}
      Z
    `;

    return {
      id: i,
      pathD,
      isLogged,
    };
  });

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={diameter} height={diameter} viewBox={`0 0 ${diameter} ${diameter}`}>
        <defs>
          {/* Glow filter for logged segments */}
          <filter id="segmentGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-800"
        />

        {/* Segments */}
        {segments.map((segment, index) => (
          <motion.path
            key={segment.id}
            d={segment.pathD}
            fill={segment.isLogged ? '#10b981' : '#334155'}
            className={segment.isLogged ? 'drop-shadow-lg' : ''}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              delay: index * 0.05,
              duration: 0.3,
              type: 'spring',
              stiffness: 200,
              damping: 15,
            }}
            style={{
              transformOrigin: `${centerX}px ${centerY}px`,
              filter: segment.isLogged ? 'url(#segmentGlow)' : 'none',
            }}
          />
        ))}

        {/* Center text - Days logged */}
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="currentColor"
          fontSize={fontSize}
          fontWeight="bold"
          className="text-slate-100 font-mono select-none"
        >
          {daysLogged}/{totalDays}
        </text>
      </svg>

      <div className="text-xs text-slate-400">Days Logged</div>
    </div>
  );
}
