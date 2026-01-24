import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TrainingComplianceGrid } from './TrainingComplianceGrid';
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

describe('TrainingComplianceGrid', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders legend counts for each status', () => {
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

    render(<TrainingComplianceGrid points={points} />);

    expect(screen.getByText('Completed (1)')).toBeInTheDocument();
    expect(screen.getByText('Partial (1)')).toBeInTheDocument();
    expect(screen.getByText('Missed (1)')).toBeInTheDocument();
    expect(screen.getByText('Rest (1)')).toBeInTheDocument();
  });

  it('calls onSelectDate for data cells and disables no-data cells', () => {
    const points = [
      makePoint({ date: '2026-07-15', plannedDurationMin: 60, actualDurationMin: 60 }),
    ];

    const onSelectDate = vi.fn();
    render(<TrainingComplianceGrid points={points} onSelectDate={onSelectDate} />);

    const completedCell = screen.getByTitle('2026-07-15: Completed');
    expect(completedCell).not.toBeDisabled();
    fireEvent.click(completedCell);
    expect(onSelectDate).toHaveBeenCalledWith('2026-07-15');

    const noDataCell = screen.getByTitle('2026-07-11: No Data');
    expect(noDataCell).toBeDisabled();
    fireEvent.click(noDataCell);
    expect(onSelectDate).toHaveBeenCalledTimes(1);
  });
});
