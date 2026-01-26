import { useState, useEffect } from 'react';
import type { TrainingProgram } from '../../api/types';
import { getTrainingProgram } from '../../api/client';
import { Modal } from '../common/Modal';
import { WaveformChart } from './WaveformChart';
import { ProgramInstaller } from './ProgramInstaller';
import { DIFFICULTY_COLORS, FOCUS_COLORS, EQUIPMENT_CONFIG } from './constants';

interface ProgramDetailModalProps {
  programId: number;
  onClose: () => void;
}

/**
 * Full detail view for a training program with waveform visualization.
 */
export function ProgramDetailModal({ programId, onClose }: ProgramDetailModalProps) {
  const [program, setProgram] = useState<TrainingProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInstaller, setShowInstaller] = useState(false);

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

  if (showInstaller && program) {
    return (
      <ProgramInstaller
        program={program}
        onClose={() => setShowInstaller(false)}
        onInstalled={() => {
          setShowInstaller(false);
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
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowInstaller(true)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                         transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Install Program
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
