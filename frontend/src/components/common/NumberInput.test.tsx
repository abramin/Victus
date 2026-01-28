import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NumberInput } from './NumberInput';

// Invariant: Component tests should focus on behavioral contracts unreachable via E2E.
// Most NumberInput behavior is covered by E2E tests (onboarding, daily log forms).
// These tests cover edge cases and accessibility contracts.

describe('NumberInput behavioral contracts', () => {
  describe('International decimal separator support', () => {
    it('accepts both comma and period as decimal separators', () => {
      // Invariant: European users (German, French, etc.) use comma for decimals.
      // If this breaks, non-US users cannot enter weights correctly.
      // E2E tests use period only, so this edge case needs unit coverage.

      const handleChange = vi.fn();
      const { rerender } = render(
        <NumberInput label="Weight" value={0} onChange={handleChange} />
      );

      const input = screen.getByRole('textbox');

      // Test comma separator (European format)
      fireEvent.change(input, { target: { value: '75,5' } });
      expect(handleChange).toHaveBeenLastCalledWith(75.5);

      // Reset mock
      handleChange.mockClear();

      // Test period separator (US format)
      fireEvent.change(input, { target: { value: '75.5' } });
      expect(handleChange).toHaveBeenLastCalledWith(75.5);
    });
  });

  describe('Accessibility contracts', () => {
    it('has accessible label-input association for screen readers', () => {
      // Invariant: Screen readers must correctly announce label with input.
      // If label/input association breaks, visually impaired users cannot use forms.
      // This is a WCAG 2.1 Level A requirement (1.3.1 Info and Relationships).

      render(<NumberInput label="Weight" value={75} onChange={() => {}} />);

      const input = screen.getByRole('textbox');
      const label = screen.getByText('Weight').closest('label');

      // Verify proper label-input association
      expect(label).toHaveAttribute('for');
      expect(input).toHaveAttribute('id');
      expect(label?.getAttribute('for')).toBe(input.getAttribute('id'));
    });
  });

  describe('Error boundary contracts', () => {
    it('handles non-numeric input without crashing', () => {
      // Invariant: Invalid input must not crash the app or corrupt state.
      // User might paste text accidentally - must degrade gracefully.

      const handleChange = vi.fn();
      render(<NumberInput label="Weight" value={0} onChange={handleChange} />);

      const input = screen.getByRole('textbox');

      // Should not throw
      expect(() => {
        fireEvent.change(input, { target: { value: 'abc' } });
      }).not.toThrow();

      // Should return 0 for invalid input (safe fallback)
      expect(handleChange).toHaveBeenCalledWith(0);
    });

    it('handles edge case numeric strings', () => {
      // Invariant: Edge cases like negative zero, infinity must be handled.
      // These can break macro calculations if passed through.

      const handleChange = vi.fn();
      render(<NumberInput label="Weight" value={0} onChange={handleChange} />);

      const input = screen.getByRole('textbox');

      // Test negative zero
      fireEvent.change(input, { target: { value: '-0' } });
      expect(handleChange).toHaveBeenCalledWith(0);

      handleChange.mockClear();

      // Test leading zeros
      fireEvent.change(input, { target: { value: '007' } });
      expect(handleChange).toHaveBeenCalledWith(7);
    });
  });
});
