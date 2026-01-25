interface BMRPrecisionBadgeProps {
  active: boolean;
  bodyFatDate?: string;
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Badge indicating that Precision BMR mode is active.
 * Shows when Katch-McArdle equation is auto-selected based on recent body fat data.
 */
export function BMRPrecisionBadge({ active, bodyFatDate }: BMRPrecisionBadgeProps) {
  if (!active) return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
      <svg
        className="w-4 h-4 text-emerald-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span className="text-xs text-emerald-300 font-medium">Precision BMR</span>
      {bodyFatDate && (
        <span className="text-xs text-emerald-400/60">
          (BF% from {formatShortDate(bodyFatDate)})
        </span>
      )}
    </div>
  );
}
