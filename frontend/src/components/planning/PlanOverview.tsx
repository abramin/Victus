import { usePlan } from '../../hooks/usePlan';
import { usePlanAnalysis } from '../../hooks/usePlanAnalysis';
import { useProfile } from '../../hooks/useProfile';
import { PlanCreationForm } from './PlanCreationForm';
import { PlanSummaryCard } from './PlanSummaryCard';
import { WeeklyTargetsTable } from './WeeklyTargetsTable';
import { DualTrackChart } from './DualTrackChart';
import { RecalibrationPrompt } from './RecalibrationPrompt';
import { PlanProgressTimeline } from './PlanProgressTimeline';
import type { CreatePlanRequest, RecalibrationOption } from '../../api/types';

export function PlanOverview() {
  const { profile, loading: profileLoading } = useProfile();
  const { plan, loading: planLoading, creating, createError, create, complete, abandon } = usePlan();
  const { analysis, loading: analysisLoading, error: analysisError } = usePlanAnalysis();

  const loading = profileLoading || planLoading;

  const handleCreatePlan = async (request: CreatePlanRequest) => {
    await create(request);
  };

  const handleComplete = async () => {
    if (confirm('Are you sure you want to mark this plan as complete?')) {
      await complete();
    }
  };

  const handleAbandon = async () => {
    if (confirm('Are you sure you want to abandon this plan? This cannot be undone.')) {
      await abandon();
    }
  };

  const handleRecalibrationSelect = (option: RecalibrationOption) => {
    // TODO: Implement recalibration API call when Slice 18 is complete
    console.log('Selected recalibration option:', option);
    alert(`Recalibration with "${option.type}" will be implemented in Slice 18`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-800">Profile Required</h3>
        <p className="text-sm text-yellow-700 mt-1">
          Please set up your profile before creating a nutrition plan.
        </p>
      </div>
    );
  }

  // No active plan - show creation form
  if (!plan) {
    return (
      <div className="max-w-lg mx-auto">
        <PlanCreationForm
          currentWeight={profile.currentWeightKg || 80}
          onSubmit={handleCreatePlan}
          creating={creating}
          error={createError}
        />
      </div>
    );
  }

  // Active plan - show overview
  return (
    <div className="space-y-6">
      {/* Progress Timeline - Visual at-a-glance progress indicator */}
      <PlanProgressTimeline
        startDate={plan.startDate}
        endDate={plan.endDate}
        currentWeek={plan.currentWeek}
        totalWeeks={plan.durationWeeks}
        startWeightKg={plan.startWeightKg}
        currentWeightKg={analysis?.actualWeightKg ?? plan.startWeightKg}
        targetWeightKg={plan.targetWeightKg}
      />

      {/* Recalibration prompt (if needed) */}
      {analysis?.recalibrationNeeded && analysis.options && (
        <RecalibrationPrompt
          varianceKg={analysis.varianceKg}
          variancePercent={analysis.variancePercent}
          options={analysis.options}
          onSelectOption={handleRecalibrationSelect}
        />
      )}

      {/* Summary and chart side by side on larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PlanSummaryCard
          plan={plan}
          analysis={analysis}
          onComplete={handleComplete}
          onAbandon={handleAbandon}
        />

        {analysis && !analysisLoading && (
          <DualTrackChart analysis={analysis} />
        )}

        {analysisLoading && (
          <div className="flex items-center justify-center min-h-[200px] bg-gray-50 rounded-lg">
            <div className="text-gray-500">Loading analysis...</div>
          </div>
        )}

        {analysisError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{analysisError}</p>
          </div>
        )}
      </div>

      {/* Weekly targets table */}
      <WeeklyTargetsTable
        weeklyTargets={plan.weeklyTargets}
        currentWeek={plan.currentWeek}
      />
    </div>
  );
}
