import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ActiveSessionView } from './ActiveSessionView';
import type { SessionExercise } from '../../api/types';

// Mock framer-motion to avoid animation complexities in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const sampleExercises: SessionExercise[] = [
  { exerciseId: 'hip_circles', phase: 'prepare', order: 1, durationSec: 30 },
  { exerciseId: 'bear_to_monkey', phase: 'practice', order: 1, reps: 8 },
  { exerciseId: 'frogger', phase: 'push', order: 1, reps: 8 },
];

describe('ActiveSessionView', () => {
  let onComplete: ReturnType<typeof vi.fn>;
  let onAbort: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    onComplete = vi.fn();
    onAbort = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderView(exercises: SessionExercise[] = sampleExercises) {
    return render(
      <ActiveSessionView
        exercises={exercises}
        onComplete={onComplete}
        onAbort={onAbort}
      />
    );
  }

  it('renders ExerciseCard for the first resolved exercise', () => {
    renderView();
    // hip_circles is prepare phase, should be first
    expect(screen.getByText('Hip Circles')).toBeDefined();
    expect(screen.getByText('EX. 1 OF 3')).toBeDefined();
  });

  it('timed exercise countdown starts after prepare phase', () => {
    renderView();
    // Initial state: timed exercise shows remaining duration.
    expect(screen.getByText('00:30')).toBeDefined();

    // Prepare countdown is 3 seconds before exercise timer starts.
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByText('00:30')).toBeDefined();

    // Then the timer should count down during exercise.
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('00:25')).toBeDefined();
  });

  it('resolves exercises in phase order (prepare → practice → push)', () => {
    // Provide exercises out of phase order
    const outOfOrder: SessionExercise[] = [
      { exerciseId: 'frogger', phase: 'push', order: 1, reps: 8 },
      { exerciseId: 'hip_circles', phase: 'prepare', order: 1, durationSec: 30 },
      { exerciseId: 'bear_to_monkey', phase: 'practice', order: 1, reps: 8 },
    ];
    renderView(outOfOrder);
    // Should still show prepare first
    expect(screen.getByText('Hip Circles')).toBeDefined();
  });

  it('advances to next exercise when Done is pressed', () => {
    renderView();
    // First exercise
    expect(screen.getByText('Hip Circles')).toBeDefined();

    // Press Done
    fireEvent.click(screen.getByText('Done'));

    // Should show rest screen now
    expect(screen.getByText('REST')).toBeDefined();
  });

  it('shows RestInterventionScreen between exercises', () => {
    renderView();
    fireEvent.click(screen.getByText('Done'));

    expect(screen.getByText('REST')).toBeDefined();
    expect(screen.getByText('Recovery')).toBeDefined();
    // Next exercise preview
    expect(screen.getByText('Bear to Monkey')).toBeDefined();
  });

  it('skips rest when Skip Rest is pressed', () => {
    renderView();
    // Complete first exercise
    fireEvent.click(screen.getByText('Done'));
    expect(screen.getByText('REST')).toBeDefined();

    // Skip rest
    fireEvent.click(screen.getByText('Skip Rest'));

    // Should be on second exercise now
    expect(screen.getByText('Bear to Monkey')).toBeDefined();
    expect(screen.getByText('EX. 2 OF 3')).toBeDefined();
  });

  it('shows SessionCompleteScreen after final exercise Done', () => {
    renderView();

    // Complete all three exercises
    fireEvent.click(screen.getByText('Done')); // 1st done → rest
    fireEvent.click(screen.getByText('Skip Rest')); // skip rest → 2nd exercise
    fireEvent.click(screen.getByText('Done')); // 2nd done → rest
    fireEvent.click(screen.getByText('Skip Rest')); // skip rest → 3rd exercise
    fireEvent.click(screen.getByText('Done')); // 3rd done → complete

    expect(screen.getByText('Session Complete')).toBeDefined();
  });

  it('calls onComplete with correct SessionResult shape on Finish', () => {
    renderView();

    // Complete all exercises quickly
    fireEvent.click(screen.getByText('Done'));
    fireEvent.click(screen.getByText('Skip Rest'));
    fireEvent.click(screen.getByText('Done'));
    fireEvent.click(screen.getByText('Skip Rest'));
    fireEvent.click(screen.getByText('Done'));

    // Click Finish button
    fireEvent.click(screen.getByText('Finish'));

    expect(onComplete).toHaveBeenCalledTimes(1);
    const result = onComplete.mock.calls[0][0];
    expect(result.exercises).toHaveLength(3);
    expect(result.totalDurationSec).toBeTypeOf('number');
    expect(result.completedAt).toBeTypeOf('string');
  });

  it('calls onAbort when back button is pressed', () => {
    renderView();
    // The back button has aria-label "Back"
    fireEvent.click(screen.getByLabelText('Back'));
    expect(onAbort).toHaveBeenCalledTimes(1);
  });

  it('handles empty exercises array gracefully', () => {
    renderView([]);
    // Should go directly to complete
    expect(screen.getByText('Session Complete')).toBeDefined();
  });

  it('ignores unknown exerciseIds without crashing', () => {
    const withUnknown: SessionExercise[] = [
      { exerciseId: 'nonexistent_xyz', phase: 'prepare', order: 1 },
      { exerciseId: 'hip_circles', phase: 'prepare', order: 2, durationSec: 30 },
    ];
    renderView(withUnknown);
    // Should skip unknown and show the valid one
    expect(screen.getByText('Hip Circles')).toBeDefined();
    expect(screen.getByText('EX. 1 OF 1')).toBeDefined();
  });

  it('renders weight and rep sliders for rep-based exercises', () => {
    const repBasedExercises: SessionExercise[] = [
      { exerciseId: 'bear_to_monkey', phase: 'practice', order: 1, reps: 8 },
    ];
    renderView(repBasedExercises);

    // Should show both sliders
    const weightSlider = screen.getByLabelText('Weight') as HTMLInputElement;
    const repsSlider = screen.getByLabelText('Target Reps') as HTMLInputElement;

    expect(weightSlider).toBeDefined();
    expect(repsSlider).toBeDefined();

    // Should show default weight value (bodyweight = 0 kg)
    expect(weightSlider.value).toBe('0');

    // Should show target reps
    expect(repsSlider.value).toBe('8');

    // Should show the weight label
    expect(screen.getByText('0.0 kg')).toBeDefined();
  });

  it('does not render sliders for timed exercises', () => {
    const timedExercises: SessionExercise[] = [
      { exerciseId: 'hip_circles', phase: 'prepare', order: 1, durationSec: 30 },
    ];
    renderView(timedExercises);

    // Should NOT show sliders
    expect(screen.queryByLabelText('Weight')).toBeNull();
    expect(screen.queryByLabelText('Target Reps')).toBeNull();
  });
});
