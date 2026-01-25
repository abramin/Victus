import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBodyStatus } from '../../hooks/useBodyStatus';
import { BodyMapVisualizer } from '../body-map';
import { getRecoveryStatus } from '../../utils';
import type { MuscleGroup, MuscleFatigue } from '../../api/types';

// Region grouping for organized muscle display (forearms merged into pull)
const MUSCLE_REGIONS: Record<string, { label: string; icon: string; muscles: MuscleGroup[] }> = {
  push: {
    label: 'Push',
    icon: '💪',
    muscles: ['chest', 'front_delt', 'side_delt', 'triceps'],
  },
  pull: {
    label: 'Pull',
    icon: '🦾',
    muscles: ['lats', 'traps', 'rear_delt', 'biceps', 'forearms'],
  },
  core: {
    label: 'Core',
    icon: '🎯',
    muscles: ['core', 'lower_back'],
  },
  lower: {
    label: 'Lower',
    icon: '🦵',
    muscles: ['quads', 'glutes', 'hamstrings', 'calves'],
  },
};

function getOverallStatusLabel(score: number): string {
  if (score <= 25) return 'Fresh & Ready';
  if (score <= 50) return 'Well Stimulated';
  if (score <= 75) return 'Recovery Recommended';
  return 'Rest Needed';
}

function getOverallStatusColor(score: number): string {
  if (score <= 25) return 'text-emerald-400';
  if (score <= 50) return 'text-yellow-400';
  if (score <= 75) return 'text-orange-400';
  return 'text-red-400';
}

function getStatusBgColor(score: number): string {
  if (score <= 25) return 'bg-emerald-500/20';
  if (score <= 50) return 'bg-yellow-500/20';
  if (score <= 75) return 'bg-orange-500/20';
  return 'bg-red-500/20';
}

function getStatusBarColor(score: number): string {
  if (score <= 25) return 'bg-emerald-500';
  if (score <= 50) return 'bg-yellow-500';
  if (score <= 75) return 'bg-orange-500';
  return 'bg-red-500';
}

function getStatusTrackColor(score: number): string {
  if (score <= 25) return 'bg-emerald-500/20';
  if (score <= 50) return 'bg-yellow-500/20';
  if (score <= 75) return 'bg-orange-500/20';
  return 'bg-red-500/20';
}

interface MuscleProgressRowProps {
  muscle: MuscleFatigue;
  onClick?: () => void;
  isSelected?: boolean;
}

function MuscleProgressRow({ muscle, onClick, isSelected }: MuscleProgressRowProps) {
  const recovery = getRecoveryStatus(muscle.fatiguePercent);
  const barColor = getStatusBarColor(muscle.fatiguePercent);
  const trackColor = getStatusTrackColor(muscle.fatiguePercent);

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors
        ${isSelected ? 'bg-gray-700/50 ring-1 ring-gray-600' : 'hover:bg-gray-800/50'}
      `}
    >
      {/* Muscle indicator dot */}
      <div
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: muscle.color }}
      />

      {/* Muscle name - fixed width for alignment */}
      <span className="text-base text-gray-200 w-24 text-left shrink-0">
        {muscle.displayName}
      </span>

      {/* Progress bar - fills remaining space */}
      <div className={`flex-1 h-2 rounded-full overflow-hidden ${trackColor}`}>
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${muscle.fatiguePercent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Status label - fixed width, right aligned */}
      <span className={`text-sm font-mono ${recovery.color} w-28 text-right shrink-0`}>
        {recovery.label}
      </span>
    </button>
  );
}

interface MuscleStatusCardProps {
  regionKey: string;
  region: { label: string; icon: string; muscles: MuscleGroup[] };
  muscleData: MuscleFatigue[];
  selectedMuscle: MuscleGroup | null;
  onMuscleSelect: (muscle: MuscleGroup) => void;
}

function MuscleStatusCard({
  region,
  muscleData,
  selectedMuscle,
  onMuscleSelect,
}: MuscleStatusCardProps) {
  const regionMuscles = muscleData
    .filter((m) => region.muscles.includes(m.muscle))
    .sort((a, b) => b.fatiguePercent - a.fatiguePercent);

  if (regionMuscles.length === 0) return null;

  // Calculate average fatigue for the region
  const avgFatigue =
    regionMuscles.reduce((sum, m) => sum + m.fatiguePercent, 0) / regionMuscles.length;
  const statusColor = getOverallStatusColor(avgFatigue);
  const statusBg = getStatusBgColor(avgFatigue);

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <span className="text-lg">{region.icon}</span>
          <span className="text-base font-medium text-white">{region.label}</span>
        </div>
        <div className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBg} ${statusColor}`}>
          {avgFatigue.toFixed(0)}% avg
        </div>
      </div>

      {/* Muscle List */}
      <div className="p-2">
        {regionMuscles.map((muscle) => (
          <MuscleProgressRow
            key={muscle.muscle}
            muscle={muscle}
            onClick={() => onMuscleSelect(muscle.muscle)}
            isSelected={selectedMuscle === muscle.muscle}
          />
        ))}
      </div>
    </div>
  );
}

