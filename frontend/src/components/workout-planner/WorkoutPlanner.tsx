import { useState, useEffect, useCallback, useMemo } from 'react';
import type { TrainingConfig, TrainingType, MuscleFatigue } from '../../api/types';
import { getTrainingConfigs, getBodyStatus } from '../../api/client';
import { SessionDeck } from './SessionDeck';
import { CalendarBoard, formatWeekRange } from './CalendarBoard';
import { WeeklyLoadEqualizer } from './WeeklyLoadEqualizer';
import { ConfigureSessionModal } from './ConfigureSessionModal';
import { SmartFillButton } from './SmartFillButton';
import { RecoveryIndicator } from './RecoveryIndicator';
import { usePlannerState } from './usePlannerState';
import { useRecoveryContext } from './useRecoveryContext';
import { calculateSessionLoad } from './loadCalculations';
import { getSessionCategory } from './sessionCategories';
import type { SessionDragData } from './DraggableSessionCard';

/**
 * Tactical Drag-and-Drop Workout Planner
 *
 * A cyberpunk-inspired planner where users drag training type "cards"
 * onto a weekly calendar with real-time load visualization.
 */
export function WorkoutPlanner() {
  // Training configs from API
  const [configs, setConfigs] = useState<TrainingConfig[]>([]);
  const [configsLoading, setConfigsLoading] = useState(true);
  const [configsError, setConfigsError] = useState<string | null>(null);

  // Body status for recovery context
  const [bodyStatus, setBodyStatus] = useState<MuscleFatigue[] | null>(null);

  // Planner state
  const {
    weekStartDate,
    weekDates,
    goToPreviousWeek,
    goToNextWeek,
    goToCurrentWeek,
    draftDays,
    hasUnsavedChanges,
    programSessionsByDate,
    addSession,
    removeSession,
    weekLoads,
    resetDraft,
    savePlan,
    isSaving,
    saveError,
    isDragging,
    activeDragType,
    activeDragConfig,
    hoveredDropDate,
    handleDragStart,
    handleDragEnd,
    handleDayDragEnter,
    handleDayDragLeave,
    selectedSession,
    handleSelectSession,
    handlePlaceSession,
    configuringSession,
    setConfiguringSession,
  } = usePlannerState();

  // Calculate projected ghost load when dragging over a day
  const projectedGhostLoad = useMemo(() => {
    if (!activeDragConfig || !hoveredDropDate) return 0;
    const DEFAULT_PREVIEW_DURATION = 30;
    const DEFAULT_PREVIEW_RPE = 5;
    return calculateSessionLoad(
      activeDragConfig.loadScore,
      DEFAULT_PREVIEW_DURATION,
      DEFAULT_PREVIEW_RPE
    );
  }, [activeDragConfig, hoveredDropDate]);

  // Get ghost bar color from active drag category
  const ghostColor = useMemo(() => {
    if (!activeDragType) return '#6b7280'; // gray-500 default
    return getSessionCategory(activeDragType).color;
  }, [activeDragType]);

  // Recovery context for fatigue warnings
  const { warnings: recoveryWarnings, regionRecovery, overallScore } = useRecoveryContext(
    bodyStatus,
    draftDays,
    weekDates
  );

  // Fetch training configs and body status on mount
  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      try {
        setConfigsLoading(true);
        setConfigsError(null);

        // Fetch both in parallel
        const [configsData, bodyStatusData] = await Promise.all([
          getTrainingConfigs(controller.signal),
          getBodyStatus(controller.signal).catch(() => null), // Don't fail if body status unavailable
        ]);

        setConfigs(configsData);
        if (bodyStatusData) {
          setBodyStatus(bodyStatusData.muscles);
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setConfigsError(err.message);
        }
      } finally {
        setConfigsLoading(false);
      }
    }

    fetchData();
    return () => controller.abort();
  }, []);

  // Handle session drop - open configuration modal
  const handleSessionDrop = useCallback(
    (date: string, data: SessionDragData) => {
      setConfiguringSession({
        trainingType: data.trainingType,
        config: data.config,
        targetDate: date,
      });
    },
    [setConfiguringSession]
  );

  // Handle session configuration confirm
  const handleConfigureConfirm = useCallback(
    (session: { trainingType: typeof configuringSession.trainingType; durationMin: number; rpe: number; loadScore: number }) => {
      if (!configuringSession) return;
      addSession(configuringSession.targetDate, session);
      setConfiguringSession(null);
    },
    [configuringSession, addSession, setConfiguringSession]
  );

  // Handle save plan
  const handleSavePlan = useCallback(async () => {
    try {
      await savePlan();
    } catch {
      // Error is already captured in saveError state
    }
  }, [savePlan]);

  // Handle Smart Fill completion
  const handleSmartFillComplete = useCallback(
    (sessions: { date: string; trainingType: TrainingType; durationMin: number; rpe: number; loadScore: number }[]) => {
      sessions.forEach((session) => {
        addSession(session.date, {
          trainingType: session.trainingType,
          durationMin: session.durationMin,
          rpe: session.rpe,
          loadScore: session.loadScore,
        });
      });
    },
    [addSession]
  );

  // Format week display
  const weekDisplay = formatWeekRange(weekStartDate);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800/50 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Workout Planner</h1>
            <p className="text-sm text-gray-400">Drag sessions to plan your week</p>
          </div>

          {/* Week navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={goToPreviousWeek}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Previous week"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={goToCurrentWeek}
              className="px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
            >
              Today
            </button>

            <span className="text-white font-medium min-w-[140px] text-center">
              {weekDisplay}
            </span>

            <button
              onClick={goToNextWeek}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title="Next week"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {saveError && (
              <span className="text-xs text-red-400">{saveError}</span>
            )}
            {hasUnsavedChanges && !saveError && (
              <span className="text-xs text-amber-400">Unsaved changes</span>
            )}
            <SmartFillButton
              weekDates={weekDates}
              configs={configs}
              onFillComplete={handleSmartFillComplete}
              disabled={configsLoading || hasUnsavedChanges}
            />
            <button
              onClick={resetDraft}
              disabled={!hasUnsavedChanges || isSaving}
              className="px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset
            </button>
            <button
              onClick={handleSavePlan}
              disabled={!hasUnsavedChanges || isSaving}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Plan'}
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 p-6 space-y-4">
        {/* Error state */}
        {configsError && (
          <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400">
            Failed to load training configs: {configsError}
          </div>
        )}

        {/* Recovery indicator and Weekly load equalizer */}
        <div className="flex items-start gap-4">
          <RecoveryIndicator
            regionRecovery={regionRecovery}
            overallScore={overallScore}
          />
          <div className="flex-1">
            <WeeklyLoadEqualizer
              weekLoads={weekLoads}
              chronicLoad={0} // TODO: Fetch from history
              hoveredDate={hoveredDropDate}
              projectedLoad={projectedGhostLoad}
              ghostColor={ghostColor}
            />
          </div>
        </div>

        {/* Calendar board */}
        <CalendarBoard
          weekDates={weekDates}
          plannedDays={draftDays}
          programSessionsByDate={programSessionsByDate}
          isDragging={isDragging}
          activeDragType={activeDragType}
          selectedSession={selectedSession}
          recoveryWarnings={recoveryWarnings}
          onSessionDrop={handleSessionDrop}
          onRemoveSession={removeSession}
          onDayDragEnter={handleDayDragEnter}
          onDayDragLeave={handleDayDragLeave}
          onClickToPlace={handlePlaceSession}
        />
      </div>

      {/* Session deck (bottom drawer) */}
      <SessionDeck
        configs={configs}
        loading={configsLoading}
        selectedSession={selectedSession}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onSelectSession={handleSelectSession}
      />

      {/* Configure session modal */}
      {configuringSession && (
        <ConfigureSessionModal
          isOpen={!!configuringSession}
          onClose={() => setConfiguringSession(null)}
          trainingType={configuringSession.trainingType}
          trainingConfig={configuringSession.config}
          targetDate={configuringSession.targetDate}
          onConfirm={handleConfigureConfirm}
        />
      )}
    </div>
  );
}
