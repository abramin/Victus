import { useState, useEffect, useCallback } from 'react';
import type { ProgramSummary, ProgramDifficulty, ProgramFocus } from '../../api/types';
import { listTrainingPrograms, deleteTrainingProgram } from '../../api/client';
import { ProgramCard } from './ProgramCard';
import { ProgramDetailModal } from './ProgramDetailModal';
import { ProgramBuilder } from './ProgramBuilder';
import { DIFFICULTY_COLORS, FOCUS_COLORS } from './constants';
import { useActiveInstallation } from '../../contexts/ActiveInstallationContext';

/**
 * Main program library view with filtering and card grid.
 * Features poster-style cards with hover effects.
 */
export function ProgramLibrary() {
  const [programs, setPrograms] = useState<ProgramSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active installation context
  const { installation: activeInstallation, refresh: refreshInstallation } = useActiveInstallation();

  // Filters
  const [difficultyFilter, setDifficultyFilter] = useState<ProgramDifficulty | ''>('');
  const [focusFilter, setFocusFilter] = useState<ProgramFocus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected program for detail modal
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);

  // Program builder modal
  const [showBuilder, setShowBuilder] = useState(false);

  // Delete confirmation state
  const [confirmingDelete, setConfirmingDelete] = useState<ProgramSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchPrograms() {
      try {
        setLoading(true);
        setError(null);

        const data = await listTrainingPrograms(
          {
            difficulty: difficultyFilter || undefined,
            focus: focusFilter || undefined,
          },
          controller.signal
        );

        setPrograms(data);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError('Failed to load programs');
      } finally {
        setLoading(false);
      }
    }

    fetchPrograms();

    return () => controller.abort();
  }, [difficultyFilter, focusFilter]);

  // Refresh function for after creating a program
  const refreshPrograms = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listTrainingPrograms({
        difficulty: difficultyFilter || undefined,
        focus: focusFilter || undefined,
      });
      setPrograms(data);
    } catch (err) {
      console.error('Failed to refresh programs:', err);
    } finally {
      setLoading(false);
    }
  }, [difficultyFilter, focusFilter]);

  // Handle program created
  const handleProgramCreated = (programId: number) => {
    setShowBuilder(false);
    refreshPrograms();
    setSelectedProgramId(programId);
  };

  // Handle delete confirmation
  const handleConfirmDelete = async () => {
    if (!confirmingDelete) return;

    const programId = confirmingDelete.id;
    const isActiveProgram = activeInstallation?.programId === programId;

    setIsDeleting(true);
    try {
      await deleteTrainingProgram(programId, { force: isActiveProgram });
      setConfirmingDelete(null);
      await refreshPrograms();
      if (isActiveProgram) {
        await refreshInstallation();
      }
    } catch (err) {
      console.error('Failed to delete program:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter by search query (client-side)
  const filteredPrograms = searchQuery
    ? programs.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : programs;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white mb-2">Training Programs</h1>
        <p className="text-slate-400">
          Browse structured training protocols or create your own custom program.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Search */}
        <input
          type="text"
          placeholder="Search programs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg
                     text-slate-100 placeholder-slate-500
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        {/* Difficulty filter */}
        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value as ProgramDifficulty | '')}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Levels</option>
          {Object.entries(DIFFICULTY_COLORS).map(([key, config]) => (
            <option key={key} value={key}>
              {config.label}
            </option>
          ))}
        </select>

        {/* Focus filter */}
        <select
          value={focusFilter}
          onChange={(e) => setFocusFilter(e.target.value as ProgramFocus | '')}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Focus</option>
          {Object.entries(FOCUS_COLORS).map(([key, config]) => (
            <option key={key} value={key}>
              {config.icon} {config.label}
            </option>
          ))}
        </select>

        {/* Create custom button - always visible */}
        <button
          onClick={() => setShowBuilder(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                     transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          + Create Custom
        </button>

        {/* Manage active button - only when active installation exists */}
        {activeInstallation && (
          <button
            onClick={() => setSelectedProgramId(activeInstallation.programId)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg
                       transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500
                       flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Manage Active
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      ) : filteredPrograms.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-400 mb-2">No programs found</p>
          <p className="text-slate-500 text-sm">
            {searchQuery || difficultyFilter || focusFilter
              ? 'Try adjusting your filters'
              : 'Create your first custom program to get started'}
          </p>
        </div>
      ) : (
        /* Program card grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrograms.map((program) => {
            const isActive = activeInstallation?.programId === program.id;
            return (
              <ProgramCard
                key={program.id}
                program={program}
                onClick={() => setSelectedProgramId(program.id)}
                isActive={isActive}
                progress={isActive && activeInstallation?.program ? {
                  currentWeek: activeInstallation.currentWeek,
                  totalWeeks: activeInstallation.program.durationWeeks,
                } : undefined}
                onDelete={() => setConfirmingDelete(program)}
              />
            );
          })}
        </div>
      )}

      {/* Delete confirmation dialog */}
      {confirmingDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full text-center border border-slate-700 shadow-xl">
            <h3 className="text-lg font-semibold text-red-400 mb-3">DECOMMISSION PROTOCOL</h3>
            <p className="text-sm text-slate-300 mb-4">
              {activeInstallation?.programId === confirmingDelete.id
                ? `Deleting "${confirmingDelete.name}" will remove all future planned sessions from your calendar. This action cannot be undone.`
                : `Delete "${confirmingDelete.name}"? This action cannot be undone.`}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setConfirmingDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
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

      {/* Detail modal */}
      {selectedProgramId !== null && (
        <ProgramDetailModal
          programId={selectedProgramId}
          onClose={() => setSelectedProgramId(null)}
          onInstallationChange={refreshInstallation}
          onDeleted={() => {
            setSelectedProgramId(null);
            refreshPrograms();
            refreshInstallation();
          }}
        />
      )}

      {/* Program builder modal */}
      {showBuilder && (
        <ProgramBuilder
          onClose={() => setShowBuilder(false)}
          onCreated={handleProgramCreated}
        />
      )}
    </div>
  );
}
