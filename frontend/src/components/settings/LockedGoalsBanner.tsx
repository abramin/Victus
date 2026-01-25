import { Link } from 'react-router-dom';

interface LockedGoalsBannerProps {
  planName?: string;
  targetWeight: number;
  endDate: string;
  currentWeek: number;
  totalWeeks: number;
}

// Simple lock icon SVG component
function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function LockedGoalsBanner({
  planName,
  targetWeight,
  endDate,
  currentWeek,
  totalWeeks,
}: LockedGoalsBannerProps) {
  const displayName = planName || 'Active Plan';
  const progressPercent = Math.min((currentWeek / totalWeeks) * 100, 100);

  return (
    <div className="mb-4 p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <LockIcon className="w-5 h-5 text-amber-500" />
        <span className="font-medium text-amber-400">
          Locked by Active Plan: {displayName}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
        <div>
          <span className="text-slate-400">Target Weight</span>
          <div className="text-white font-medium">{targetWeight.toFixed(1)} kg</div>
        </div>
        <div>
          <span className="text-slate-400">End Date</span>
          <div className="text-white font-medium">{endDate}</div>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Week {currentWeek} of {totalWeeks}</span>
          <span>{Math.round(progressPercent)}% complete</span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <Link
        to="/strategy"
        className="inline-flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300 transition-colors"
      >
        View Plan Details
        <span aria-hidden="true">&rarr;</span>
      </Link>
    </div>
  );
}
