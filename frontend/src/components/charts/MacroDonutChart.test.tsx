import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MacroDonutChart } from './MacroDonutChart';

let lastPieData: Array<{ name: string; value: number; color: string }> | null = null;

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: (props: any) => {
    lastPieData = props.data;
    return <div data-testid="pie">{props.children}</div>;
  },
  Cell: () => null,
}));

describe('MacroDonutChart', () => {
  const defaultProps = {
    carbs: 40,
    protein: 35,
    fat: 25,
  };

  beforeEach(() => {
    lastPieData = null;
  });

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
    render(<MacroDonutChart carbs={0} protein={0} fat={0} />);

    expect(lastPieData).toHaveLength(1);
    expect(lastPieData?.[0]).toMatchObject({
      name: 'Empty',
      value: 100,
      color: '#374151',
    });
  });

  it('applies custom className', () => {
    const { container } = render(
      <MacroDonutChart {...defaultProps} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('normalizes percentages that exceed 100', () => {
    // Should still render even with values over 100
    render(<MacroDonutChart carbs={60} protein={50} fat={40} />);

    expect(lastPieData).toHaveLength(3);
    expect(lastPieData?.[0].value).toBeCloseTo(40, 2);
    expect(lastPieData?.[1].value).toBeCloseTo(33.3333, 2);
    expect(lastPieData?.[2].value).toBeCloseTo(26.6666, 2);
    expect(lastPieData?.reduce((sum, item) => sum + item.value, 0)).toBeCloseTo(100, 2);
  });
});
