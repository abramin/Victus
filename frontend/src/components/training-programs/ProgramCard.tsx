import type { ProgramSummary } from '../../api/types';
import { DIFFICULTY_COLORS, FOCUS_COLORS, EQUIPMENT_CONFIG } from './constants';

interface ProgramCardProps {
  program: ProgramSummary;
  onClick?: () => void;
}

/**
 * Poster-style program card for the library view.
 * Features hover scale effect and gradient header.
 */
export function ProgramCard({ program, onClick }: ProgramCardProps) {
  const difficulty = DIFFICULTY_COLORS[program.difficulty];
  const focus = FOCUS_COLORS[program.focus];

  // Generate a gradient based on the focus
  const gradientMap: Record<string, string> = {
    hypertrophy: 'from-purple-900/80 to-purple-950/60',
    strength: 'from-red-900/80 to-red-950/60',
    conditioning: 'from-cyan-900/80 to-cyan-950/60',
    general: 'from-slate-800/80 to-slate-900/60',
  };
  const gradient = gradientMap[program.focus] || gradientMap.general;

  return (
    <button
      onClick={onClick}
      className="group relative w-full text-left rounded-xl border border-slate-700 overflow-hidden
                 transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:border-slate-600
                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900"
    >
      {/* Cover/Header Section */}
      <div className={`h-32 bg-gradient-to-br ${gradient} flex items-center justify-center relative`}>
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
      </div>
    </button>
  );
}
