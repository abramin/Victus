import { render, screen, fireEvent, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TrainingCalendarHeatmap } from './TrainingCalendarHeatmap';
import type { HistoryPoint } from '../../../api/types';

const TODAY = new Date('2026-07-15T12:00:00Z');

const basePoint: Omit<HistoryPoint, 'date'> = {
  weightKg: 80,
  estimatedTDEE: 2500,
  tdeeConfidence: 0.8,
  hasTraining: true,
  plannedSessionCount: 1,
  actualSessionCount: 1,
  plannedDurationMin: 60,
  actualDurationMin: 60,
};

const makePoint = (overrides: Partial<HistoryPoint> & { date: string }): HistoryPoint => ({
  ...basePoint,
  ...overrides,
});

describe('TrainingCalendarHeatmap', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('computes summary stats from history points', () => {
    const points = [
      makePoint({ date: '2026-07-15', plannedDurationMin: 60, actualDurationMin: 60 }),
      makePoint({ date: '2026-07-14', plannedDurationMin: 60, actualDurationMin: 30 }),
      makePoint({ date: '2026-07-13', plannedDurationMin: 60, actualDurationMin: 0, actualSessionCount: 0 }),
      makePoint({
        date: '2026-07-12',
        plannedDurationMin: 0,
        actualDurationMin: 0,
        plannedSessionCount: 0,
        actualSessionCount: 0,
        hasTraining: false,
      }),
    ];

    render(<TrainingCalendarHeatmap points={points} />);

    // Stats are now inline badges - find by adjacent text content
    expect(screen.getByText('day streak')).toBeInTheDocument();
    expect(screen.getByText('completion')).toBeInTheDocument();
    expect(screen.getByText('sessions')).toBeInTheDocument();

    // Check specific values - streak and sessions both show "2", completion shows "67%"
    expect(screen.getByText('67%')).toBeInTheDocument();

    // Both "2" values should be present (streak and sessions)
    const twoValues = screen.getAllByText('2');
    expect(twoValues).toHaveLength(2);
  });

  it('renders day pills and allows selecting data cells', () => {
    const points = [
      makePoint({ date: '2026-07-15', plannedDurationMin: 60, actualDurationMin: 60 }),
      makePoint({ date: '2026-07-14', plannedDurationMin: 60, actualDurationMin: 30 }),
      makePoint({ date: '2026-07-13', plannedDurationMin: 60, actualDurationMin: 0, actualSessionCount: 0 }),
      makePoint({
        date: '2026-07-12',
        plannedDurationMin: 0,
        actualDurationMin: 0,
        plannedSessionCount: 0,
        actualSessionCount: 0,
        hasTraining: false,
      }),
    ];

    const onSelectDate = vi.fn();
    render(<TrainingCalendarHeatmap points={points} onSelectDate={onSelectDate} />);

    // Check that partial cell exists and is clickable
    const partialCell = screen.getByLabelText('2026-07-14: partial');
    expect(partialCell).not.toBeDisabled();
    fireEvent.click(partialCell);
    expect(onSelectDate).toHaveBeenCalledWith('2026-07-14');

    // Check other statuses exist
    expect(screen.getByLabelText('2026-07-13: missed')).toBeInTheDocument();
    expect(screen.getByLabelText('2026-07-12: rest')).toBeInTheDocument();

    // No-data cells (outside the points range) should be disabled
    const noDataCell = screen.getByLabelText('2026-07-11: no-data');
    expect(noDataCell).toBeDisabled();
    fireEvent.click(noDataCell);
    expect(onSelectDate).toHaveBeenCalledTimes(1); // Still just 1 from earlier
  });

  it('shows "Today" label for current date', () => {
    const points = [
      makePoint({ date: '2026-07-15', plannedDurationMin: 60, actualDurationMin: 60 }),
    ];

    render(<TrainingCalendarHeatmap points={points} />);

    // "Today" should appear as a label
    expect(screen.getByText('Today')).toBeInTheDocument();

    // Today's cell should have special styling (emerald ring)
    const todayCell = screen.getByLabelText('2026-07-15: completed');
    expect(todayCell).toHaveClass('ring-emerald-500/70');
  });

  it('displays duration for training days', () => {
    const points = [
      makePoint({ date: '2026-07-15', plannedDurationMin: 60, actualDurationMin: 45 }),
      makePoint({ date: '2026-07-14', plannedDurationMin: 60, actualDurationMin: 90 }),
    ];

    render(<TrainingCalendarHeatmap points={points} />);

    // Duration should be shown as "Xm" format
    expect(screen.getByText('45m')).toBeInTheDocument();
    expect(screen.getByText('90m')).toBeInTheDocument();
  });

  it('renders legend with status colors', () => {
    render(<TrainingCalendarHeatmap points={[]} />);

    expect(screen.getByText('Trained')).toBeInTheDocument();
    expect(screen.getByText('Missed')).toBeInTheDocument();
    expect(screen.getByText('Rest')).toBeInTheDocument();
    expect(screen.getByText('No Data')).toBeInTheDocument();
  });

  it('highlights selected date', () => {
    const points = [
      makePoint({ date: '2026-07-15', plannedDurationMin: 60, actualDurationMin: 60 }),
      makePoint({ date: '2026-07-14', plannedDurationMin: 60, actualDurationMin: 60 }),
    ];

    render(<TrainingCalendarHeatmap points={points} selectedDate="2026-07-14" />);

    const selectedCell = screen.getByLabelText('2026-07-14: completed');
    expect(selectedCell).toHaveClass('ring-white');
  });
});
