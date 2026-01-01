import { useState } from 'react';
import { useProfile } from '../hooks/useProfile';
import { useDailyLog } from '../hooks/useDailyLog';
import { OnboardingWizard } from '../components/onboarding';
import { AppLayout, type NavItem } from '../components/layout';
import { MealPointsDashboard } from '../components/meal-points';
import { PlanCalendar } from '../components/plan';
import { DailyUpdateForm } from '../components/daily-update';
import { ProfileForm } from '../components/settings/ProfileForm';

function App() {
  const { profile, loading: profileLoading, saving: profileSaving, saveError, save } = useProfile();
  const { log, loading: logLoading, saving: logSaving, saveError: logSaveError, create } = useDailyLog();
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

      {currentNav === 'daily-update' && (
        <DailyUpdateForm
          onSubmit={create}
          saving={logSaving}
          error={logSaveError}
        />
      )}

      {currentNav === 'profile' && (
        <div className="p-6 max-w-2xl">
          <h1 className="text-2xl font-semibold text-white mb-6">Profile Settings</h1>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <ProfileForm
              initialProfile={profile}
              onSave={save}
              saving={profileSaving}
              error={saveError}
            />
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default App;
