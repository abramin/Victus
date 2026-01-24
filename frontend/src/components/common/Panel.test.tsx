import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Panel } from './Panel';

describe('Panel', () => {
  it('renders children', () => {
    render(<Panel>Content</Panel>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(<Panel title="Panel Title">Content</Panel>);
    expect(screen.getByText('Panel Title')).toBeInTheDocument();
    expect(screen.getByText('Panel Title').tagName).toBe('H3');
  });

  it('renders subtitle when provided', () => {
    render(<Panel title="Title" subtitle="Subtitle text">Content</Panel>);
    expect(screen.getByText('Subtitle text')).toBeInTheDocument();
  });

  it('applies default padding class (md)', () => {
    const { container } = render(<Panel>Content</Panel>);
    expect(container.firstChild).toHaveClass('p-5');
  });

  it('applies sm padding class', () => {
    const { container } = render(<Panel padding="sm">Content</Panel>);
    expect(container.firstChild).toHaveClass('p-3');
  });

  it('applies lg padding class', () => {
    const { container } = render(<Panel padding="lg">Content</Panel>);
    expect(container.firstChild).toHaveClass('p-8');
  });

  it('applies no padding when padding is none', () => {
    const { container } = render(<Panel padding="none">Content</Panel>);
    expect(container.firstChild).not.toHaveClass('p-3');
    expect(container.firstChild).not.toHaveClass('p-5');
    expect(container.firstChild).not.toHaveClass('p-8');
  });

  it('applies custom className', () => {
    const { container } = render(<Panel className="custom-class">Content</Panel>);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('passes through additional props', () => {
    render(<Panel data-testid="test-panel" aria-label="test">Content</Panel>);
    const panel = screen.getByTestId('test-panel');
    expect(panel).toHaveAttribute('aria-label', 'test');
  });

  it('has consistent base styling', () => {
    const { container } = render(<Panel>Content</Panel>);
    expect(container.firstChild).toHaveClass('bg-gray-900');
    expect(container.firstChild).toHaveClass('rounded-xl');
    expect(container.firstChild).toHaveClass('border');
    expect(container.firstChild).toHaveClass('border-gray-800');
  });
});
