import { useState, useEffect, useMemo } from 'react';
import type { TrainingProgram, ProgramDay, SessionResponse } from '../../api/types';
import { getTrainingProgram, deleteTrainingProgram, quickSubmitSession } from '../../api/client';
import { Modal } from '../common/Modal';
import { WaveformChart } from './WaveformChart';
import { ProgramInstaller } from './ProgramInstaller';
import { ActiveSessionView, type SessionResult } from './ActiveSessionView';
import { DraftSessionCard } from '../training/DraftSessionCard';
import { DIFFICULTY_COLORS, FOCUS_COLORS, EQUIPMENT_CONFIG } from './constants';
import { TRAINING_ICONS } from '../../constants';
import { useActiveInstallation } from '../../contexts/ActiveInstallationContext';

interface ProgramDetailModalProps {
  programId: number;
  onClose: () => void;
  onInstallationChange?: () => void | Promise<void>;
  onDeleted?: () => void;
}

/**
 * Full detail view for a training program with waveform visualization.
 */
export function ProgramDetailModal({ programId, onClose, onInstallationChange, onDeleted }: ProgramDetailModalProps) {
  const [program, setProgram] = useState<TrainingProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInstaller, setShowInstaller] = useState(false);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [activeSessionDay, setActiveSessionDay] = useState<ProgramDay | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [draftSession, setDraftSession] = useState<SessionResponse | null>(null);

  const { installation: activeInstallation } = useActiveInstallation();
  const isActiveProgram = activeInstallation?.programId === programId;

  // Days that have session exercises defined
  const daysWithExercises = useMemo<ProgramDay[]>(() => {
    if (!program?.weeks) return [];
    const days: ProgramDay[] = [];
    for (const week of program.weeks) {
      for (const day of week.days) {
        if (day.sessionExercises && day.sessionExercises.length > 0) {
          // Deduplicate by label (days repeat across weeks; use week 1 template)
          if (!days.some((d) => d.label === day.label)) {
            days.push(day);
          }
        }
      }
    }
    return days;
  }, [program]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchProgram() {
      try {
        setLoading(true);
        setError(null);
        const data = await getTrainingProgram(programId, controller.signal);
        setProgram(data);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError('Failed to load program details');
      } finally {
        setLoading(false);
      }
    }

    fetchProgram();

    return () => controller.abort();
  }, [programId]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteTrainingProgram(programId, { force: isActiveProgram });
      setShowDeleteConfirm(false);
      onDeleted?.();
    } catch (err) {
      console.error('Failed to delete program:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Draft session card (shown after completing a session)
  if (draftSession) {
    return (
      <Modal isOpen={true} title="Session Complete" onClose={() => { setDraftSession(null); onClose(); }}>
        <div className="py-4">
          <p className="text-sm text-gray-400 mb-4">
            Your session has been logged. Add a post-workout echo to enrich it with body feedback.
          </p>
          <DraftSessionCard
            session={draftSession}
            onUpdate={() => { setDraftSession(null); onClose(); }}
            onFinalize={() => { setDraftSession(null); onClose(); }}
          />
        </div>
      </Modal>
    );
  }

  // Active session overlay
  if (activeSessionDay?.sessionExercises) {
    return (
      <ActiveSessionView
        exercises={activeSessionDay.sessionExercises}
        onComplete={async (result: SessionResult) => {
          setActiveSessionDay(null);
          // Persist as draft session
          const today = new Date().toISOString().split('T')[0];
          try {
            const rpes = result.exercises.map((e) => e.rpe);
            const avgRpe = rpes.length > 0
              ? Math.round(rpes.reduce((a, b) => a + b, 0) / rpes.length)
              : 5;
            const durationMin = Math.round(result.totalDurationSec / 60);
            const draft = await quickSubmitSession(today, {
              type: activeSessionDay.trainingType,
              durationMin,
              perceivedIntensity: avgRpe,
              notes: `Program session: ${activeSessionDay.label}`,
            });
            setDraftSession(draft);
          } catch (err) {
            console.error('Failed to submit session as draft:', err);
          }
        }}
        onAbort={() => {
          setActiveSessionDay(null);
        }}
      />
    );
  }

  if (showInstaller && program) {
    return (
      <ProgramInstaller
        program={program}
        onClose={() => setShowInstaller(false)}
        onInstalled={async () => {
          setShowInstaller(false);
          await onInstallationChange?.();
          onClose();
        }}
      />
    );
  }

  return (
    <Modal isOpen={true} title="Program Details" onClose={onClose}>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : error || !program ? (
        <div className="text-center py-12">
          <p className="text-red-400">{error || 'Program not found'}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-semibold text-white mb-2">{program.name}</h2>
            {program.description && (
              <p className="text-slate-400">{program.description}</p>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            <span
              className={`px-3 py-1 rounded-full text-sm ${DIFFICULTY_COLORS[program.difficulty].bg} ${DIFFICULTY_COLORS[program.difficulty].text}`}
            >
              {DIFFICULTY_COLORS[program.difficulty].label}
            </span>
            <span
              className={`px-3 py-1 rounded-full text-sm ${FOCUS_COLORS[program.focus].bg} ${FOCUS_COLORS[program.focus].text}`}
            >
              {FOCUS_COLORS[program.focus].icon} {FOCUS_COLORS[program.focus].label}
            </span>
            {program.equipment.map((eq) => (
              <span
                key={eq}
                className="px-3 py-1 rounded-full text-sm bg-slate-700/50 text-slate-400"
              >
                {EQUIPMENT_CONFIG[eq]?.icon} {EQUIPMENT_CONFIG[eq]?.label || eq}
              </span>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{program.durationWeeks}</div>
              <div className="text-sm text-slate-400">Weeks</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{program.trainingDaysPerWeek}</div>
              <div className="text-sm text-slate-400">Days/Week</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {program.weeks?.reduce((acc, w) => acc + w.days.length, 0) || '-'}
              </div>
              <div className="text-sm text-slate-400">Total Sessions</div>
            </div>
          </div>

          {/* Waveform Chart */}
          {program.weeks && program.weeks.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-white mb-3">Periodization</h3>
              <WaveformChart programId={program.id} />
            </div>
          )}

          {/* Week breakdown */}
          {program.weeks && program.weeks.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-white mb-3">Weekly Structure</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {program.weeks.map((week) => (
                  <div
                    key={week.weekNumber}
                    className={`p-3 rounded-lg ${week.isDeload ? 'bg-emerald-900/20 border border-emerald-800/30' : 'bg-slate-800/50'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-white">
                        {week.label}
                        {week.isDeload && (
                          <span className="ml-2 text-xs text-emerald-400">(Deload)</span>
                        )}
                      </span>
                      <span className="text-sm text-slate-400">
                        Vol: {(week.volumeScale * 100).toFixed(0)}% | Int:{' '}
                        {(week.intensityScale * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {week.days.map((day) => (
                        <span
                          key={day.dayNumber}
                          className="px-2 py-0.5 text-xs bg-slate-700/50 text-slate-300 rounded"
                          title={`${day.durationMin}min - ${day.trainingType}`}
                        >
                          {day.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-700 relative">
            {/* Left side - Delete */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/50 rounded-lg transition-colors"
            >
              Decommission
            </button>

            {/* Right side - other actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>

              {/* Play Session button (only if days have exercises) */}
              {daysWithExercises.length > 0 && (
                <button
                  onClick={() => {
                    if (daysWithExercises.length === 1) {
                      setActiveSessionDay(daysWithExercises[0]);
                    } else {
                      setShowSessionPicker(!showSessionPicker);
                    }
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg
                             transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Play Session
                </button>
              )}

              <button
                onClick={() => setShowInstaller(true)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                           transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Install Program
              </button>
            </div>

            {/* Day picker dropdown */}
            {showSessionPicker && (
              <div className="absolute bottom-full right-0 mb-2 z-20 bg-slate-800 border border-slate-700 rounded-lg shadow-lg shadow-black/30 py-1 min-w-[200px]">
                <p className="text-xs text-slate-500 px-3 py-1">Choose a training day</p>
                {daysWithExercises.map((day) => (
                  <button
                    key={day.label}
                    type="button"
                    onClick={() => {
                      setActiveSessionDay(day);
                      setShowSessionPicker(false);
                    }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    <span>{TRAINING_ICONS[day.trainingType] || '🏋️'}</span>
                    <span>{day.label}</span>
                    <span className="ml-auto text-xs text-slate-500">
                      {day.sessionExercises?.length ?? 0} exercises
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Delete confirmation overlay */}
          {showDeleteConfirm && (
            <div className="absolute inset-0 z-30 bg-black/80 rounded-xl flex items-center justify-center p-4">
              <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full text-center border border-slate-700">
                <h3 className="text-lg font-semibold text-red-400 mb-3">DECOMMISSION PROTOCOL</h3>
                <p className="text-sm text-slate-300 mb-4">
                  {isActiveProgram
                    ? `Deleting "${program.name}" will remove all future planned sessions from your calendar. This action cannot be undone.`
                    : `Delete "${program.name}"? This action cannot be undone.`}
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors
                               disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isDeleting && (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                    )}
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
