import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NumberInput } from './NumberInput';

describe('NumberInput', () => {
  it('renders with label', () => {
    render(<NumberInput label="Weight" value={75} onChange={() => {}} />);
    expect(screen.getByText('Weight')).toBeInTheDocument();
  });

  it('displays value correctly', () => {
    render(<NumberInput label="Weight" value={75.5} onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('75.5');
  });

  it('displays empty string for zero value', () => {
    render(<NumberInput label="Weight" value={0} onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('');
  });

  it('calls onChange with parsed number', () => {
    const handleChange = vi.fn();
    render(<NumberInput label="Weight" value={0} onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '80' } });
    
    expect(handleChange).toHaveBeenCalledWith(80);
  });

  it('handles comma as decimal separator', () => {
    const handleChange = vi.fn();
    render(<NumberInput label="Weight" value={0} onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '75,5' } });
    
    expect(handleChange).toHaveBeenCalledWith(75.5);
  });

  it('handles period as decimal separator', () => {
    const handleChange = vi.fn();
    render(<NumberInput label="Weight" value={0} onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '75.5' } });
    
    expect(handleChange).toHaveBeenCalledWith(75.5);
  });

  it('displays unit suffix', () => {
    render(<NumberInput label="Weight" value={75} onChange={() => {}} unit="kg" />);
    expect(screen.getByText('kg')).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(
      <NumberInput
        label="Weight"
        value={25}
        onChange={() => {}}
        error="Weight must be between 30 and 300 kg"
      />
    );
    expect(screen.getByText('Weight must be between 30 and 300 kg')).toBeInTheDocument();
  });

  it('displays required indicator', () => {
    render(<NumberInput label="Weight" value={75} onChange={() => {}} required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('has accessible label-input connection', () => {
    render(<NumberInput label="Weight" value={75} onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    const label = screen.getByText('Weight').closest('label');
    
    // Check that label has htmlFor and input has matching id
    expect(label).toHaveAttribute('for');
    expect(input).toHaveAttribute('id');
    expect(label?.getAttribute('for')).toBe(input.getAttribute('id'));
  });

  it('handles invalid input gracefully', () => {
    const handleChange = vi.fn();
    render(<NumberInput label="Weight" value={0} onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'abc' } });
    
    // Should return 0 for invalid input
    expect(handleChange).toHaveBeenCalledWith(0);
  });
});
