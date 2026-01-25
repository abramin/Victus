import { motion } from 'framer-motion';
import { useMemo } from 'react';
import type { FastingProtocol } from '../../api/types';

interface MetabolicTimerProps {
  protocol: FastingProtocol;
  eatingWindowStart: string; // HH:MM format
  eatingWindowEnd: string; // HH:MM format
  currentTime?: Date; // For testing - defaults to now
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CONFIG = {
  sm: { diameter: 120, strokeWidth: 8, fontSize: 14, timeSize: 20 },
  md: { diameter: 160, strokeWidth: 10, fontSize: 16, timeSize: 28 },
  lg: { diameter: 200, strokeWidth: 12, fontSize: 18, timeSize: 36 },
};

interface FastingState {
  isFasting: boolean;
  minutesFasted: number;
  minutesUntilChange: number;
  progressPercent: number;
  windowOpensAt: string;
  windowClosesAt: string;
}

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

function formatTime(hours: number, minutes: number): string {
  const h = hours % 12 || 12;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  return `${h}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function calculateFastingState(
  protocol: FastingProtocol,
  eatingWindowStart: string,
  eatingWindowEnd: string,
  currentTime: Date
): FastingState {
  // Standard protocol - always eating window
  if (protocol === 'standard') {
    return {
      isFasting: false,
      minutesFasted: 0,
      minutesUntilChange: 0,
      progressPercent: 100,
      windowOpensAt: eatingWindowStart,
      windowClosesAt: eatingWindowEnd,
    };
  }

  const start = parseTime(eatingWindowStart);
  const end = parseTime(eatingWindowEnd);
  const now = { hours: currentTime.getHours(), minutes: currentTime.getMinutes() };

  // Convert to minutes since midnight for easier calculation
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;
  const nowMinutes = now.hours * 60 + now.minutes;

  // Determine eating window duration
  let eatingWindowDuration: number;
  if (endMinutes > startMinutes) {
    eatingWindowDuration = endMinutes - startMinutes;
  } else {
    eatingWindowDuration = (24 * 60 - startMinutes) + endMinutes;
  }

  const fastingWindowDuration = 24 * 60 - eatingWindowDuration;

  // Check if currently in eating window
  let isInEatingWindow: boolean;
  if (endMinutes > startMinutes) {
    isInEatingWindow = nowMinutes >= startMinutes && nowMinutes < endMinutes;
  } else {
    // Eating window crosses midnight
    isInEatingWindow = nowMinutes >= startMinutes || nowMinutes < endMinutes;
  }

  const isFasting = !isInEatingWindow;

  let minutesUntilChange: number;
  let minutesFasted: number;
  let progressPercent: number;

  if (isFasting) {
    // Calculate minutes until eating window opens
    if (nowMinutes < startMinutes) {
      minutesUntilChange = startMinutes - nowMinutes;
    } else {
      minutesUntilChange = (24 * 60 - nowMinutes) + startMinutes;
    }

    // Calculate how long we've been fasting
    if (nowMinutes >= endMinutes) {
      minutesFasted = nowMinutes - endMinutes;
    } else {
      minutesFasted = (24 * 60 - endMinutes) + nowMinutes;
    }

    // Progress through fasting window (0% = just started, 100% = about to end)
    progressPercent = (minutesFasted / fastingWindowDuration) * 100;
  } else {
    // In eating window - calculate minutes until fasting starts
    if (endMinutes > nowMinutes) {
      minutesUntilChange = endMinutes - nowMinutes;
    } else {
      minutesUntilChange = (24 * 60 - nowMinutes) + endMinutes;
    }

    minutesFasted = 0;

    // Progress through eating window (0% = just started, 100% = about to end)
    let minutesInEating: number;
    if (nowMinutes >= startMinutes) {
      minutesInEating = nowMinutes - startMinutes;
    } else {
      minutesInEating = (24 * 60 - startMinutes) + nowMinutes;
    }
    progressPercent = (minutesInEating / eatingWindowDuration) * 100;
  }

  return {
    isFasting,
    minutesFasted,
    minutesUntilChange,
    progressPercent,
    windowOpensAt: formatTime(start.hours, start.minutes),
    windowClosesAt: formatTime(end.hours, end.minutes),
  };
}

export function MetabolicTimer({
  protocol,
  eatingWindowStart,
  eatingWindowEnd,
  currentTime = new Date(),
  size = 'md',
}: MetabolicTimerProps) {
  const config = SIZE_CONFIG[size];
  const { diameter, strokeWidth, fontSize, timeSize } = config;

  const state = useMemo(
    () => calculateFastingState(protocol, eatingWindowStart, eatingWindowEnd, currentTime),
    [protocol, eatingWindowStart, eatingWindowEnd, currentTime]
  );

  // Don't show for standard protocol
  if (protocol === 'standard') {
    return null;
  }

  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - state.progressPercent / 100);

  const centerX = diameter / 2;
  const centerY = diameter / 2;

  // Colors based on state
  const primaryColor = state.isFasting ? '#3b82f6' : '#22c55e'; // blue-500 or green-500
  const bgColor = state.isFasting ? '#1e3a5f' : '#14532d'; // darker versions

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: diameter, height: diameter }}>
        <svg width={diameter} height={diameter} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke="#334155"
            strokeWidth={strokeWidth}
          />

          {/* Progress arc */}
          <motion.circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill="none"
            stroke={primaryColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Pulsing indicator for fasting state */}
          {state.isFasting && (
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div
                className="rounded-full"
                style={{
                  width: diameter - strokeWidth * 4,
                  height: diameter - strokeWidth * 4,
                  background: `radial-gradient(circle, ${bgColor}40 0%, transparent 70%)`,
                }}
              />
            </motion.div>
          )}

          {/* Time display */}
          <span
            className="font-bold text-white"
            style={{ fontSize: timeSize }}
          >
            {state.isFasting ? formatDuration(state.minutesFasted) : formatDuration(state.minutesUntilChange)}
          </span>

          {/* Status label */}
          <span
            className="uppercase tracking-wider font-medium"
            style={{ fontSize: fontSize * 0.7, color: primaryColor }}
          >
            {state.isFasting ? 'Fasted' : 'Remaining'}
          </span>
        </div>
      </div>

      {/* Status text below */}
      <div className="mt-3 text-center space-y-1">
        <div
          className="text-xs uppercase tracking-wider font-medium"
          style={{ color: primaryColor }}
        >
          {state.isFasting ? 'Fasting Window' : 'Eating Window'}
        </div>
        <div className="text-sm text-slate-400">
          {state.isFasting ? (
            <>Window opens at {state.windowOpensAt}</>
          ) : (
            <>Window closes at {state.windowClosesAt}</>
          )}
        </div>
        {state.isFasting && state.minutesUntilChange > 0 && (
          <div className="text-xs text-slate-500">
            {formatDuration(state.minutesUntilChange)} until eating window
          </div>
        )}
      </div>
    </div>
  );
}
