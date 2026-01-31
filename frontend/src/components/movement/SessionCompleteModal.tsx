import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Movement, UserMovementProgress, MovementProgressionInput, FormCorrectionResult } from '../../api/types';
import { completeMovementSession, analyzeFormCorrection } from '../../api/client';

interface SessionCompleteModalProps {
  movement: Movement;
  currentProgress: UserMovementProgress | null;
  onClose: () => void;
  onComplete: (result: UserMovementProgress) => void;
}

export function SessionCompleteModal({ movement, currentProgress, onClose, onComplete }: SessionCompleteModalProps) {
  const [targetReps, setTargetReps] = useState(10);
  const [completedReps, setCompletedReps] = useState(10);
  const [rpe, setRpe] = useState(7);
  const [hadFormIssue, setHadFormIssue] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<UserMovementProgress | null>(null);
  const [leveledUp, setLeveledUp] = useState(false);
  const [error, setError] = useState('');

  // Form correction
  const [showFormReport, setShowFormReport] = useState(false);
  const [formFeedback, setFormFeedback] = useState('');
  const [formAnalysis, setFormAnalysis] = useState<FormCorrectionResult | null>(null);
  const [analyzingForm, setAnalyzingForm] = useState(false);

  const prevDifficulty = currentProgress?.userDifficulty ?? movement.difficulty;

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      const input: MovementProgressionInput = { completedReps, targetReps, rpe, hadFormIssue };
      const res = await completeMovementSession(movement.id, input);
      setResult(res);
      setLeveledUp(res.userDifficulty > prevDifficulty);
      onComplete(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save session');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFormAnalysis() {
    if (!formFeedback.trim()) return;
    setAnalyzingForm(true);
    try {
      const res = await analyzeFormCorrection({
        movementId: movement.id,
        movementName: movement.name,
        userFeedback: formFeedback,
      });
      setFormAnalysis(res);
    } catch {
      // silently fail — AI feature
    } finally {
      setAnalyzingForm(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-800 rounded-xl p-6 max-w-md w-full border border-slate-700 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white mb-1">{movement.name}</h2>
        <p className="text-xs text-slate-400 mb-5">Log session · Current Lv {prevDifficulty}</p>

        {!result ? (
          <>
            {/* Reps */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Target Reps</label>
                <input
                  type="number"
                  min={1}
                  value={targetReps}
                  onChange={(e) => setTargetReps(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Completed Reps</label>
                <input
                  type="number"
                  min={0}
                  value={completedReps}
                  onChange={(e) => setCompletedReps(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* RPE */}
            <div className="mb-4">
              <label className="text-[11px] text-slate-400 block mb-2">RPE (1-10)</label>
              <div className="flex gap-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
                  <button
                    key={v}
                    onClick={() => setRpe(v)}
                    className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                      v === rpe
                        ? v <= 6 ? 'bg-emerald-600 text-white' : v <= 8 ? 'bg-amber-600 text-white' : 'bg-red-600 text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Form issue toggle */}
            <label className="flex items-center gap-2 mb-5 cursor-pointer">
              <input
                type="checkbox"
                checked={hadFormIssue}
                onChange={(e) => setHadFormIssue(e.target.checked)}
                className="rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-300">Had form issue</span>
            </label>

            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Complete'}
              </button>
            </div>
          </>
        ) : (
          /* Result view */
          <div className="text-center">
            <AnimatePresence>
              {leveledUp && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="text-3xl mb-2"
                >
                  <span className="text-amber-400 font-bold">LEVEL UP!</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-center gap-6 my-4">
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Difficulty</p>
                <p className="text-2xl font-mono text-white">{result.userDifficulty}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase">Sessions</p>
                <p className="text-2xl font-mono text-white">{result.successfulSessions}/3</p>
              </div>
            </div>

            {/* Form correction */}
            {hadFormIssue && (
              <div className="mt-4 text-left">
                {!showFormReport ? (
                  <button
                    onClick={() => setShowFormReport(true)}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Report form issue for AI analysis
                  </button>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      placeholder="Describe the form issue..."
                      value={formFeedback}
                      onChange={(e) => setFormFeedback(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleFormAnalysis}
                      disabled={analyzingForm || !formFeedback.trim()}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs disabled:opacity-50"
                    >
                      {analyzingForm ? 'Analyzing...' : 'Analyze'}
                    </button>
                    {formAnalysis && (
                      <div className="bg-slate-900 rounded-lg p-3 text-xs space-y-2 border border-slate-700">
                        <div>
                          <p className="text-red-400 font-medium">Mechanical Error</p>
                          <p className="text-slate-300">{formAnalysis.mechanicalError}</p>
                        </div>
                        <div>
                          <p className="text-emerald-400 font-medium">Tactical Cue</p>
                          <p className="text-slate-300">{formAnalysis.tacticalCue}</p>
                        </div>
                        {formAnalysis.regression && (
                          <div>
                            <p className="text-amber-400 font-medium">Regression</p>
                            <p className="text-slate-300">{formAnalysis.regression}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={onClose}
              className="mt-5 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
