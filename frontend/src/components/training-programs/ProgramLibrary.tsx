import { useState, useEffect, useCallback } from 'react';
import type { ProgramSummary, ProgramDifficulty, ProgramFocus } from '../../api/types';
import { listTrainingPrograms } from '../../api/client';
import { ProgramCard } from './ProgramCard';
import { ProgramDetailModal } from './ProgramDetailModal';
import { ProgramBuilder } from './ProgramBuilder';
import { DIFFICULTY_COLORS, FOCUS_COLORS } from './constants';

/**
 * Main program library view with filtering and card grid.
 * Features poster-style cards with hover effects.
 */
export function ProgramLibrary() {
  const [programs, setPrograms] = useState<ProgramSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [difficultyFilter, setDifficultyFilter] = useState<ProgramDifficulty | ''>('');
  const [focusFilter, setFocusFilter] = useState<ProgramFocus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected program for detail modal
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);

  // Program builder modal
  const [showBuilder, setShowBuilder] = useState(false);

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
            templatesOnly: true,
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
        templatesOnly: false, // Show user's custom programs too
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

        {/* Create custom button */}
        <button
          onClick={() => setShowBuilder(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
                     transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          + Create Custom
        </button>
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
          {filteredPrograms.map((program) => (
            <ProgramCard
              key={program.id}
              program={program}
              onClick={() => setSelectedProgramId(program.id)}
            />
          ))}
        </div>
      )}

      {/* Detail modal */}
      {selectedProgramId !== null && (
        <ProgramDetailModal
          programId={selectedProgramId}
          onClose={() => setSelectedProgramId(null)}
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
