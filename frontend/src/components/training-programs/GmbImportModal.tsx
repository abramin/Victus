import { useState } from 'react';
import { createTrainingProgram } from '../../api/client';
import { buildGmbProgram, type GmbTrack, type GmbDuration } from './gmbImporter';

interface GmbImportModalProps {
  onClose: () => void;
  onCreated: (programId: number) => void;
}

const TRACK_OPTIONS: { value: GmbTrack; label: string; desc: string }[] = [
  { value: 'standard', label: 'Standard', desc: '42 sessions · 14 weeks · beginner-friendly pacing' },
  { value: 'accelerated', label: 'Accelerated', desc: '41 sessions · ~14 weeks · faster skill progression' },
];

const DURATION_OPTIONS: { value: GmbDuration; label: string }[] = [
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
];

/**
 * Modal for importing GMB Elements sessions as a training program.
 * Offers track selection and preferred session duration.
 */
export function GmbImportModal({ onClose, onCreated }: GmbImportModalProps) {
  const [track, setTrack] = useState<GmbTrack>('standard');
  const [duration, setDuration] = useState<GmbDuration>('30');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    setLoading(true);
    setError(null);
    try {
      const request = await buildGmbProgram(track, duration);
      const program = await createTrainingProgram(request);
      onCreated(program.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Import GMB Elements</h2>
            <p className="text-sm text-slate-400 mt-0.5">Creates a training program from GMB Elements sessions</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Track selection */}
        <div className="mb-5">
          <p className="text-sm font-medium text-slate-300 mb-2">Track</p>
          <div className="space-y-2">
            {TRACK_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTrack(opt.value)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                  track === opt.value
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }`}
              >
                <p className={`font-medium text-sm ${track === opt.value ? 'text-emerald-400' : 'text-white'}`}>
                  {opt.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Duration selection */}
        <div className="mb-6">
          <p className="text-sm font-medium text-slate-300 mb-2">Preferred session length</p>
          <div className="flex gap-2">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDuration(opt.value)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                  duration === opt.value
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:text-white hover:border-slate-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-400 mb-4">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 text-slate-400 hover:text-white border border-slate-700 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={loading}
            className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />}
            {loading ? 'Importing…' : 'Import Program'}
          </button>
        </div>
      </div>
    </div>
  );
}
