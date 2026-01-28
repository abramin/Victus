import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RPEDial } from './RPEDial';

describe('RPEDial', () => {
  it('renders with initial value displayed', () => {
    render(<RPEDial value={5} onChange={vi.fn()} />);
    expect(screen.getByText('5')).toBeDefined();
    expect(screen.getByText('Moderate')).toBeDefined();
  });

  it('displays correct zone label for each RPE range', () => {
    const { rerender } = render(<RPEDial value={2} onChange={vi.fn()} />);
    expect(screen.getByText('Easy')).toBeDefined();

    rerender(<RPEDial value={6} onChange={vi.fn()} />);
    expect(screen.getByText('Moderate')).toBeDefined();

    rerender(<RPEDial value={8} onChange={vi.fn()} />);
    expect(screen.getByText('Hard')).toBeDefined();

    rerender(<RPEDial value={10} onChange={vi.fn()} />);
    expect(screen.getByText('Max')).toBeDefined();
  });

  it('calls onChange when a tap target is clicked', () => {
    const onChange = vi.fn();
    const { container } = render(<RPEDial value={3} onChange={onChange} />);

    // Tap targets are invisible paths with cursor-pointer
    const tapTargets = container.querySelectorAll('path.cursor-pointer');
    expect(tapTargets.length).toBe(10);

    // Click the 7th target (RPE 7)
    fireEvent.click(tapTargets[6]);
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it('renders no tap targets in readOnly mode', () => {
    const { container } = render(<RPEDial value={5} onChange={vi.fn()} readOnly />);
    const tapTargets = container.querySelectorAll('path.cursor-pointer');
    expect(tapTargets.length).toBe(0);
  });

  it('clamps value to 1-10 range', () => {
    render(<RPEDial value={0} onChange={vi.fn()} />);
    expect(screen.getByText('1')).toBeDefined();

    const { rerender } = render(<RPEDial value={15} onChange={vi.fn()} />);
    rerender(<RPEDial value={15} onChange={vi.fn()} />);
    expect(screen.getByText('10')).toBeDefined();
  });
});
