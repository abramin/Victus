import { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import type { VitalityScore } from '../../api/types';

interface VitalityScoreGaugeProps {
  score: VitalityScore;
}

/**
 * Circular gauge displaying the overall vitality score (0-100).
 * Changes color based on score: red (<50), yellow (50-70), green (>70).
 * Features animated "spin up" effect on mount.
 */
export function VitalityScoreGauge({ score }: VitalityScoreGaugeProps) {
  const percentage = Math.min(100, Math.max(0, score.overall));
  const circumference = 2 * Math.PI * 45; // radius = 45

  // Animated gauge fill
  const [targetPercent, setTargetPercent] = useState(0);

  useEffect(() => {
    // Small delay to sync with section fade-in
    const timer = setTimeout(() => setTargetPercent(percentage), 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  const springValue = useSpring(targetPercent, { stiffness: 50, damping: 20 });
  const strokeOffset = useTransform(
    springValue,
    (v) => circumference - (v / 100) * circumference
  );

  // Determine color based on score
  const getColor = (value: number) => {
    if (value >= 80) return '#10b981'; // emerald-500
    if (value >= 60) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  };

  const strokeColor = getColor(percentage);

  // Get status text
  const getStatusText = (value: number) => {
    if (value >= 80) return 'Excellent';
    if (value >= 60) return 'Good';
    if (value >= 40) return 'Fair';
    return 'Needs Attention';
  };

  return (
    <div className="flex flex-col items-center">
      {/* Circular Gauge */}
      <div className="relative w-32 h-32">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="#1e293b"
            strokeWidth="8"
            fill="none"
          />
          {/* Progress circle - animated spin up */}
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            stroke={strokeColor}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            style={{ strokeDashoffset: strokeOffset }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white">{Math.round(percentage)}</span>
          <span className="text-xs text-slate-400">/ 100</span>
        </div>
      </div>

      {/* Status text */}
      <div className="mt-2 text-center">
        <p className="text-sm font-medium" style={{ color: strokeColor }}>
          {getStatusText(percentage)}
        </p>
        <p className="text-xs text-slate-500">Vitality Score</p>
      </div>

      {/* Breakdown */}
      <div className="mt-4 grid grid-cols-2 gap-3 w-full max-w-xs">
        <ScoreMetric
          label="Meal Adherence"
          value={score.mealAdherence}
          suffix="%"
        />
        <ScoreMetric
          label="Training"
          value={score.trainingAdherence}
          suffix="%"
        />
        <ScoreMetric
          label="Weight Delta"
          value={score.weightDelta}
          suffix=" kg"
          showSign
        />
        <MetabolicTrend trend={score.metabolicFlux.trend} delta={score.metabolicFlux.deltaKcal} />
      </div>
    </div>
  );
}

interface ScoreMetricProps {
  label: string;
  value: number;
  suffix?: string;
  showSign?: boolean;
}

function ScoreMetric({ label, value, suffix = '', showSign }: ScoreMetricProps) {
  const displayValue = showSign && value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);

  return (
    <div className="bg-slate-900/50 rounded-lg p-2 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-white">
        {displayValue}
        {suffix}
      </p>
    </div>
  );
}

interface MetabolicTrendProps {
  trend: 'upregulated' | 'downregulated' | 'stable';
  delta: number;
}

function MetabolicTrend({ trend, delta }: MetabolicTrendProps) {
  const getTrendIcon = () => {
    if (trend === 'upregulated') return '↑';
    if (trend === 'downregulated') return '↓';
    return '→';
  };

  const getTrendColor = () => {
    if (trend === 'upregulated') return 'text-emerald-400';
    if (trend === 'downregulated') return 'text-amber-400';
    return 'text-slate-400';
  };

  return (
    <div className="bg-slate-900/50 rounded-lg p-2 text-center">
      <p className="text-xs text-slate-500">Metabolism</p>
      <p className={`text-sm font-semibold ${getTrendColor()}`}>
        {getTrendIcon()} {delta > 0 ? '+' : ''}{delta} kcal
      </p>
    </div>
  );
}
