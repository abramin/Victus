import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBodyStatus } from '../../hooks/useBodyStatus';
import { BodyMapVisualizer } from '../body-map';
import type { MuscleGroup, MuscleFatigue } from '../../api/types';

// Region grouping for organized muscle display
const MUSCLE_REGIONS: Record<string, { label: string; icon: string; muscles: MuscleGroup[] }> = {
  push: {
    label: 'Push',
    icon: '💪',
    muscles: ['chest', 'front_delt', 'side_delt', 'triceps'],
  },
  pull: {
    label: 'Pull',
    icon: '🦾',
    muscles: ['lats', 'traps', 'rear_delt', 'biceps'],
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
  arms: {
    label: 'Arms',
    icon: '💪',
    muscles: ['forearms'],
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

function MuscleListItem({ muscle, compact = false }: { muscle: MuscleFatigue; compact?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${compact ? 'py-1.5' : 'py-2'}`}>
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: muscle.color }}
        />
        <span className={`${compact ? 'text-xs' : 'text-sm'} text-gray-300`}>
          {muscle.displayName}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-16 bg-gray-800 rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: muscle.color }}
            initial={{ width: 0 }}
            animate={{ width: `${muscle.fatiguePercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <span className={`${compact ? 'text-xs' : 'text-sm'} text-gray-400 w-10 text-right`}>
          {muscle.fatiguePercent.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

interface RegionGroupProps {
  regionKey: string;
  region: { label: string; icon: string; muscles: MuscleGroup[] };
  muscleData: MuscleFatigue[];
  isExpanded: boolean;
  onToggle: () => void;
}

function RegionGroup({ regionKey, region, muscleData, isExpanded, onToggle }: RegionGroupProps) {
  const regionMuscles = muscleData.filter((m) => region.muscles.includes(m.muscle));

  // Calculate average fatigue for the region
  const avgFatigue = regionMuscles.length > 0
    ? regionMuscles.reduce((sum, m) => sum + m.fatiguePercent, 0) / regionMuscles.length
    : 0;

  // Get the max fatigue in region (for "hottest" indicator)
  const maxFatigue = regionMuscles.length > 0
    ? Math.max(...regionMuscles.map((m) => m.fatiguePercent))
    : 0;

  const statusColor = getOverallStatusColor(avgFatigue);
  const statusBg = getStatusBgColor(avgFatigue);

  return (
    <div className="border-b border-gray-800 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-3 px-1 hover:bg-gray-800/30 transition-colors rounded"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{region.icon}</span>
          <span className="text-sm font-medium text-white">{region.label}</span>
          <span className="text-xs text-gray-500">
            ({regionMuscles.length})
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBg} ${statusColor}`}>
            {avgFatigue.toFixed(0)}%
          </div>
          <motion.svg
            className="w-4 h-4 text-gray-500"
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </motion.svg>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-9 pr-1 pb-2">
              {regionMuscles
                .sort((a, b) => b.fatiguePercent - a.fatiguePercent)
                .map((muscle) => (
                  <MuscleListItem key={muscle.muscle} muscle={muscle} compact />
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PhysiqueDashboard() {
  const { bodyStatus, loading, error, refresh } = useBodyStatus();
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set(['push', 'pull', 'lower']));

  const toggleRegion = (region: string) => {
    setExpandedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(region)) {
        next.delete(region);
      } else {
        next.add(region);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl">
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
      <div className="p-6 max-w-4xl">
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

  // Calculate recovery time
  const calculateRecoveryTime = (fatiguePercent: number): string => {
    if (fatiguePercent <= 0) return 'Ready';
    const hours = Math.ceil(fatiguePercent / 2); // 2% per hour
    if (hours < 1) return '< 1h';
    if (hours === 1) return '1h';
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours === 0) return `${days}d`;
    return `${days}d ${remainingHours}h`;
  };

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Body Status</h1>
          <p className="text-gray-400 text-sm">
            Muscle fatigue visualization
          </p>
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Body Map */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
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

        {/* Muscle List with Region Grouping */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-lg font-medium text-white mb-4">
            Fatigue by Region
          </h2>

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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Fatigue:</span>
                      <span className={`ml-2 font-medium ${getOverallStatusColor(selectedMuscleData.fatiguePercent)}`}>
                        {selectedMuscleData.fatiguePercent.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <span className="ml-2 text-white capitalize">
                        {selectedMuscleData.status}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Ready in:</span>
                      <span className="ml-2 text-white">
                        {calculateRecoveryTime(selectedMuscleData.fatiguePercent)}
                      </span>
                    </div>
                  </div>
                  {selectedMuscleData.lastUpdated && (
                    <div className="text-xs text-gray-500 mt-2">
                      Last stimulus:{' '}
                      {new Date(selectedMuscleData.lastUpdated).toLocaleString()}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Region groups */}
          <div className="max-h-96 overflow-y-auto">
            {Object.entries(MUSCLE_REGIONS).map(([key, region]) => (
              <RegionGroup
                key={key}
                regionKey={key}
                region={region}
                muscleData={bodyStatus.muscles}
                isExpanded={expandedRegions.has(key)}
                onToggle={() => toggleRegion(key)}
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
              Your body map updates automatically when you log workouts with an archetype
              (Push, Pull, Legs, etc.). Muscles recover at ~2% per hour. Click on any
              muscle to see details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
