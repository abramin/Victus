import { useState } from 'react';
import { useProfile } from '../hooks/useProfile';
import { useDailyLog } from '../hooks/useDailyLog';
import { OnboardingWizard } from '../components/onboarding';
import { AppLayout, type NavItem } from '../components/layout';
import { MealPointsDashboard } from '../components/meal-points';
import { PlanCalendar } from '../components/plan';
import { WeightHistory } from '../components/history';
import { DailyUpdateForm } from '../components/daily-update';
import { ProfileForm } from '../components/settings/ProfileForm';

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
  const [currentNav, setCurrentNav] = useState<NavItem>('meal-points');

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
    <AppLayout currentNav={currentNav} onNavChange={setCurrentNav}>
      {currentNav === 'meal-points' && (
        <MealPointsDashboard log={log} profile={profile} />
      )}

      {currentNav === 'plan' && (
        <PlanCalendar profile={profile} />
      )}

      {currentNav === 'history' && (
        <WeightHistory profile={profile} />
      )}

      {currentNav === 'daily-update' && (
        <DailyUpdateForm
          onSubmit={create}
          onReplace={replace}
          onUpdateActual={updateActual}
          saving={logSaving}
          error={logSaveError}
          profile={profile}
          log={log}
        />
      )}

      {currentNav === 'profile' && (
        <div className="p-6 max-w-6xl mx-auto">
          <h1 className="text-2xl font-semibold text-white mb-6">Profile Settings</h1>
          <ProfileForm
            initialProfile={profile}
            onSave={save}
            saving={profileSaving}
            error={saveError}
          />
        </div>
      )}
    </AppLayout>
  );
}

export default App;
