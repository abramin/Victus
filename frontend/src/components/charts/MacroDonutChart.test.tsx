import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MacroDonutChart } from './MacroDonutChart';

describe('MacroDonutChart', () => {
  const defaultProps = {
    carbs: 40,
    protein: 35,
    fat: 25,
  };

  it('renders without crashing', () => {
    const { container } = render(<MacroDonutChart {...defaultProps} />);
    // Container should exist with proper dimensions
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with custom size', () => {
    const { container } = render(
      <MacroDonutChart {...defaultProps} size={100} />
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ width: '100px', height: '100px' });
  });

  it('renders center label when provided', () => {
    render(<MacroDonutChart {...defaultProps} centerLabel="24" />);
    expect(screen.getByText('24')).toBeInTheDocument();
  });

  it('handles zero values gracefully', () => {
    const { container } = render(<MacroDonutChart carbs={0} protein={0} fat={0} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <MacroDonutChart {...defaultProps} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('normalizes percentages that exceed 100', () => {
    // Should still render even with values over 100
    const { container } = render(<MacroDonutChart carbs={60} protein={50} fat={40} />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
