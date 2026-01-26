import { Link } from 'react-router-dom';
import type { RecoveryScoreBreakdown, UserProfile, CNSStatusBreakdown, DailyLog } from '../../api/types';
import { ReadinessGauge } from '../recovery';
import { MetabolicTimer } from '../fasting';
import { Panel } from '../common/Panel';
import { CNSShieldIndicator } from '../cns';
import { BiometricHUD } from './BiometricHUD';

interface StatusZoneProps {
  recoveryScore?: RecoveryScoreBreakdown;
  cnsStatus?: CNSStatusBreakdown;
  sleepHours?: number;
  sleepQuality?: number;
  profile: UserProfile;
  log?: DailyLog;
  yesterdayLog?: DailyLog | null;
  onEdit?: () => void;
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
  cnsStatus,
  sleepHours,
  sleepQuality,
  profile,
  log,
  yesterdayLog,
  onEdit,
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

          {(recoveryScore || cnsStatus) && (
            <div className="flex justify-center items-center gap-8">
              {recoveryScore && (
                <ReadinessGauge
                  score={recoveryScore.score}
                  components={recoveryScore}
                  size="sm"
                />
              )}
              {cnsStatus && (
                <CNSShieldIndicator cnsStatus={cnsStatus} size="sm" />
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

      {/* Biometric HUD */}
      {onEdit && log && (
        <BiometricHUD
          log={log}
          yesterdayLog={yesterdayLog}
          onEdit={onEdit}
        />
      )}
    </div>
  );
}
