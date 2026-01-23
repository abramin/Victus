import type { TrainingSession, ActualTrainingSession } from '../../api/types';

interface ActualVsPlannedComparisonProps {
  planned: TrainingSession[];
  actual?: ActualTrainingSession[];
}

export function ActualVsPlannedComparison({
  planned,
  actual,
}: ActualVsPlannedComparisonProps) {
  if (!actual || actual.length === 0) {
    return (
      <div className="text-xs text-gray-500">
        No actual training logged yet
      </div>
    );
  }

  const plannedTotal = planned.reduce((sum, s) => sum + s.durationMin, 0);
  const actualTotal = actual.reduce((sum, s) => sum + s.durationMin, 0);
  const diff = actualTotal - plannedTotal;
  
  const hasChanges = 
    planned.length !== actual.length ||
    plannedTotal !== actualTotal ||
    planned.some((p, i) => actual[i]?.type !== p.type);

  if (!hasChanges) {
    return (
      <div className="flex items-center gap-1 text-xs text-green-400">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Completed as planned
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={diff > 0 ? 'text-green-400' : diff < 0 ? 'text-yellow-400' : 'text-gray-400'}>
        {diff > 0 ? '+' : ''}{diff} min
      </span>
      <span className="text-gray-500">
        ({actual.length} session{actual.length !== 1 ? 's' : ''} actual vs {planned.length} planned)
      </span>
    </div>
  );
}
