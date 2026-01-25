import { Link } from 'react-router-dom';
import type { RecoveryScoreBreakdown, DailyLog, UserProfile } from '../../api/types';
import { ReadinessGauge } from '../recovery';
import { MetabolicTimer } from '../fasting';
import { Panel } from '../common/Panel';

interface StatusZoneProps {
  recoveryScore?: RecoveryScoreBreakdown;
  sleepHours?: number;
  sleepQuality?: number;
  profile: UserProfile;
}

function getReadinessMessage(score: number, sleepHours?: number): { icon: string; title: string; subtitle: string } {
  // Low sleep override
  if (sleepHours !== undefined && sleepHours < 6) {
    return {
      icon: '⚠️',
      title: 'Recovery Mode',
      subtitle: 'Low sleep detected. Take it easy today.',
    };
  }

  if (score >= 80) {
    return {
      icon: '🔋',
      title: 'High Readiness',
      subtitle: 'You\'re primed for a strong session.',
    };
  }
  if (score >= 70) {
    return {
      icon: '✅',
      title: 'Good to Go',
      subtitle: 'Ready for your planned training.',
    };
  }
  if (score >= 50) {
    return {
      icon: '⚡',
      title: 'Moderate Readiness',
      subtitle: 'Light to moderate activity recommended.',
    };
  }
  if (score >= 30) {
    return {
      icon: '🔄',
      title: 'Recovery Needed',
      subtitle: 'Consider active recovery or mobility work.',
    };
  }
  return {
    icon: '😴',
    title: 'Rest Recommended',
    subtitle: 'Your body needs time to recover.',
  };
}

export function StatusZone({
  recoveryScore,
  sleepHours,
  sleepQuality,
  profile,
}: StatusZoneProps) {
  const score = recoveryScore?.score ?? 50;
  const message = getReadinessMessage(score, sleepHours);
  const showFastingTimer = profile.fastingProtocol && profile.fastingProtocol !== 'standard';

  return (
    <div className="space-y-4">
      {/* Readiness Card */}
      <Link to="/physique" className="block">
        <Panel className="hover:border-gray-700 transition-colors cursor-pointer">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{message.icon}</span>
                <h3 className="text-lg font-semibold text-white">{message.title}</h3>
              </div>
              <p className="text-sm text-gray-400">{message.subtitle}</p>
            </div>
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>

          {recoveryScore && (
            <div className="flex justify-center">
              <ReadinessGauge
                score={recoveryScore.score}
                components={recoveryScore}
                size="sm"
              />
            </div>
          )}

          {/* Quick stats row */}
          {(sleepHours !== undefined || sleepQuality !== undefined) && (
            <div className="flex gap-4 mt-4 pt-4 border-t border-gray-800 text-sm">
              {sleepHours !== undefined && (
                <div>
                  <span className="text-gray-500">Sleep</span>
                  <span className="ml-2 text-white font-medium">{sleepHours}h</span>
                </div>
              )}
              {sleepQuality !== undefined && (
                <div>
                  <span className="text-gray-500">Quality</span>
                  <span className="ml-2 text-white font-medium">{sleepQuality}/100</span>
                </div>
              )}
            </div>
          )}
        </Panel>
      </Link>

      {/* Metabolic Timer (if fasting protocol active) */}
      {showFastingTimer && (
        <Panel>
          <div className="flex justify-center">
            <MetabolicTimer
              protocol={profile.fastingProtocol!}
              eatingWindowStart={profile.eatingWindowStart ?? '12:00'}
              eatingWindowEnd={profile.eatingWindowEnd ?? '20:00'}
            />
          </div>
        </Panel>
      )}
    </div>
  );
}