export function PhysiqueDashboard() {
  const { bodyStatus, loading, error, refresh } = useBodyStatus();
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);

  if (loading) {
    return (
      <div className="p-6 w-full">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 w-full">
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-6 text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={refresh}
            className="mt-4 px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!bodyStatus) {
    return (
      <div className="p-6 w-full">
        <div className="bg-gray-900 rounded-xl p-6 text-center">
          <p className="text-gray-400">No body status data available.</p>
        </div>
      </div>
    );
  }

  // Find the selected muscle details
  const selectedMuscleData = selectedMuscle
    ? bodyStatus.muscles.find((m) => m.muscle === selectedMuscle)
    : null;

  return (
    <div className="p-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Body Status</h1>
          <p className="text-gray-400 text-sm">Muscle fatigue visualization</p>
        </div>
        <button
          onClick={refresh}
          className="px-3 py-1.5 text-sm bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Overall Score Card */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-400">Overall Fatigue</div>
            <div className={`text-3xl font-bold ${getOverallStatusColor(bodyStatus.overallScore)}`}>
              {bodyStatus.overallScore.toFixed(0)}%
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {getOverallStatusLabel(bodyStatus.overallScore)}
            </div>
          </div>
          <div className="text-right text-xs text-gray-500">
            Updated: {new Date(bodyStatus.asOfTime).toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Main Content - Flex Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Body Map - Fixed Width */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 lg:w-[420px] lg:shrink-0">
          <h2 className="text-lg font-medium text-white mb-4">Muscle Map</h2>
          <div className="flex justify-center">
            <BodyMapVisualizer
              muscles={bodyStatus.muscles}
              size="lg"
              onMuscleClick={setSelectedMuscle}
              highlightMuscles={selectedMuscle ? [selectedMuscle] : []}
            />
          </div>
        </div>

        {/* Fatigue Panel - Fills Remaining Space */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 flex-1 min-w-0">
          <h2 className="text-lg font-medium text-white mb-4">Fatigue by Region</h2>

          {/* Selected muscle detail */}
          <AnimatePresence>
            {selectedMuscleData && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 overflow-hidden"
              >
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full ring-2 ring-white/20"
                        style={{ backgroundColor: selectedMuscleData.color }}
                      />
                      <span className="text-lg font-medium text-white">
                        {selectedMuscleData.displayName}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedMuscle(null)}
                      className="text-gray-500 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Fatigue:</span>
                      <span
                        className={`ml-2 font-medium ${getOverallStatusColor(selectedMuscleData.fatiguePercent)}`}
                      >
                        {selectedMuscleData.fatiguePercent.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <span className="ml-2 text-white capitalize">{selectedMuscleData.status}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Recovery:</span>
                      {(() => {
                        const recovery = getRecoveryStatus(selectedMuscleData.fatiguePercent);
                        return (
                          <>
                            <span className={`ml-2 font-medium ${recovery.color}`}>
                              {recovery.label}
                            </span>
                            {!recovery.isReady && (
                              <span className="ml-2 text-gray-500 text-xs">
                                ({recovery.hoursRemaining}h)
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  {selectedMuscleData.lastUpdated && (
                    <div className="text-xs text-gray-500 mt-2">
                      Last stimulus: {new Date(selectedMuscleData.lastUpdated).toLocaleString()}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Region cards in responsive grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {Object.entries(MUSCLE_REGIONS).map(([key, region]) => (
              <MuscleStatusCard
                key={key}
                regionKey={key}
                region={region}
                muscleData={bodyStatus.muscles}
                selectedMuscle={selectedMuscle}
                onMuscleSelect={setSelectedMuscle}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="mt-6 bg-gray-900/50 rounded-xl p-4 border border-gray-800">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💡</div>
          <div className="text-sm text-gray-400">
            <p className="font-medium text-gray-300 mb-1">How it works</p>
            <p>
              Your body map updates automatically when you log workouts with an archetype (Push,
              Pull, Legs, etc.). Muscles recover at ~2% per hour. Click on any muscle to see
              details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
