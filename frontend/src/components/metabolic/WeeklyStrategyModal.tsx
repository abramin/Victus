import { Modal } from '../common/Modal';
import type { FluxNotification } from '../../api/types';

interface WeeklyStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  notification: FluxNotification;
  onAccept: () => void;
  onIgnore: () => void;
}

/**
 * WeeklyStrategyModal displays a Flux Engine weekly strategy update notification.
 * Shows the TDEE change with accept/ignore options.
 */
export function WeeklyStrategyModal({
  isOpen,
  onClose,
  notification,
  onAccept,
  onIgnore,
}: WeeklyStrategyModalProps) {
  const isIncrease = notification.deltaKcal > 0;
  const absChange = Math.abs(notification.deltaKcal);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Weekly Strategy Update">
      <div className="space-y-6">
        {/* Main message */}
        <p className="text-slate-300">
          Based on your progress, your metabolism is running{' '}
          <span className={isIncrease ? 'text-emerald-400' : 'text-orange-400'}>
            {isIncrease ? 'faster' : 'slower'}
          </span>{' '}
          than expected.
        </p>

        {/* TDEE comparison */}
        <div className="bg-slate-800/60 rounded-lg border border-slate-700 p-4">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-xs text-slate-500 mb-1">Old Target</p>
              <p className="text-2xl font-semibold text-slate-400">
                {notification.previousTDEE.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500">kcal</p>
            </div>

            <div className="px-4">
              <div
                className={`text-2xl font-bold ${isIncrease ? 'text-emerald-400' : 'text-orange-400'}`}
              >
                →
              </div>
            </div>

            <div className="text-center flex-1">
              <p className="text-xs text-slate-500 mb-1">New Target</p>
              <p className="text-2xl font-semibold text-white">
                {notification.newTDEE.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500">kcal</p>
            </div>
          </div>

          {/* Change indicator */}
          <div className="mt-4 pt-4 border-t border-slate-700 text-center">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                isIncrease
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-orange-500/20 text-orange-400'
              }`}
            >
              {isIncrease ? '+' : '-'}
              {absChange} kcal
            </span>
          </div>
        </div>

        {/* Reason */}
        <p className="text-sm text-slate-400 italic">{notification.reason}</p>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              onAccept();
              onClose();
            }}
            className="flex-1 px-4 py-3 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-lg transition-colors"
          >
            Accept Update
          </button>
          <button
            onClick={() => {
              onIgnore();
              onClose();
            }}
            className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium rounded-lg transition-colors"
          >
            Ignore
          </button>
        </div>

        {/* Note */}
        <p className="text-xs text-slate-500 text-center">
          Both options will dismiss this notification. The new TDEE will be used for tomorrow's
          targets regardless.
        </p>
      </div>
    </Modal>
  );
}
