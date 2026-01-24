import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BulletChart } from './BulletChart';

describe('BulletChart', () => {
  const defaultProps = {
    actual: 150,
    target: 200,
    minimum: 100,
    label: 'Active Burn',
  };

  it('renders without crashing', () => {
    render(<BulletChart {...defaultProps} />);
    expect(screen.getByText('Active Burn')).toBeInTheDocument();
  });

  it('displays the label', () => {
    render(<BulletChart {...defaultProps} />);
    expect(screen.getByText('Active Burn')).toBeInTheDocument();
  });

  it('displays actual value', () => {
    render(<BulletChart {...defaultProps} />);
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('displays target value', () => {
    render(<BulletChart {...defaultProps} />);
    expect(screen.getAllByText(/200/).length).toBeGreaterThan(0);
  });

  it('shows at-risk state when actual is below minimum', () => {
    const { container } = render(
      <BulletChart {...defaultProps} actual={50} />
    );
    expect(container.querySelector('[data-state="at-risk"]')).toBeInTheDocument();
  });

  it('shows on-track state when actual meets or exceeds target', () => {
    const { container } = render(
      <BulletChart {...defaultProps} actual={200} />
    );
    expect(container.querySelector('[data-state="on-track"]')).toBeInTheDocument();
  });

  it('shows warning state when actual is between minimum and target', () => {
    const { container } = render(
      <BulletChart {...defaultProps} actual={150} />
    );
    expect(container.querySelector('[data-state="warning"]')).toBeInTheDocument();
  });

  it('applies pulse animation when atRisk and animate prop is true', () => {
    const { container } = render(
      <BulletChart {...defaultProps} actual={50} animate={true} />
    );
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('shows unit when provided', () => {
    render(<BulletChart {...defaultProps} unit="kcal" />);
    expect(screen.getByText(/kcal/)).toBeInTheDocument();
  });
});
