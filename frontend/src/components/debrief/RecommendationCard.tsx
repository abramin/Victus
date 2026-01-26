import type { TacticalRecommendation } from '../../api/types';

interface RecommendationCardProps {
  recommendation: TacticalRecommendation;
}

/**
 * Displays a single tactical recommendation with priority badge,
 * summary, rationale, and action items.
 */
export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const { priority, category, summary, rationale, actionItems } = recommendation;

  return (
    <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <PriorityBadge priority={priority} />
          <CategoryIcon category={category} />
        </div>
      </div>

      {/* Summary */}
      <h4 className="text-sm font-semibold text-white mb-2">{summary}</h4>

      {/* Rationale */}
      <p className="text-xs text-slate-400 mb-3">{rationale}</p>

      {/* Action Items */}
      {actionItems.length > 0 && (
        <div className="pt-3 border-t border-slate-800">
          <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Action Items</p>
          <ul className="space-y-1">
            {actionItems.map((item, index) => (
              <li key={index} className="flex items-start gap-2 text-xs text-slate-300">
                <span className="text-slate-500 mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: number }) {
  const colors: Record<number, string> = {
    1: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    2: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    3: 'bg-slate-700/50 text-slate-300 border-slate-600',
  };

  const labels: Record<number, string> = {
    1: 'High',
    2: 'Medium',
    3: 'Low',
  };

  return (
    <span
      className={`text-xs px-2 py-0.5 rounded border ${colors[priority] || colors[3]}`}
    >
      P{priority}: {labels[priority] || 'Low'}
    </span>
  );
}

function CategoryIcon({ category }: { category: string }) {
  const icons: Record<string, { icon: string; color: string; label: string }> = {
    training: { icon: '⚡', color: 'text-blue-400', label: 'Training' },
    nutrition: { icon: '🍎', color: 'text-emerald-400', label: 'Nutrition' },
    recovery: { icon: '🛏️', color: 'text-purple-400', label: 'Recovery' },
  };

  const config = icons[category] || { icon: '📋', color: 'text-slate-400', label: category };

  return (
    <span className={`text-xs ${config.color} flex items-center gap-1`}>
      <span>{config.icon}</span>
      <span className="capitalize">{config.label}</span>
    </span>
  );
}

interface RecommendationsListProps {
  recommendations: TacticalRecommendation[];
}

/**
 * Displays a list of tactical recommendations sorted by priority.
 */
export function RecommendationsList({ recommendations }: RecommendationsListProps) {
  // Sort by priority (1 = highest)
  const sorted = [...recommendations].sort((a, b) => a.priority - b.priority);

  if (sorted.length === 0) {
    return (
      <div className="bg-slate-900/70 rounded-lg border border-slate-800 p-6 text-center">
        <p className="text-sm text-slate-400">No recommendations available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white">Tactical Recommendations</h3>
      <div className="space-y-3">
        {sorted.map((rec, index) => (
          <RecommendationCard key={index} recommendation={rec} />
        ))}
      </div>
    </div>
  );
}
