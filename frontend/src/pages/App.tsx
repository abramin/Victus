import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useProfile } from '../hooks/useProfile';
import { useDailyLog } from '../hooks/useDailyLog';
import { usePlan } from '../hooks/usePlan';
import { getLogByDate } from '../api/client';
import type { DailyLog } from '../api/types';
import { OnboardingWizard } from '../components/onboarding';
import { AppLayout } from '../components/layout';
import { MealPointsDashboard } from '../components/meal-points';
import { PlanCalendar } from '../components/plan';
import { PlanOverview } from '../components/planning';
import { WeightHistory } from '../components/history';
import { CommandCenter } from '../components/command-center';
import { LogWorkoutView } from '../components/training';
import { ProfileForm } from '../components/settings/ProfileForm';
import { GarminImportZone } from '../components/settings/GarminImportZone';
import { ErrorBoundary } from '../components/common';
import { WorkoutPlanner } from '../components/workout-planner';
import { PhysiqueDashboard } from '../components/physique';
import { ProgramLibrary } from '../components/training-programs/ProgramLibrary';
import { TacticalKitchen } from '../components/tactical-kitchen';
import { WeeklyDebrief } from './WeeklyDebrief';
import { MovementLibrary } from '../components/movement/MovementLibrary';
import { VoiceCommandButton } from '../components/voice';

function App() {
  const {
    profile,
    loading: profileLoading,
    saving: profileSaving,
    saveError,
    save,
    error: profileError,
    refresh: refreshProfile,
  } = useProfile();
  const {
    log,
    loading: logLoading,
    saving: logSaving,
    saveError: logSaveError,
    create,
    replace,
    updateActual,
    refresh: refreshLog,
  } = useDailyLog();

  const { plan: activePlan } = usePlan();

  // Fetch yesterday's log for HRV pre-fill
  const [yesterdayLog, setYesterdayLog] = useState<DailyLog | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];

    getLogByDate(yesterdayDate, controller.signal)
      .then((log) => {
        if (!controller.signal.aborted) setYesterdayLog(log);
      })
      .catch(() => {
        if (!controller.signal.aborted) setYesterdayLog(null);
      });
    return () => controller.abort();
  }, []);

  // Loading state
  if (profileLoading || logLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-700 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-6">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold text-white mb-2">Unable to load profile</h1>
          <p className="text-gray-400 mb-4">{profileError}</p>
          <button
            type="button"
            onClick={refreshProfile}
            className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // No profile - show onboarding wizard
  if (!profile) {
    return (
      <OnboardingWizard
        onComplete={save}
        saving={profileSaving}
        error={saveError}
      />
    );
  }

  // Main app with sidebar
  return (
    <ErrorBoundary>
      <AppLayout>
        <Routes>
          {/* Today - The Command Center */}
          <Route
            path="/"
            element={
              <CommandCenter
                profile={profile}
                log={log}
                yesterdayLog={yesterdayLog}
                loading={logLoading}
                saving={logSaving}
                error={logSaveError}
                activePlan={activePlan}
                onCreate={create}
                onReplace={replace}
                onUpdateActual={updateActual}
                onRefresh={refreshLog}
              />
            }
          />
          {/* Kitchen - The Tactical Plate Builder */}
          <Route path="/kitchen" element={<TacticalKitchen />} />
          {/* Strategy - The War Room (formerly Plan) */}
          <Route path="/strategy" element={
            <div className="p-6 max-w-6xl mx-auto">
              <h1 className="text-2xl font-semibold text-white mb-6">Strategy</h1>
              <PlanOverview />
            </div>
          } />
          {/* Schedule - The Tactical Calendar */}
          <Route path="/schedule" element={<PlanCalendar profile={profile} />} />
          {/* Workout Planner - Tactical Drag-and-Drop */}
          <Route path="/workout-planner" element={<WorkoutPlanner />} />
          {/* Movement - Adaptive Movement Engine */}
          <Route path="/movement" element={<MovementLibrary />} />
          {/* Training Programs - Program Library & Builder */}
          <Route path="/programs" element={<ProgramLibrary />} />
          {/* Body Status - Muscle Fatigue Map */}
          <Route path="/physique" element={<PhysiqueDashboard />} />
          {/* Weekly Debrief - Mission Report */}
          <Route path="/debrief" element={<WeeklyDebrief />} />
          <Route path="/history" element={<WeightHistory profile={profile} />} />
          <Route
            path="/log-workout"
            element={
              <LogWorkoutView
                log={log}
                onUpdateActual={updateActual}
                saving={logSaving}
              />
            }
          />
          <Route
            path="/profile"
            element={
              <div className="p-6 max-w-6xl mx-auto">
                <h1 className="text-2xl font-semibold text-white mb-6">Profile Settings</h1>
                <ProfileForm
                  initialProfile={profile}
                  onSave={save}
                  saving={profileSaving}
                  error={saveError}
                  activePlan={activePlan}
                />
                {/* Data Import Section */}
                <div className="mt-8">
                  <h2 className="text-xl font-semibold text-white mb-4">Data Management</h2>
                  <GarminImportZone />
                </div>
              </div>
            }
          />
        </Routes>
      </AppLayout>

      {/* Global Voice Command FAB - positioned on left to avoid overlapping action buttons */}
      <VoiceCommandButton
        date={log?.date}
        leftOffset={24}
        onResult={(response) => {
          // Refresh data after successful voice command
          if (response.success) {
            refreshLog();
          }
        }}
      />
    </ErrorBoundary>
  );
}

export default App;
