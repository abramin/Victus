import type { AuditMismatch } from '../../api/types';

interface MismatchCardProps {
  mismatch: AuditMismatch;
}

/**
 * Individual mismatch display card.
 */
export function MismatchCard({ mismatch }: MismatchCardProps) {
  const isCritical = mismatch.severity === 'critical';

  // Get icon based on rule ID
  const getIcon = () => {
    switch (mismatch.id) {
      case 'high_fatigue_low_carbs':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        );
      case 'cns_depleted_performance':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        );
      case 'heavy_training_low_protein':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
            />
          </svg>
        );
      case 'recovery_overreached':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  return (
    <div
      className={`
        p-4 rounded-lg border
        ${
          isCritical
            ? 'bg-red-950/50 border-red-800/50'
            : 'bg-amber-950/50 border-amber-800/50'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`
            flex-shrink-0 p-2 rounded-lg
            ${isCritical ? 'bg-red-900/50 text-red-400' : 'bg-amber-900/50 text-amber-400'}
          `}
        >
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Summary */}
          <h4 className={`font-medium ${isCritical ? 'text-red-200' : 'text-amber-200'}`}>
            {mismatch.summary}
          </h4>

          {/* Explanation */}
          {mismatch.explanation && (
            <p className="mt-1 text-sm text-gray-400">{mismatch.explanation}</p>
          )}

          {/* Related data as badges */}
          {mismatch.relatedData && Object.keys(mismatch.relatedData).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(mismatch.relatedData).map(([key, value]) => (
                <span
                  key={key}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-gray-800 text-gray-300"
                >
                  {key}: {typeof value === 'number' ? value.toFixed(0) : String(value)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Severity badge */}
        <span
          className={`
            flex-shrink-0 px-2 py-0.5 rounded text-xs font-semibold uppercase
            ${isCritical ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'}
          `}
        >
          {mismatch.severity}
        </span>
      </div>
    </div>
  );
}
