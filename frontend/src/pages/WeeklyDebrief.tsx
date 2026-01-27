import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWeeklyDebrief } from '../hooks/useWeeklyDebrief';
import type { DebriefDay } from '../api/types';
import {
  VitalityScoreGauge,
  NarrativePanel,
  DailyBreakdownTable,
  RecommendationsList,
  DayDetailModal,
} from '../components/debrief';
import { staggerContainer, fadeInUp } from '../lib/animations';

interface WeeklyDebriefProps {
  current?: boolean;
}

/**
 * Weekly Debrief page - "Mission Report" style analysis.
 * Features an animated intro (first view per week), vitality score,
 * LLM narrative, recommendations, and daily breakdown.
 */
export function WeeklyDebrief({ current = false }: WeeklyDebriefProps) {
  const { data: debrief, loading, error, refresh } = useWeeklyDebrief(current);
  const [selectedDay, setSelectedDay] = useState<DebriefDay | null>(null);
  const [showIntro, setShowIntro] = useState(false);

  // Check if we should show the "Incoming Transmission" intro
  useEffect(() => {
    const storageKey = 'lastDebriefIntroWeek';
    const currentWeek = new Date().toISOString().slice(0, 10);
    const lastShown = localStorage.getItem(storageKey);

    if (lastShown !== currentWeek && debrief) {
      setShowIntro(true);
      // Mark as shown after animation completes
      const timer = setTimeout(() => {
        localStorage.setItem(storageKey, currentWeek);
        setShowIntro(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [debrief]);

  // Handle date click from narrative
  const handleDateClick = (dayName: string) => {
    if (!debrief) return;
    const day = debrief.dailyBreakdown.find((d) => d.dayName === dayName);
    if (day) {
      setSelectedDay(day);
    }
  };

  // Handle row click from table
  const handleDayClick = (day: DebriefDay) => {
    setSelectedDay(day);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Generating report...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">📡</div>
          <h1 className="text-xl font-semibold text-white mb-2">Transmission Failed</h1>
          <p className="text-slate-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No data state
  if (!debrief) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">📭</div>
          <h1 className="text-xl font-semibold text-white mb-2">No Report Available</h1>
          <p className="text-slate-400">
            Weekly debriefs require at least 3 days of logged data.
            Keep logging and check back soon.
          </p>
        </div>
      </div>
    );
  }

  // Show intro animation
  if (showIntro) {
    return <TransmissionIntro />;
  }

  return (
    <div className="min-h-screen bg-black">
      <motion.div
        className="max-w-5xl mx-auto p-6 space-y-8"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {/* Header */}
        <motion.header variants={fadeInUp} className="text-center">
          <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">
            Mission Report
          </p>
          <h1 className="text-2xl font-bold text-white">Weekly Debrief</h1>
          <p className="text-sm text-slate-400 mt-1">
            {formatDateRange(debrief.weekStartDate, debrief.weekEndDate)}
          </p>
        </motion.header>

        {/* Module A: Vitality Score */}
        <motion.section variants={fadeInUp} className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
          <VitalityScoreGauge score={debrief.vitalityScore} />
        </motion.section>

        {/* Module B: Narrative */}
        <motion.section variants={fadeInUp}>
          <NarrativePanel
            narrative={debrief.narrative}
            onDateClick={handleDateClick}
          />
        </motion.section>

        {/* Module C: Recommendations */}
        <motion.section variants={fadeInUp}>
          <RecommendationsList recommendations={debrief.recommendations} />
        </motion.section>

        {/* Daily Breakdown Table */}
        <motion.section variants={fadeInUp}>
          <DailyBreakdownTable
            days={debrief.dailyBreakdown}
            onDayClick={handleDayClick}
          />
        </motion.section>

        {/* Footer */}
        <motion.footer variants={fadeInUp} className="text-center pt-4 border-t border-slate-800">
          <p className="text-xs text-slate-600">
            Generated {formatTimestamp(debrief.generatedAt)}
          </p>
          <button
            type="button"
            onClick={refresh}
            className="mt-2 text-xs text-slate-500 hover:text-slate-400 transition-colors"
          >
            Regenerate Report
          </button>
        </motion.footer>
      </motion.div>

      {/* Day Detail Modal */}
      <DayDetailModal
        isOpen={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        day={selectedDay}
      />
    </div>
  );
}

/**
 * "Incoming Transmission" intro animation.
 * Plays once per new week on first view.
 */
function TransmissionIntro() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center animate-pulse">
        <div className="relative">
          {/* Radar circles */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full border border-blue-500/20 animate-ping" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full border border-blue-500/30 animate-ping animation-delay-200" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border border-blue-500/40 animate-ping animation-delay-400" />
          </div>

          {/* Center icon */}
          <div className="relative z-10 w-20 h-20 flex items-center justify-center mx-auto">
            <span className="text-4xl">📡</span>
          </div>
        </div>

        <p className="mt-8 text-lg font-mono text-blue-400 tracking-widest animate-pulse">
          INCOMING TRANSMISSION
        </p>
        <p className="mt-2 text-sm text-slate-500 font-mono">
          Decrypting weekly analysis...
        </p>
      </div>
    </div>
  );
}

function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start + 'T12:00:00');
  const endDate = new Date(end + 'T12:00:00');

  const startStr = startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const endStr = endDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return `${startStr} – ${endStr}`;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
