import type { WeeklyTarget } from '../../api/types';
import { Card } from '../common/Card';

interface WeeklyTargetsTableProps {
  weeklyTargets: WeeklyTarget[];
  currentWeek: number;
}

export function WeeklyTargetsTable({ weeklyTargets, currentWeek }: WeeklyTargetsTableProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card title="Weekly Targets">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-2 px-3 text-left font-medium text-gray-500">Week</th>
              <th className="py-2 px-3 text-left font-medium text-gray-500">Dates</th>
              <th className="py-2 px-3 text-right font-medium text-gray-500">Target Weight</th>
              <th className="py-2 px-3 text-right font-medium text-gray-500">Actual Weight</th>
              <th className="py-2 px-3 text-right font-medium text-gray-500">Daily Intake</th>
              <th className="py-2 px-3 text-right font-medium text-gray-500">Days Logged</th>
              <th className="py-2 px-3 text-center font-medium text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {weeklyTargets.map((target) => {
              const isCurrent = target.weekNumber === currentWeek;
              const isPast = target.weekNumber < currentWeek;
              const hasActual = target.actualWeightKg !== undefined && target.actualWeightKg !== null;
              const variance = hasActual ? target.actualWeightKg! - target.projectedWeightKg : 0;

              return (
                <tr
                  key={target.weekNumber}
                  className={`border-b border-gray-100 ${isCurrent ? 'bg-blue-50' : ''}`}
                >
                  <td className="py-2 px-3">
                    <span className={`font-medium ${isCurrent ? 'text-blue-700' : 'text-gray-900'}`}>
                      {target.weekNumber}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-gray-600">
                    {formatDate(target.startDate)} - {formatDate(target.endDate)}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-900">
                    {target.projectedWeightKg.toFixed(1)} kg
                  </td>
                  <td className="py-2 px-3 text-right">
                    {hasActual ? (
                      <span className={variance > 0 ? 'text-orange-600' : variance < 0 ? 'text-green-600' : 'text-gray-900'}>
                        {target.actualWeightKg!.toFixed(1)} kg
                        {variance !== 0 && (
                          <span className="text-xs ml-1">
                            ({variance > 0 ? '+' : ''}{variance.toFixed(1)})
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-900">
                    {target.targetIntakeKcal.toLocaleString()} kcal
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span className={target.daysLogged >= 7 ? 'text-green-600' : target.daysLogged > 0 ? 'text-yellow-600' : 'text-gray-400'}>
                      {target.daysLogged}/7
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    {isCurrent ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Current
                      </span>
                    ) : isPast ? (
                      target.daysLogged >= 5 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Complete
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Partial
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Upcoming
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-100 border border-blue-200" />
          <span>Current Week</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-100 border border-green-200" />
          <span>Complete (5+ days logged)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-100 border border-yellow-200" />
          <span>Partial</span>
        </div>
      </div>
    </Card>
  );
}
