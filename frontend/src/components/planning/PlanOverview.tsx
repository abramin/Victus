import { useState } from 'react';
import { usePlan } from '../../hooks/usePlan';
import { usePlanAnalysis } from '../../hooks/usePlanAnalysis';
import { useProfile } from '../../hooks/useProfile';
import { useDailyLog } from '../../hooks/useDailyLog';
import { useStrategyAuditor } from '../../hooks/useStrategyAuditor';
import { PlanCreationForm } from './PlanCreationForm';
import { WeeklyTargetsTable } from './WeeklyTargetsTable';
import { DualTrackChart } from './DualTrackChart';
import { RecalibrationPrompt } from './RecalibrationPrompt';
import { PlanProgressTimeline } from './PlanProgressTimeline';
import { PlanHealthPanel } from './PlanHealthPanel';
import { AdjustStrategyModal } from './AdjustStrategyModal';
import { CheckEngineLight, DiagnosticPanel } from '../strategy-auditor';
import type { CreatePlanRequest, RecalibrationOption } from '../../api/types';

export function PlanOverview() {
  const { profile, loading: profileLoading, save: saveProfile } = useProfile();
  const { plan, loading: planLoading, creating, createError, create, complete, abandon, pause, resume, recalibrate } = usePlan();
  const { analysis, loading: analysisLoading, error: analysisError } = usePlanAnalysis();
  const { log } = useDailyLog();
  const { status: auditStatus } = useStrategyAuditor();

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const loading = profileLoading || planLoading;

  const handleCreatePlan = async (request: CreatePlanRequest) => {
    const newPlan = await create(request);

    // Sync profile goals with plan values after successful creation
    if (newPlan && profile) {
      const goalDirection =
        newPlan.goalWeightKg < (profile.currentWeightKg || newPlan.startWeightKg)
          ? 'lose_weight'
          : newPlan.goalWeightKg > (profile.currentWeightKg || newPlan.startWeightKg)
            ? 'gain_weight'
            : 'maintain';

      await saveProfile({
        ...profile,
        targetWeightKg: newPlan.goalWeightKg,
        timeframeWeeks: newPlan.durationWeeks,
        goal: goalDirection,
      });
    }
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

  const handlePause = async () => {
    await pause();
  };

  const handleResume = async () => {
    await resume();
  };

  const handleRecalibrationSelect = async (option: RecalibrationOption) => {
    const success = await recalibrate(option.type);
    if (success) {
      setShowAdjustModal(false);
    }
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
      <div className="max-w-xl mx-auto">
        <PlanCreationForm
          currentWeight={profile.currentWeightKg || 80}
          estimatedTDEE={log?.estimatedTDEE}
          profile={profile}
          onSubmit={handleCreatePlan}
          creating={creating}
          error={createError}
        />
      </div>
    );
  }

  // Calculate end date from start date and duration
  const endDate = new Date(plan.startDate);
  endDate.setDate(endDate.getDate() + plan.durationWeeks * 7);
  const endDateStr = endDate.toISOString().split('T')[0];

  // Active plan - show Command Center layout
  return (
    <div className="space-y-6">
      {/* Top Bar: Progress Title + Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Plan Progress</h2>
          {/* Check Engine Light */}
          {plan.status === 'active' && auditStatus && (
            <CheckEngineLight
              hasMismatch={auditStatus.hasMismatch}
              severity={auditStatus.severity}
              onClick={() => setShowDiagnostics(!showDiagnostics)}
            />
          )}
        </div>
        <div className="flex items-center gap-3">
          {plan.status === 'active' && (
            <>
              <button
                onClick={handlePause}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Pause
              </button>
              <button
                onClick={() => setShowAdjustModal(true)}
                className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Adjust Strategy
              </button>
              <button
                onClick={handleComplete}
                className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
              >
                Complete
              </button>
              <button
                onClick={handleAbandon}
                className="text-xs text-red-600 hover:text-red-800 transition-colors"
              >
                Abandon
              </button>
            </>
          )}
          {plan.status === 'paused' && (
            <button
              onClick={handleResume}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Resume Plan
            </button>
          )}
        </div>
      </div>

      {/* Diagnostic Panel (slides down when Check Engine light is clicked) */}
      {plan.status === 'active' && auditStatus && (
        <DiagnosticPanel
          isOpen={showDiagnostics}
          mismatches={auditStatus.mismatches}
          checkedAt={auditStatus.checkedAt}
          onClose={() => setShowDiagnostics(false)}
        />
      )}

      {/* Progress Timeline */}
      <PlanProgressTimeline
        startDate={plan.startDate}
        endDate={endDateStr}
        currentWeek={plan.currentWeek}
        totalWeeks={plan.durationWeeks}
        startWeightKg={plan.startWeightKg}
        currentWeightKg={analysis?.actualWeightKg ?? plan.startWeightKg}
        targetWeightKg={plan.goalWeightKg}
      />

      {/* Paused Banner */}
      {plan.status === 'paused' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <span className="text-yellow-600 text-lg">⏸</span>
          <div>
            <div className="font-medium text-yellow-800">Plan is paused</div>
            <div className="text-sm text-yellow-700">
              Daily targets are frozen. Resume when you're ready to continue.
            </div>
          </div>
        </div>
      )}

      {/* Recalibration prompt (dismissible banner when needed) */}
      {analysis?.recalibrationNeeded && analysis.options && plan.status === 'active' && (
        <RecalibrationPrompt
          varianceKg={analysis.varianceKg}
          variancePercent={analysis.variancePercent}
          options={analysis.options}
          onSelectOption={handleRecalibrationSelect}
        />
      )}

      {/* Main Grid: Health Panel + Chart (4/8 split on large screens) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Plan Health Panel (left side) */}
        <div className="lg:col-span-4">
          <PlanHealthPanel plan={plan} analysis={analysis} />
        </div>

        {/* Chart (right side) */}
        <div className="lg:col-span-8">
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
      </div>

      {/* Weekly Roadmap Table */}
      <WeeklyTargetsTable
        weeklyTargets={plan.weeklyTargets}
        currentWeek={plan.currentWeek}
        showPhases={true}
        showSparklines={true}
      />

      {/* Adjust Strategy Modal */}
      {analysis && (
        <AdjustStrategyModal
          isOpen={showAdjustModal}
          onClose={() => setShowAdjustModal(false)}
          plan={plan}
          analysis={analysis}
          onApply={handleRecalibrationSelect}
        />
      )}
    </div>
  );
}
