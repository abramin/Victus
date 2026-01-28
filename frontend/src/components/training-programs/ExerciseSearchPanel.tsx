import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExerciseNode } from './ExerciseNode';
import {
  EXERCISES_BY_SOURCE,
  SOURCE_LABELS,
  type ExerciseDef,
  type ExerciseSource,
} from './exerciseLibrary';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ExerciseSearchPanelProps {
  // Exercises handle their own drag events via ExerciseNode
}

const SOURCE_ORDER: ExerciseSource[] = ['gmb', 'calimove', 'barbell', 'bodyweight'];

/**
 * Left column panel for searching and browsing exercises.
 * Groups exercises by source with collapsible sections.
 */
export function ExerciseSearchPanel(_props: ExerciseSearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Set<ExerciseSource>>(new Set());

  // Filter exercises by search query
  const filteredBySource = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const result: Record<ExerciseSource, ExerciseDef[]> = {
      gmb: [],
      calimove: [],
      barbell: [],
      bodyweight: [],
    };

    for (const source of SOURCE_ORDER) {
      const exercises = EXERCISES_BY_SOURCE[source];
      if (!query) {
        result[source] = exercises;
      } else {
        result[source] = exercises.filter(
          (ex) =>
            ex.name.toLowerCase().includes(query) ||
            ex.tags.some((tag) => tag.toLowerCase().includes(query))
        );
      }
    }

    return result;
  }, [searchQuery]);

  // Count total matches
  const totalMatches = useMemo(() => {
    return SOURCE_ORDER.reduce((sum, source) => sum + filteredBySource[source].length, 0);
  }, [filteredBySource]);

  const toggleSection = (source: ExerciseSource) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(source)) {
        next.delete(source);
      } else {
        next.add(source);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-700">
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Exercise Library
        </h3>
        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search exercises..."
            className="w-full px-3 py-1.5 pl-8 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-1.5 text-xs text-gray-500">
            {totalMatches} exercise{totalMatches !== 1 ? 's' : ''} found
          </p>
        )}
      </div>

      {/* Exercise list by source */}
      <div className="flex-1 overflow-y-auto">
        {SOURCE_ORDER.map((source) => {
          const exercises = filteredBySource[source];
          const isCollapsed = collapsedSections.has(source);
          const hasExercises = exercises.length > 0;

          if (!hasExercises && searchQuery) return null;

          return (
            <div key={source} className="border-b border-gray-800">
              {/* Section header */}
              <button
                onClick={() => toggleSection(source)}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <SourceIcon source={source} />
                  <span className="text-sm font-medium text-gray-300">
                    {SOURCE_LABELS[source]}
                  </span>
                  <span className="text-xs text-gray-500">({exercises.length})</span>
                </div>
                <motion.svg
                  animate={{ rotate: isCollapsed ? -90 : 0 }}
                  className="w-4 h-4 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </motion.svg>
              </button>

              {/* Exercise nodes */}
              <AnimatePresence initial={false}>
                {!isCollapsed && hasExercises && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-2 pb-2 space-y-1">
                      {exercises.map((exercise) => (
                        <ExerciseNode
                          key={exercise.id}
                          exerciseDef={exercise}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Help text */}
      <div className="p-3 border-t border-gray-700">
        <p className="text-xs text-gray-500 text-center">
          Drag exercises to the canvas
        </p>
      </div>
    </div>
  );
}

/**
 * Icon for each exercise source.
 */
function SourceIcon({ source }: { source: ExerciseSource }) {
  const iconClass = 'w-4 h-4';

  switch (source) {
    case 'gmb':
      return <span className={iconClass}>🐻</span>;
    case 'calimove':
      return <span className={iconClass}>🤸</span>;
    case 'barbell':
      return <span className={iconClass}>🏋️</span>;
    case 'bodyweight':
      return <span className={iconClass}>💪</span>;
  }
}
