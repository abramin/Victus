import { useState, useRef, useEffect } from 'react';
import type { ProgramSummary } from '../../api/types';
import { DIFFICULTY_COLORS, FOCUS_COLORS, EQUIPMENT_CONFIG } from './constants';

interface ProgramCardProps {
  program: ProgramSummary;
  onClick?: () => void;
  isActive?: boolean;
  progress?: { currentWeek: number; totalWeeks: number };
  onDelete?: () => void;
}

/**
 * Poster-style program card for the library view.
 * Features hover scale effect and gradient header.
 */
export function ProgramCard({ program, onClick, isActive, progress, onDelete }: ProgramCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const difficulty = DIFFICULTY_COLORS[program.difficulty];
  const focus = FOCUS_COLORS[program.focus];

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // Generate a gradient based on the focus
  const gradientMap: Record<string, string> = {
    hypertrophy: 'from-purple-900/80 to-purple-950/60',
    strength: 'from-red-900/80 to-red-950/60',
    conditioning: 'from-cyan-900/80 to-cyan-950/60',
    general: 'from-slate-800/80 to-slate-900/60',
  };
  const gradient = gradientMap[program.focus] || gradientMap.general;

  return (
    <div className="group relative">
      <button
        onClick={onClick}
        className="relative w-full text-left rounded-xl border border-slate-700 overflow-hidden
                   transition-all duration-200 group-hover:scale-[1.02] group-hover:shadow-xl group-hover:border-slate-600
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
      >
        {/* Cover/Header Section */}
        <div className={`h-32 bg-gradient-to-br ${gradient} flex items-center justify-center relative`}>
          {/* Active badge */}
          {isActive && (
            <span className="absolute top-2 right-10 px-2 py-0.5 text-xs font-semibold rounded-full
                            bg-blue-500 text-white shadow-lg shadow-blue-500/30 z-10">
              ACTIVE
            </span>
          )}

          {/* Focus icon */}
          <span className="text-5xl opacity-30 group-hover:opacity-50 transition-opacity">
            {focus.icon}
          </span>

          {/* Scan line effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent
                          translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
        </div>

        {/* Content Section */}
        <div className="p-4 bg-slate-900/90">
          {/* Program name */}
          <h3 className="text-lg font-semibold text-slate-100 mb-2 line-clamp-1">
            {program.name}
          </h3>

          {/* Tags row */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {/* Difficulty badge */}
            <span className={`px-2 py-0.5 text-xs rounded-full ${difficulty.bg} ${difficulty.text}`}>
              {difficulty.label}
            </span>

            {/* Focus badge */}
            <span className={`px-2 py-0.5 text-xs rounded-full ${focus.bg} ${focus.text}`}>
              {focus.icon} {focus.label}
            </span>

            {/* Equipment badges (first 2) */}
            {program.equipment.slice(0, 2).map((eq) => (
              <span
                key={eq}
                className="px-2 py-0.5 text-xs rounded-full bg-slate-700/50 text-slate-400"
                title={EQUIPMENT_CONFIG[eq]?.label || eq}
              >
                {EQUIPMENT_CONFIG[eq]?.icon || '🛠️'}
              </span>
            ))}
            {program.equipment.length > 2 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-slate-700/50 text-slate-400">
                +{program.equipment.length - 2}
              </span>
            )}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span>{program.durationWeeks} weeks</span>
            <span className="text-slate-600">•</span>
            <span>{program.trainingDaysPerWeek} days/week</span>
          </div>

          {/* Description preview */}
          {program.description && (
            <p className="mt-2 text-sm text-slate-500 line-clamp-2">
              {program.description}
            </p>
          )}

          {/* Progress bar for active program */}
          {isActive && progress && (
            <div className="mt-3 pt-3 border-t border-slate-700/50">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Week {progress.currentWeek} of {progress.totalWeeks}</span>
                <span>{Math.round((progress.currentWeek / progress.totalWeeks) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.currentWeek / progress.totalWeeks) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </button>

      {/* Three-dots menu button */}
      <div ref={menuRef} className="absolute top-2 right-2 z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          className="p-1.5 rounded-lg bg-black/30 opacity-0 group-hover:opacity-100 hover:bg-black/50
                     transition-opacity focus:opacity-100 focus:outline-none"
          aria-label="Program options"
        >
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>

        {/* Dropdown menu */}
        {menuOpen && (
          <div className="absolute top-full right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg shadow-black/30 py-1 min-w-[180px]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onDelete?.();
              }}
              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-slate-700 transition-colors"
            >
              DECOMMISSION PROGRAM
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
