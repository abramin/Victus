import { useState, useEffect, useCallback, useRef } from 'react';
import { Modal } from '../common/Modal';
import { IntensitySelector } from './IntensitySelector';
import type { TrainingSession, ActualTrainingSession, TrainingType } from '../../api/types';

// Internal type with stable ID for React keys
type SessionWithId = Omit<ActualTrainingSession, 'sessionOrder'> & { _id: string };

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

interface ActualTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  plannedSessions: TrainingSession[];
  actualSessions?: ActualTrainingSession[];
  onSave: (sessions: Omit<ActualTrainingSession, 'sessionOrder'>[]) => Promise<boolean>;
  saving: boolean;
}

export function ActualTrainingModal({
  isOpen,
  onClose,
  plannedSessions,
  actualSessions,
  onSave,
  saving,
}: ActualTrainingModalProps) {
  const [sessions, setSessions] = useState<SessionWithId[]>([]);
  const idCounterRef = useRef(0);

  // Generate a unique ID (stable within component instance)
  const generateId = useCallback(() => {
    idCounterRef.current += 1;
    return `session-${idCounterRef.current}`;
  }, []);

  // Reset when modal opens - pre-fill with actual if exists, otherwise use planned
  useEffect(() => {
    if (isOpen) {
      // Reset counter when modal opens for clean IDs
      idCounterRef.current = 0;
      if (actualSessions && actualSessions.length > 0) {
        setSessions(
          actualSessions.map((s) => ({
            _id: generateId(),
            type: s.type,
            durationMin: s.durationMin,
            perceivedIntensity: s.perceivedIntensity,
            notes: s.notes,
          }))
        );
      } else {
        setSessions(
          plannedSessions.map((s) => ({
            _id: generateId(),
            type: s.type,
            durationMin: s.durationMin,
            perceivedIntensity: undefined,
            notes: '',
          }))
        );
      }
    }
  }, [isOpen, plannedSessions, actualSessions, generateId]);

  const updateSession = useCallback((id: string, updates: Partial<ActualTrainingSession>) => {
    setSessions((prev) =>
      prev.map((s) => (s._id === id ? { ...s, ...updates } : s))
    );
  }, []);

  const addSession = useCallback(() => {
    if (sessions.length >= 10) return;
    setSessions((prev) => [
      ...prev,
      { _id: generateId(), type: 'walking', durationMin: 30, perceivedIntensity: undefined, notes: '' },
    ]);
  }, [sessions.length, generateId]);

  const removeSession = useCallback((id: string) => {
    setSessions((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((s) => s._id !== id);
    });
  }, []);

  const handleSave = async () => {
    // Strip _id before saving
    const sessionsWithoutId = sessions.map(({ _id, ...rest }) => rest);
    const didSave = await onSave(sessionsWithoutId);
    if (didSave) {
      onClose();
    }
  };

  const getPlannedComparison = (index: number) => {
    const planned = plannedSessions[index];
    if (!planned) return null;
    const actual = sessions[index];
    if (!actual) return null;

    const typeDiff = planned.type !== actual.type;
    const durationDiff = planned.durationMin !== actual.durationMin;

    if (!typeDiff && !durationDiff) return null;

    return (
      <div className="text-xs text-yellow-400 mt-2 flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span>
          Planned: {TRAINING_OPTIONS.find((o) => o.value === planned.type)?.label},{' '}
          {planned.durationMin} min
        </span>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Actual Training">
      <div className="space-y-4">
        {/* Summary */}
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">
            {sessions.filter((s) => s.type !== 'rest').length === 0
              ? 'Rest day'
              : `${sessions.length} session${sessions.length > 1 ? 's' : ''}, ${sessions.reduce(
                  (sum, s) => sum + s.durationMin,
                  0
                )} min total`}
          </span>
          {sessions.length < 10 && (
            <button
              type="button"
              onClick={addSession}
              className="text-sm text-white hover:text-gray-300 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Session
            </button>
          )}
        </div>

        {/* Session list */}
        <div className="space-y-4 max-h-[50vh] overflow-y-auto">
          {sessions.map((session, index) => (
            <div
              key={session._id}
              className="bg-gray-800/50 rounded-lg p-4 relative border border-gray-700"
            >
              {/* Delete button */}
              {sessions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSession(session._id)}
                  className="absolute top-2 right-2 text-gray-500 hover:text-red-400 p-1"
                  title="Remove session"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}

              {/* Session number */}
              <div className="text-xs text-gray-500 mb-3">Session {index + 1}</div>

              {/* Type and Duration */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Type</label>
                  <select
                    value={session.type}
                    onChange={(e) => {
                      const newType = e.target.value as TrainingType;
                      updateSession(session._id, {
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

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Duration</label>
                  <input
                    type="number"
                    value={session.type === 'rest' ? '' : session.durationMin}
                    onChange={(e) =>
                      updateSession(session._id, { durationMin: parseInt(e.target.value) || 0 })
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

              {/* Intensity */}
              {session.type !== 'rest' && (
                <div className="mb-4">
                  <IntensitySelector
                    value={session.perceivedIntensity}
                    onChange={(val) => updateSession(session._id, { perceivedIntensity: val })}
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Notes</label>
                <textarea
                  value={session.notes || ''}
                  onChange={(e) => updateSession(session._id, { notes: e.target.value })}
                  placeholder="How did it feel? Any observations..."
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 resize-none"
                />
              </div>

              {/* Planned comparison */}
              {getPlannedComparison(index)}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white text-sm transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-white hover:bg-gray-200 rounded-lg text-black text-sm font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Actual Training'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
