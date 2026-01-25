import { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { updateFastingOverride } from '../../api/client';

interface BreakFastModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  onFastBroken: () => void;
}

export function BreakFastModal({ isOpen, onClose, date, onFastBroken }: BreakFastModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBreakFast = async () => {
    setLoading(true);
    setError(null);

    try {
      await updateFastingOverride(date, { fastingOverride: 'standard' });
      onFastBroken();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to break fast');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Break Fast Early?">
      <div className="space-y-4">
        {/* Warning Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>

        {/* Message */}
        <div className="text-center space-y-2">
          <p className="text-gray-300">
            This will unlock all meals for today and switch to standard eating mode.
          </p>
          <p className="text-gray-500 text-sm">
            Your banked calories will be redistributed across your remaining meals.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-900/50 border border-red-700 rounded-md">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="flex-1"
          >
            Keep Fasting
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleBreakFast}
            loading={loading}
            className="flex-1 bg-amber-600 hover:bg-amber-500"
          >
            Break Fast
          </Button>
        </div>
      </div>
    </Modal>
  );
}
