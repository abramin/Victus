import { useState } from 'react';
import { RadialIntensitySelector } from './RadialIntensitySelector';
import { TrainingTypeCards } from './TrainingTypeCards';
import { SemanticHighlighter } from '../semantic/SemanticHighlighter';
import type { TrainingType, Archetype } from '../../api/types';
import type { SemanticToken } from '../semantic/semanticDictionary';
import { formatNumber } from '../../utils/format';

// Load score coefficients matching backend
const TRAINING_LOAD_SCORES: Record<TrainingType, number> = {
  rest: 0,
  qigong: 0.5,
  mobility: 0.5,
  walking: 1,
  cycle: 2,
  gmb: 3,
  run: 3,
  row: 3,
  calisthenics: 3,
  mixed: 4,
  strength: 5,
  hiit: 5,
};

const DEFAULT_RPE = 5;

interface SessionData {
  _id: string;
  type: TrainingType;
  durationMin: number;
  perceivedIntensity?: number;
  notes?: string;
  committed: boolean;
  archetype?: Archetype;
}

interface AtomicSessionCardProps {
  session: SessionData;
  index: number;
  totalCount: number;
  saving: boolean;
  onUpdate: (id: string, updates: Partial<SessionData>) => void;
  onCommit: (id: string) => void;
  onUncommit: (id: string) => void;
  onRemove: (id: string) => void;
  onTokensChange: (id: string, tokens: SemanticToken[]) => void;
}

function getSessionLoadScore(session: SessionData): number {
  if (session.type === 'rest') return 0;
  const loadScore = TRAINING_LOAD_SCORES[session.type] ?? 1;
  const durationFactor = session.durationMin / 60;
  const rpeValue = session.perceivedIntensity ?? DEFAULT_RPE;
  const rpeFactor = rpeValue / 3;
  return Math.round(loadScore * durationFactor * rpeFactor * 100) / 100;
}

function getLoadTone(score: number) {
  if (score <= 0) return { label: 'No Load', className: 'text-gray-500' };
  if (score <= 1) return { label: 'Very Low', className: 'text-emerald-400' };
  if (score <= 3) return { label: 'Low Stress', className: 'text-green-400' };
  if (score <= 6) return { label: 'Moderate Stress', className: 'text-yellow-400' };
  if (score <= 10) return { label: 'High Stress', className: 'text-orange-400' };
  return { label: 'Max Stress', className: 'text-red-400' };
}

export function AtomicSessionCard({
  session,
  index,
  totalCount,
  saving,
  onUpdate,
  onCommit,
  onUncommit,
  onRemove,
  onTokensChange,
}: AtomicSessionCardProps) {
  const [notesExpanded, setNotesExpanded] = useState(
    (session.notes ?? '').trim().length > 0
  );

  const loadScore = getSessionLoadScore(session);
  const loadTone = getLoadTone(loadScore);
  const hasNotes = (session.notes ?? '').trim().length > 0;
  const isNotesVisible = notesExpanded || hasNotes;
  const isCommitted = session.committed;
  const canDelete = !isCommitted;

  const handleTypeChange = (newType: TrainingType) => {
    onUpdate(session._id, {
      type: newType,
      durationMin: newType === 'rest' ? 0 : session.durationMin || 30,
      perceivedIntensity: newType === 'rest' ? undefined : session.perceivedIntensity,
    });
  };

  return (
    <div
      className={`bg-gray-900 rounded-xl p-4 border-2 transition-colors ${isCommitted
          ? 'border-emerald-600 bg-emerald-950/20'
          : 'border-gray-800'
        }`}
    >
      {/* Header: Session number + committed indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-400">Session {index + 1}</span>
          {isCommitted && (
            <span className="text-xs px-2 py-0.5 bg-emerald-900/50 text-emerald-300 rounded-full">
              Saved
            </span>
          )}
        </div>
      </div>

      {/* Training Type Selection */}
      <div className="mb-4">
        <TrainingTypeCards
          value={session.type}
          onChange={handleTypeChange}
          disabled={saving || isCommitted}
        />

        {/* Duration Input */}
        {session.type !== 'rest' && (
          <div className="flex items-center gap-2 mt-3">
            <span className="text-sm text-gray-400">Duration:</span>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors">
              <span className="text-gray-400">⏱</span>
              <input
                type="number"
                value={session.durationMin}
                onChange={(e) =>
                  onUpdate(session._id, {
                    durationMin: parseInt(e.target.value) || 0,
                  })
                }
                min={0}
                max={480}
                step={5}
                aria-label="Duration in minutes"
                disabled={saving || isCommitted}
                className="w-12 bg-transparent text-white text-sm font-medium focus:outline-none placeholder-gray-500 disabled:opacity-50"
              />
              <span className="text-xs text-gray-500">min</span>
            </div>
          </div>
        )}
      </div>

      {/* RPE Dial */}
      {session.type !== 'rest' && (
        <>
          <div className="flex justify-center my-4">
            <RadialIntensitySelector
              value={session.perceivedIntensity}
              onChange={(val) => onUpdate(session._id, { perceivedIntensity: val })}
              disabled={saving || isCommitted}
            />
          </div>

          {/* Load Output */}
          <div className="text-center mt-6 p-3 bg-slate-800 rounded-lg border border-slate-700">
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg">⚡</span>
              <span className="text-xl font-bold text-white">
                LOAD: {formatNumber(loadScore, 1)}
              </span>
            </div>
            <p className={`text-xs mt-1 ${loadTone.className}`}>
              ({loadTone.label})
            </p>
          </div>
        </>
      )}

      {/* Notes Section */}
      <div className="mt-4 pt-4 border-t border-gray-800">
        {isNotesVisible ? (
          <SemanticHighlighter
            value={session.notes || ''}
            onChange={(value) => onUpdate(session._id, { notes: value })}
            placeholder="How did it feel? Any observations..."
            rows={2}
            disabled={saving || isCommitted}
            onTokensChange={(tokens) => onTokensChange(session._id, tokens)}
          />
        ) : (
          !isCommitted && (
            <button
              type="button"
              onClick={() => setNotesExpanded(true)}
              className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
              disabled={saving}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Note
            </button>
          )
        )}
      </div>

      {/* Action Tray */}
      <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between">
        {isCommitted ? (
          /* Committed state: Edit button */
          <button
            type="button"
            onClick={() => onUncommit(session._id)}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
            disabled={saving}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Edit
          </button>
        ) : (
          /* Editing state: Save + Delete buttons */
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onCommit(session._id)}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-2"
              disabled={saving}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => onRemove(session._id)}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-red-400 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
                disabled={saving}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            )}
          </div>
        )}

        {/* Clear RPE button (only in editing state) */}
        {!isCommitted && session.type !== 'rest' && session.perceivedIntensity !== undefined && (
          <button
            type="button"
            onClick={() => onUpdate(session._id, { perceivedIntensity: undefined })}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            disabled={saving}
          >
            Clear RPE
          </button>
        )}
      </div>
    </div>
  );
}
