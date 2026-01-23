import type { DayType, TrainingSession } from '../../api/types';
import { TRAINING_LABELS, DAY_TYPE_OPTIONS } from '../../constants';

interface DailySummaryPanelProps {
  weightKg: number | undefined;
  sleepQuality: number | undefined;
  sessions: TrainingSession[];
  dayType: DayType | undefined;
}

export function DailySummaryPanel({
  weightKg,
  sleepQuality,
  sessions,
  dayType,
}: DailySummaryPanelProps) {
  const nonRestSessions = sessions.filter((s) => s.type !== 'rest');
  const sessionCountLabel = nonRestSessions.length === 0
    ? 'Rest day'
    : `${sessions.length} session${sessions.length > 1 ? 's' : ''}`;

  const dayTypeColor = dayType === 'performance'
    ? 'text-blue-400'
    : dayType === 'fatburner'
    ? 'text-orange-400'
    : 'text-purple-400';

  const dayTypeLabel = dayType
    ? dayType.charAt(0).toUpperCase() + dayType.slice(1)
    : '--';

  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      <h3 className="text-white font-medium mb-4">Today's Summary</h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Weight</span>
          <span className="text-white font-medium">
            {weightKg ? `${weightKg} kg` : '--'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Sleep Quality</span>
          <span className="text-white font-medium">
            {sleepQuality !== undefined ? `${sleepQuality}/100` : '--'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Training</span>
          <span className="text-white font-medium">{sessionCountLabel}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Day Type</span>
          <span className={`font-medium ${dayTypeColor}`}>{dayTypeLabel}</span>
        </div>
      </div>
    </div>
  );
}
