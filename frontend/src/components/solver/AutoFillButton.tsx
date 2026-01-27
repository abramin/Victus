interface AutoFillButtonProps {
  remainingCalories: number;
  onClick: () => void;
  disabled?: boolean;
}

export function AutoFillButton({ remainingCalories, onClick, disabled }: AutoFillButtonProps) {
  const shouldShow = remainingCalories >= 150;
  const shouldShimmer = remainingCalories < 300 && remainingCalories >= 150;

  if (!shouldShow) return null;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors ${shouldShimmer ? 'animate-shimmer' : ''}`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
      GENERATE RATION
    </button>
  );
}
