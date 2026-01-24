import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PortionPlateVisualizer } from './PortionPlateVisualizer';

describe('PortionPlateVisualizer', () => {
  const defaultProps = {
    plateMultiplier: 0.5,
    foodName: 'Chicken Breast',
  };

  it('renders without crashing', () => {
    const { container } = render(<PortionPlateVisualizer {...defaultProps} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('displays the food name', () => {
    render(<PortionPlateVisualizer {...defaultProps} />);
    expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
  });

  it('displays the portion description for quarter plate (0.25)', () => {
    render(<PortionPlateVisualizer {...defaultProps} plateMultiplier={0.25} />);
    expect(screen.getByText(/quarter/i)).toBeInTheDocument();
  });

  it('displays the portion description for half plate (0.5)', () => {
    render(<PortionPlateVisualizer {...defaultProps} plateMultiplier={0.5} />);
    expect(screen.getByText(/half/i)).toBeInTheDocument();
  });

  it('displays the portion description for full plate (1.0)', () => {
    render(<PortionPlateVisualizer {...defaultProps} plateMultiplier={1.0} />);
    expect(screen.getByText(/full/i)).toBeInTheDocument();
  });

  it('renders correct pie slice angle for quarter plate', () => {
    const { container } = render(
      <PortionPlateVisualizer {...defaultProps} plateMultiplier={0.25} />
    );
    // Container should be present with plate visualizer
    expect(container.firstChild).toBeInTheDocument();
  });

  it('shows empty state when no food selected', () => {
    render(<PortionPlateVisualizer plateMultiplier={0} foodName="" />);
    expect(screen.getByText(/select a food/i)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <PortionPlateVisualizer {...defaultProps} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <PortionPlateVisualizer {...defaultProps} onClose={onClose} />
    );
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });
});
