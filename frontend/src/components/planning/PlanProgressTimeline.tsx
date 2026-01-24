import React from 'react';
import { motion } from 'framer-motion';

interface PlanProgressTimelineProps {
  startDate: string;
  endDate: string;
  currentWeek: number;
  totalWeeks: number;
  startWeightKg: number;
  currentWeightKg: number;
  targetWeightKg: number;
}

export const PlanProgressTimeline: React.FC<PlanProgressTimelineProps> = ({
  currentWeek,
  totalWeeks,
  startWeightKg,
  currentWeightKg,
  targetWeightKg,
}) => {
  const weeksRemaining = totalWeeks - currentWeek;
  const weightLost = startWeightKg - currentWeightKg;
  const progressPercent = Math.min(100, Math.max(0, (currentWeek / totalWeeks) * 100));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      {/* Timeline Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-500">Plan Progress</div>
        <div className="flex gap-4 text-sm">
          <span className="text-green-600 font-medium">
            {weightLost.toFixed(1)} kg lost
          </span>
          <span className="text-gray-500">
            {weeksRemaining} weeks remaining
          </span>
        </div>
      </div>

      {/* Visual Timeline */}
      <div className="relative">
        {/* Background Track */}
        <div className="h-2 bg-gray-100 rounded-full">
          {/* Progress Bar */}
          <motion.div
            data-testid="progress-bar"
            className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>

        {/* Current Position Indicator */}
        <motion.div
          data-testid="current-position"
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-orange-500 border-2 border-white rounded-full shadow-md"
          initial={{ left: 0 }}
          animate={{ left: `calc(${progressPercent}% - 8px)` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />

        {/* Milestone Markers */}
        <div className="absolute inset-x-0 top-0 flex justify-between pointer-events-none">
          {/* Start Marker */}
          <div className="w-3 h-3 bg-gray-300 rounded-full -mt-0.5" />
          
          {/* 25% Marker */}
          <div className="w-2 h-2 bg-gray-200 rounded-full" style={{ marginLeft: '25%' }} />
          
          {/* 50% Marker */}
          <div className="w-2 h-2 bg-gray-200 rounded-full" />
          
          {/* 75% Marker */}
          <div className="w-2 h-2 bg-gray-200 rounded-full" style={{ marginRight: '25%' }} />
          
          {/* End Marker */}
          <div className="w-3 h-3 bg-green-400 rounded-full -mt-0.5" />
        </div>
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-3 text-xs">
        <div className="text-center">
          <div className="text-gray-400">Start</div>
          <div className="font-medium text-gray-600">{startWeightKg} kg</div>
        </div>
        
        <div className="text-center">
          <div className="text-orange-500 font-medium">You Are Here</div>
          <div className="font-bold text-gray-800">{currentWeightKg} kg</div>
        </div>
        
        <div className="text-center">
          <div className="text-gray-400">Goal</div>
          <div className="font-medium text-green-600">{targetWeightKg} kg</div>
        </div>
      </div>
    </div>
  );
};

export default PlanProgressTimeline;
