import { useState } from 'react';
import { useBodyStatus } from '../../hooks/useBodyStatus';
import { BodyMapVisualizer } from '../body-map';
import type { MuscleGroup, MuscleFatigue } from '../../api/types';

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

function MuscleListItem({ muscle }: { muscle: MuscleFatigue }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
      <div className="flex items-center gap-3">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: muscle.color }}
        />
        <span className="text-sm text-gray-200">{muscle.displayName}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-24 bg-gray-800 rounded-full h-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${muscle.fatiguePercent}%`,
              backgroundColor: muscle.color,
            }}
          />
        </div>
        <span className="text-sm text-gray-400 w-12 text-right">
          {muscle.fatiguePercent.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

export function PhysiqueDashboard() {
  const { bodyStatus, loading, error, refresh } = useBodyStatus();
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);

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

  // Sort muscles by fatigue (highest first)
  const sortedMuscles = [...bodyStatus.muscles].sort(
    (a, b) => b.fatiguePercent - a.fatiguePercent
  );

  // Find the selected muscle details
  const selectedMuscleData = selectedMuscle
    ? bodyStatus.muscles.find((m) => m.muscle === selectedMuscle)
    : null;

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

        {/* Muscle List */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <h2 className="text-lg font-medium text-white mb-4">
            Muscle Fatigue Levels
          </h2>

          {/* Selected muscle detail */}
          {selectedMuscleData && (
            <div className="mb-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: selectedMuscleData.color }}
                />
                <span className="text-lg font-medium text-white">
                  {selectedMuscleData.displayName}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Fatigue:</span>
                  <span className="ml-2 text-white">
                    {selectedMuscleData.fatiguePercent.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <span className="ml-2 text-white capitalize">
                    {selectedMuscleData.status}
                  </span>
                </div>
              </div>
              {selectedMuscleData.lastUpdated && (
                <div className="text-xs text-gray-500 mt-2">
                  Last stimulus:{' '}
                  {new Date(selectedMuscleData.lastUpdated).toLocaleString()}
                </div>
              )}
              <button
                onClick={() => setSelectedMuscle(null)}
                className="mt-3 text-xs text-gray-400 hover:text-white"
              >
                Clear selection
              </button>
            </div>
          )}

          {/* Full list */}
          <div className="max-h-80 overflow-y-auto">
            {sortedMuscles.map((muscle) => (
              <MuscleListItem key={muscle.muscle} muscle={muscle} />
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
