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

    const streakCard = screen.getByText('Current Streak').closest('div')?.parentElement;
    expect(streakCard).toBeTruthy();
    expect(within(streakCard as HTMLElement).getByText('2 Days')).toBeInTheDocument();

    const completionCard = screen.getByText('Completion Rate').closest('div')?.parentElement;
    expect(completionCard).toBeTruthy();
    expect(within(completionCard as HTMLElement).getByText('67%')).toBeInTheDocument();

    const sessionsCard = screen.getByText('Total Sessions').closest('div')?.parentElement;
    expect(sessionsCard).toBeTruthy();
    expect(within(sessionsCard as HTMLElement).getByText('2')).toBeInTheDocument();
  });

  it('renders statuses and allows selecting data cells', () => {
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

    const partialCell = screen.getByLabelText('2026-07-14: partial');
    expect(partialCell).not.toBeDisabled();
    fireEvent.click(partialCell);
    expect(onSelectDate).toHaveBeenCalledWith('2026-07-14');

    expect(screen.getByLabelText('2026-07-13: missed')).toBeInTheDocument();
    expect(screen.getByLabelText('2026-07-12: rest')).toBeInTheDocument();

    const noDataCell = screen.getByLabelText('2026-07-11: no-data');
    expect(noDataCell).toBeDisabled();
    fireEvent.click(noDataCell);
    expect(onSelectDate).toHaveBeenCalledTimes(1);
  });
});
