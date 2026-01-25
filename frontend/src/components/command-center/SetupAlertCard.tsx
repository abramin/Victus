import { Link } from 'react-router-dom';

interface SetupAlertCardProps {
  type: 'strategy' | 'profile' | 'training';
  onDismiss?: () => void;
}

const ALERT_CONFIG = {
  strategy: {
    icon: '⚠️',
    title: 'Strategy Missing',
    message: "We can't calculate your calories without a nutrition plan.",
    actionLabel: 'Setup Strategy',
    actionPath: '/strategy',
    bgClass: 'bg-amber-900/30',
    borderClass: 'border-amber-700/50',
    textClass: 'text-amber-300',
  },
  profile: {
    icon: '👤',
    title: 'Complete Your Profile',
    message: 'Add your details to get personalized recommendations.',
    actionLabel: 'Edit Profile',
    actionPath: '/profile',
    bgClass: 'bg-blue-900/30',
    borderClass: 'border-blue-700/50',
    textClass: 'text-blue-300',
  },
  training: {
    icon: '🏋️',
    title: 'No Training Planned',
    message: 'Plan your workouts to optimize your nutrition targets.',
    actionLabel: 'Plan Training',
    actionPath: '/workout-planner',
    bgClass: 'bg-purple-900/30',
    borderClass: 'border-purple-700/50',
    textClass: 'text-purple-300',
  },
};

export function SetupAlertCard({ type, onDismiss }: SetupAlertCardProps) {
  const config = ALERT_CONFIG[type];

  return (
    <div
      className={`p-4 rounded-xl border ${config.bgClass} ${config.borderClass}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${config.textClass}`}>{config.title}</h3>
          <p className="text-sm text-gray-400 mt-1">{config.message}</p>
          <div className="flex items-center gap-3 mt-3">
            <Link
              to={config.actionPath}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white text-black text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              {config.actionLabel}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="text-sm text-gray-500 hover:text-gray-300"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
