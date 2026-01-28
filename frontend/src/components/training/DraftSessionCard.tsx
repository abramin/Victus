import { useState } from 'react';
import { finalizeSession } from '../../api/client';
import type { SessionResponse, EchoResponse } from '../../api/types';
import { EchoModal } from './EchoModal';

interface DraftSessionCardProps {
  session: SessionResponse;
  onUpdate: (session: SessionResponse) => void;
  onFinalize: () => void;
}

/**
 * Card component for displaying draft sessions pending echo enrichment.
 * Features a dashed amber border and pulsing "Pending Echo" indicator.
 */
export function DraftSessionCard({ session, onUpdate, onFinalize }: DraftSessionCardProps) {
  const [isEchoModalOpen, setIsEchoModalOpen] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const handleEchoSuccess = (result: EchoResponse) => {
    onUpdate(result.session);
    setIsEchoModalOpen(false);
  };

  const handleSkipEcho = async () => {
    setIsFinalizing(true);
    try {
      await finalizeSession(session.id);
      onFinalize();
    } catch (error) {
      console.error('Failed to finalize session:', error);
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <>
      <div className="border-2 border-dashed border-amber-500/50 rounded-lg p-4 bg-amber-950/10">
        {/* Header with draft indicator */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-amber-500 text-xs font-medium uppercase tracking-wider">
              Pending Echo
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
          </div>
          <span className="text-xs text-gray-500">Session #{session.sessionOrder}</span>
        </div>

        {/* Session details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white capitalize">
              {formatTrainingType(session.type)}
            </span>
            <span className="text-sm text-gray-400">{session.durationMin} min</span>
          </div>

          {session.perceivedIntensity && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">RPE</span>
              <div className="flex gap-0.5">
                {[...Array(10)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-4 rounded-sm ${
                      i < session.perceivedIntensity!
                        ? i < 4
                          ? 'bg-green-500'
                          : i < 7
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                        : 'bg-gray-700'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-400">{session.perceivedIntensity}/10</span>
            </div>
          )}

          {session.notes && (
            <p className="text-xs text-gray-400 italic truncate">{session.notes}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setIsEchoModalOpen(true)}
            className="flex-1 px-3 py-2 text-sm font-medium bg-emerald-900/40 text-emerald-400 border border-emerald-700/50 rounded hover:bg-emerald-800/50 transition-colors"
          >
            Submit Echo
          </button>
          <button
            onClick={handleSkipEcho}
            disabled={isFinalizing}
            className="px-3 py-2 text-sm font-medium bg-gray-800 text-gray-400 rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {isFinalizing ? 'Saving...' : 'Skip'}
          </button>
        </div>
      </div>

      <EchoModal
        isOpen={isEchoModalOpen}
        onClose={() => setIsEchoModalOpen(false)}
        session={session}
        onSuccess={handleEchoSuccess}
      />
    </>
  );
}

/**
 * Format training type for display.
 */
function formatTrainingType(type: string): string {
  const typeNames: Record<string, string> = {
    rest: 'Rest Day',
    qigong: 'Qigong',
    walking: 'Walking',
    gmb: 'GMB Elements',
    run: 'Running',
    row: 'Rowing',
    cycle: 'Cycling',
    hiit: 'HIIT',
    strength: 'Strength',
    calisthenics: 'Calisthenics',
    mobility: 'Mobility',
    mixed: 'Mixed Training',
  };
  return typeNames[type] || type;
}
