import { Routes, Route } from 'react-router-dom';
import { useProfile } from '../hooks/useProfile';
import { useDailyLog } from '../hooks/useDailyLog';
import { OnboardingWizard } from '../components/onboarding';
import { AppLayout } from '../components/layout';
import { MealPointsDashboard } from '../components/meal-points';
import { PlanCalendar } from '../components/plan';
import { WeightHistory } from '../components/history';
import { DailyUpdateForm } from '../components/daily-update';
import { LogWorkoutView } from '../components/training';
import { ProfileForm } from '../components/settings/ProfileForm';
import { ErrorBoundary } from '../components/common';

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
  } = useDailyLog();

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
          <Route path="/" element={<MealPointsDashboard log={log} profile={profile} />} />
          <Route path="/plan" element={<PlanCalendar profile={profile} />} />
          <Route path="/history" element={<WeightHistory profile={profile} />} />
          <Route
            path="/daily-update"
            element={
              <DailyUpdateForm
                onSubmit={create}
                onReplace={replace}
                saving={logSaving}
                error={logSaveError}
                profile={profile}
                log={log}
              />
            }
          />
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
                />
              </div>
            }
          />
        </Routes>
      </AppLayout>
    </ErrorBoundary>
  );
}

export default App;
