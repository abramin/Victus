import { useState } from 'react';
import { useProfile } from '../hooks/useProfile';
import { useDailyLog } from '../hooks/useDailyLog';
import { ProfileForm } from '../components/settings/ProfileForm';
import { DailyLogForm } from '../components/daily-input/DailyLogForm';
import { DailyTargetsDisplay } from '../components/targets/DailyTargetsDisplay';

type View = 'daily' | 'settings';

function App() {
  const { profile, loading: profileLoading, saving: profileSaving, saveError, save } = useProfile();
  const { log, loading: logLoading, saving: logSaving, saveError: logSaveError, create } = useDailyLog();
  const [currentView, setCurrentView] = useState<View>('daily');

  // Loading state
  if (profileLoading || logLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-slate-300">Loading...</div>
      </main>
    );
  }

  // No profile - show setup
  if (!profile) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-semibold mb-6 text-slate-100">Victus - Profile Setup</h1>
          <div className="mb-6 p-4 bg-yellow-900/50 border border-yellow-700 rounded-md">
            <p className="text-yellow-300">Welcome! Please set up your profile to get started.</p>
          </div>
          <ProfileForm initialProfile={null} onSave={save} saving={profileSaving} error={saveError} />
        </div>
      </main>
    );
  }

  // Settings view
  if (currentView === 'settings') {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-semibold text-slate-100">Settings</h1>
            <button
              onClick={() => setCurrentView('daily')}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              Back to Daily
            </button>
          </div>
          <ProfileForm initialProfile={profile} onSave={save} saving={profileSaving} error={saveError} />
        </div>
      </main>
    );
  }

  // Log exists - show targets
  if (log) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setCurrentView('settings')}
              className="text-slate-400 hover:text-slate-300 text-sm"
            >
              Settings
            </button>
          </div>
          <DailyTargetsDisplay
            targets={log.calculatedTargets}
            estimatedTDEE={log.estimatedTDEE}
            date={log.date}
          />
        </div>
      </main>
    );
  }

  // No log today - show daily log form
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold text-slate-100">Daily Check-In</h1>
          <button
            onClick={() => setCurrentView('settings')}
            className="text-slate-400 hover:text-slate-300 text-sm"
          >
            Settings
          </button>
        </div>
        <DailyLogForm onSubmit={create} saving={logSaving} error={logSaveError} />
      </div>
    </main>
  );
}

export default App;
