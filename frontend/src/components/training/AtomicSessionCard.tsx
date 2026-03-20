import { useState } from 'react';
import { IntensityLoadSelector } from './IntensityLoadSelector';
import { TrainingTypeCards } from './TrainingTypeCards';
import { SemanticHighlighter } from '../semantic/SemanticHighlighter';
import type { TrainingType, Archetype } from '../../api/types';
import type { SemanticToken } from '../semantic/semanticDictionary';

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
          excludeTypes={['rest']}
        />

        {/* Duration Input */}
        {session.type !== 'rest' && (
          <div className="mt-3">
            <span className="text-sm text-gray-400 mb-2 block">Duration</span>

            {/* Preset buttons */}
            <div className="flex flex-wrap gap-2 mb-2">
              {[15, 30, 45, 60, 90].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onUpdate(session._id, { durationMin: preset })}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    session.durationMin === preset
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                  disabled={saving || isCommitted}
                >
                  {preset}m
                </button>
              ))}
            </div>

            {/* Number input for custom values */}
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

      {/* Intensity & Load Selector */}
      {session.type !== 'rest' && (
        <div className="flex justify-center my-4">
          <IntensityLoadSelector
            value={session.perceivedIntensity}
            onChange={(val) => onUpdate(session._id, { perceivedIntensity: val })}
            durationMin={session.durationMin}
            trainingType={session.type}
            disabled={saving || isCommitted}
          />
        </div>
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
