import { useProfile } from '../hooks/useProfile';
import { ProfileForm } from '../components/settings/ProfileForm';

function App() {
  const { profile, loading, saving, error, saveError, save } = useProfile();

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-slate-300">Loading profile...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-semibold mb-6 text-slate-100">Victus - Profile Setup</h1>

        {error && !profile && (
          <div className="mb-6 p-4 bg-yellow-900/50 border border-yellow-700 rounded-md">
            <p className="text-yellow-300">No profile found. Please set up your profile below.</p>
          </div>
        )}

        <ProfileForm initialProfile={profile} onSave={save} saving={saving} error={saveError} />
      </div>
    </main>
  );
}

export default App;
