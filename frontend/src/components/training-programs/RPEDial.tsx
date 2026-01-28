/**
 * Semi-circular RPE gauge (1–10 scale) with color zones.
 * Green (1–4), Yellow (5–6), Orange (7–8), Red (9–10).
 * Tap-zone interaction: each RPE value has an invisible clickable arc segment.
 */

interface RPEDialProps {
  value: number;
  onChange: (rpe: number) => void;
  readOnly?: boolean;
}

const RPE_LABELS: Record<string, string> = {
  1: 'Easy', 2: 'Easy', 3: 'Easy', 4: 'Easy',
  5: 'Moderate', 6: 'Moderate',
  7: 'Hard', 8: 'Hard',
  9: 'Max', 10: 'Max',
};

function zoneColor(rpe: number): string {
  if (rpe <= 4) return '#22c55e';
  if (rpe <= 6) return '#eab308';
  if (rpe <= 8) return '#f97316';
  return '#ef4444';
}

// Arc geometry helpers
const CX = 60;
const CY = 60;
const R = 46;
const START_ANGLE = -180; // degrees, 0 = right, -180 = left (top of semicircle)
const SWEEP = 180; // semicircle spans 180°

function polarToCartesian(angleDeg: number, radius: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: CX + radius * Math.cos(rad),
    y: CY + radius * Math.sin(rad),
  };
}

function arcPath(startAngle: number, endAngle: number, outerR: number, innerR: number) {
  const s1 = polarToCartesian(startAngle, outerR);
  const e1 = polarToCartesian(endAngle, outerR);
  const s2 = polarToCartesian(endAngle, innerR);
  const e2 = polarToCartesian(startAngle, innerR);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${s1.x} ${s1.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${e1.x} ${e1.y}`,
    `L ${s2.x} ${s2.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${e2.x} ${e2.y}`,
    'Z',
  ].join(' ');
}

export function RPEDial({ value, onChange, readOnly = false }: RPEDialProps) {
  const clampedValue = Math.max(1, Math.min(10, Math.round(value)));

  // Divide the 180° arc into 10 equal segments
  const segmentSpan = SWEEP / 10;

  // Build zone arcs (4 color zones) for the background track
  const zones = [
    { min: 1, max: 4, color: '#22c55e' },
    { min: 5, max: 6, color: '#eab308' },
    { min: 7, max: 8, color: '#f97316' },
    { min: 9, max: 10, color: '#ef4444' },
  ];

  // Needle/indicator position (center of the current RPE segment)
  const indicatorAngle = START_ANGLE + (clampedValue - 0.5) * segmentSpan;
  const indicatorPos = polarToCartesian(indicatorAngle, R);

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="70" viewBox="0 0 120 120" className="overflow-visible">
        {/* Background zone arcs */}
        {zones.map((zone) => {
          const startAngle = START_ANGLE + (zone.min - 1) * segmentSpan;
          const endAngle = START_ANGLE + zone.max * segmentSpan;
          return (
            <path
              key={zone.min}
              d={arcPath(startAngle, endAngle, R + 2, R - 8)}
              fill={zone.color}
              opacity="0.25"
            />
          );
        })}

        {/* Active fill up to current value */}
        {clampedValue >= 1 && (() => {
          const endAngle = START_ANGLE + clampedValue * segmentSpan;
          return (
            <path
              d={arcPath(START_ANGLE, endAngle, R + 2, R - 8)}
              fill={zoneColor(clampedValue)}
              opacity="0.7"
            />
          );
        })()}

        {/* Tick marks */}
        {Array.from({ length: 11 }, (_, i) => {
          const angle = START_ANGLE + i * segmentSpan;
          const outer = polarToCartesian(angle, R + 4);
          const inner = polarToCartesian(angle, R - 10);
          return (
            <line
              key={`tick-${i}`}
              x1={outer.x} y1={outer.y}
              x2={inner.x} y2={inner.y}
              stroke="#475569"
              strokeWidth="1"
            />
          );
        })}

        {/* Indicator dot */}
        <circle
          cx={indicatorPos.x}
          cy={indicatorPos.y}
          r="5"
          fill={zoneColor(clampedValue)}
          stroke="#1e293b"
          strokeWidth="2"
        />

        {/* Invisible tap targets (one per RPE value) */}
        {!readOnly && Array.from({ length: 10 }, (_, i) => {
          const rpe = i + 1;
          const startAngle = START_ANGLE + i * segmentSpan;
          const endAngle = START_ANGLE + (i + 1) * segmentSpan;
          return (
            <path
              key={`tap-${rpe}`}
              d={arcPath(startAngle, endAngle, R + 6, R - 14)}
              fill="transparent"
              className="cursor-pointer"
              onClick={() => onChange(rpe)}
            />
          );
        })}
      </svg>

      {/* Center label (below arc) */}
      <div className="mt-0.5 text-center">
        <span className="text-lg font-bold" style={{ color: zoneColor(clampedValue) }}>{clampedValue}</span>
        <span className="text-xs text-slate-500 ml-1">{RPE_LABELS[clampedValue]}</span>
      </div>
    </div>
  );
}
