import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RestInterventionScreen, DEFAULT_REST_SEC } from './RestInterventionScreen';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('RestInterventionScreen', () => {
  it('displays the countdown in MM:SS format', () => {
    render(
      <RestInterventionScreen
        remainingSeconds={90}
        totalSeconds={DEFAULT_REST_SEC}
        onSkip={vi.fn()}
      />
    );
    expect(screen.getByText('01:30')).toBeDefined();
  });

  it('displays smaller countdown values correctly', () => {
    render(
      <RestInterventionScreen
        remainingSeconds={5}
        totalSeconds={DEFAULT_REST_SEC}
        onSkip={vi.fn()}
      />
    );
    expect(screen.getByText('00:05')).toBeDefined();
  });

  it('calls onSkip when Skip Rest button is pressed', () => {
    const onSkip = vi.fn();
    render(
      <RestInterventionScreen
        remainingSeconds={60}
        totalSeconds={DEFAULT_REST_SEC}
        onSkip={onSkip}
      />
    );

    fireEvent.click(screen.getByText('Skip Rest'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('shows next exercise preview when provided', () => {
    render(
      <RestInterventionScreen
        remainingSeconds={45}
        totalSeconds={DEFAULT_REST_SEC}
        onSkip={vi.fn()}
        nextExercise={{
          id: 'frogger',
          name: 'Frogger',
          defaultPhase: 'push',
          icon: '🐸',
          defaultDurationSec: 0,
          defaultReps: 8,
          tags: ['lower'],
        }}
      />
    );
    expect(screen.getByText('Frogger')).toBeDefined();
    expect(screen.getByText('Next')).toBeDefined();
  });

  it('does not show next exercise preview when not provided', () => {
    render(
      <RestInterventionScreen
        remainingSeconds={45}
        totalSeconds={DEFAULT_REST_SEC}
        onSkip={vi.fn()}
      />
    );
    expect(screen.queryByText('Next')).toBeNull();
  });

  it('shows REST label', () => {
    render(
      <RestInterventionScreen
        remainingSeconds={30}
        totalSeconds={DEFAULT_REST_SEC}
        onSkip={vi.fn()}
      />
    );
    expect(screen.getByText('REST')).toBeDefined();
  });
});
