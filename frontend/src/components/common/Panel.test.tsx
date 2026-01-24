import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Panel } from './Panel';

describe('Panel', () => {
  it('renders children', () => {
    render(<Panel>Content</Panel>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders title and subtitle when provided', () => {
    render(
      <Panel title="Panel Title" subtitle="Subtitle text">
        Content
      </Panel>
    );
    const heading = screen.getByRole('heading', { level: 3, name: 'Panel Title' });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText('Subtitle text')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Panel className="custom-class">Content</Panel>);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('passes through additional props', () => {
    render(
      <Panel data-testid="test-panel" aria-label="test">
        Content
      </Panel>
    );
    const panel = screen.getByTestId('test-panel');
    expect(panel).toHaveAttribute('aria-label', 'test');
  });
});
