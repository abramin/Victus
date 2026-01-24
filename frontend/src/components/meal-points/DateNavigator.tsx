import { useMemo } from 'react';

interface DateNavigatorProps {
  selectedDate: Date;
  onNavigate: (days: number) => void;
  contextText?: string | null;
}

export function DateNavigator({ selectedDate, onNavigate, contextText }: DateNavigatorProps) {
  const formattedDate = useMemo(() => {
    return selectedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [selectedDate]);

  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigate(-1)}
          className="p-2 text-gray-400 hover:text-white transition-colors"
          aria-label="Previous day"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-white font-medium min-w-[140px] text-center">
          {formattedDate}
        </span>
        <button
          onClick={() => onNavigate(1)}
          className="p-2 text-gray-400 hover:text-white transition-colors"
          aria-label="Next day"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      {contextText && (
        <p className="text-xs text-gray-400 mt-1">{contextText}</p>
      )}
    </div>
  );
}
