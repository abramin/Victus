import type { TrainingSession, TrainingType } from '../../api/types';

const TRAINING_OPTIONS = [
  { value: 'rest', label: 'Rest Day' },
  { value: 'qigong', label: 'Qigong' },
  { value: 'walking', label: 'Walking' },
  { value: 'gmb', label: 'GMB' },
  { value: 'run', label: 'Running' },
  { value: 'row', label: 'Rowing' },
  { value: 'cycle', label: 'Cycling' },
  { value: 'hiit', label: 'HIIT' },
  { value: 'strength', label: 'Strength' },
  { value: 'calisthenics', label: 'Calisthenics' },
  { value: 'mobility', label: 'Mobility' },
  { value: 'mixed', label: 'Mixed' },
];

interface TrainingSessionListProps {
  sessions: TrainingSession[];
  onSessionsChange: (sessions: TrainingSession[]) => void;
  maxSessions?: number;
}

export function TrainingSessionList({
  sessions,
  onSessionsChange,
  maxSessions = 5,
}: TrainingSessionListProps) {
  const addSession = () => {
    if (sessions.length >= maxSessions) return;
    onSessionsChange([...sessions, { type: 'walking', durationMin: 30 }]);
  };

  const removeSession = (index: number) => {
    if (sessions.length <= 1) return;
    onSessionsChange(sessions.filter((_, i) => i !== index));
  };

  const updateSession = (index: number, updates: Partial<TrainingSession>) => {
    onSessionsChange(
      sessions.map((s, i) => (i === index ? { ...s, ...updates } : s))
    );
  };

  const totalDuration = sessions.reduce((sum, s) => sum + s.durationMin, 0);
  const nonRestSessions = sessions.filter((s) => s.type !== 'rest');

  return (
    <div className="space-y-4">
      {/* Header with summary and add button */}
      <div className="flex justify-between items-center">
        <span className="text-gray-400 text-sm">
          {nonRestSessions.length === 0
            ? 'Rest day'
            : `${sessions.length} session${sessions.length > 1 ? 's' : ''}, ${totalDuration} min total`}
        </span>
        {sessions.length < maxSessions && (
          <button
            type="button"
            onClick={addSession}
            className="text-sm text-white hover:text-gray-300 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Session
          </button>
        )}
      </div>

      {/* Session list */}
      <div className="space-y-3">
        {sessions.map((session, index) => (
          <div
            key={index}
            className="bg-gray-800/50 rounded-lg p-4 relative border border-gray-700"
          >
            {/* Delete button */}
            {sessions.length > 1 && (
              <button
                type="button"
                onClick={() => removeSession(index)}
                className="absolute top-2 right-2 text-gray-500 hover:text-red-400 p-1"
                title="Remove session"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            {/* Session number */}
            <div className="text-xs text-gray-500 mb-3">Session {index + 1}</div>

            {/* Type and Duration in a row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Training Type */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Type</label>
                <select
                  value={session.type}
                  onChange={(e) => {
                    const newType = e.target.value as TrainingType;
                    updateSession(index, {
                      type: newType,
                      durationMin: newType === 'rest' ? 0 : session.durationMin || 30,
                    });
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20 appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.25em 1.25em',
                  }}
                >
                  {TRAINING_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Duration</label>
                <input
                  type="number"
                  value={session.type === 'rest' ? '' : session.durationMin}
                  onChange={(e) =>
                    updateSession(index, { durationMin: parseInt(e.target.value) || 0 })
                  }
                  disabled={session.type === 'rest'}
                  placeholder={session.type === 'rest' ? 'N/A' : 'min'}
                  min={0}
                  max={480}
                  step={5}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {sessions.length === 0 && (
        <div className="text-center py-8 text-gray-500 bg-gray-800/30 rounded-lg border border-dashed border-gray-700">
          <p>No training sessions planned</p>
          <button
            type="button"
            onClick={addSession}
            className="mt-2 text-white hover:text-gray-300 text-sm"
          >
            Add your first session
          </button>
        </div>
      )}
    </div>
  );
}
