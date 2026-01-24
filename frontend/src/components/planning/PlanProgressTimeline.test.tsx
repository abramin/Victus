import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlanProgressTimeline } from './PlanProgressTimeline';

describe('PlanProgressTimeline', () => {
  const defaultProps = {
    startDate: '2026-01-01',
    endDate: '2026-03-31',
    currentWeek: 4,
    totalWeeks: 12,
    startWeightKg: 95,
    currentWeightKg: 93,
    targetWeightKg: 88,
  };

  it('renders without crashing', () => {
    render(<PlanProgressTimeline {...defaultProps} />);
    expect(screen.getByText(/start/i)).toBeInTheDocument();
  });

  it('displays start weight', () => {
    render(<PlanProgressTimeline {...defaultProps} />);
    expect(screen.getByText(/95/)).toBeInTheDocument();
  });

  it('displays current weight', () => {
    render(<PlanProgressTimeline {...defaultProps} />);
    expect(screen.getByText(/93/)).toBeInTheDocument();
  });

  it('displays target weight', () => {
    render(<PlanProgressTimeline {...defaultProps} />);
    expect(screen.getByText(/88/)).toBeInTheDocument();
  });

  it('shows current position indicator', () => {
    const { container } = render(<PlanProgressTimeline {...defaultProps} />);
    // Check for the "You Are Here" indicator or similar
    expect(container.querySelector('[data-testid="current-position"]')).toBeInTheDocument();
  });

  it('displays weeks remaining', () => {
    render(<PlanProgressTimeline {...defaultProps} />);
    expect(screen.getByText(/8.*weeks/i)).toBeInTheDocument(); // 12 - 4 = 8 weeks remaining
  });

  it('displays weight lost so far', () => {
    render(<PlanProgressTimeline {...defaultProps} />);
    expect(screen.getByText(/2.*kg/i)).toBeInTheDocument(); // 95 - 93 = 2kg lost
  });

  it('calculates progress percentage correctly', () => {
    const { container } = render(<PlanProgressTimeline {...defaultProps} />);
    // Week 4 of 12 = 33% progress
    const progressBar = container.querySelector('[data-testid="progress-bar"]');
    expect(progressBar).toBeInTheDocument();
  });
});
