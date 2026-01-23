import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Select } from './Select';

const TEST_OPTIONS = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
];

describe('Select', () => {
  it('renders with label', () => {
    render(
      <Select label="Choose Option" value="" onChange={() => {}} options={TEST_OPTIONS} />
    );
    expect(screen.getByText('Choose Option')).toBeInTheDocument();
  });

  it('renders all options', () => {
    render(
      <Select label="Choose Option" value="" onChange={() => {}} options={TEST_OPTIONS} />
    );
    
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('renders default "Select..." option', () => {
    render(
      <Select label="Choose Option" value="" onChange={() => {}} options={TEST_OPTIONS} />
    );
    expect(screen.getByText('Select...')).toBeInTheDocument();
  });

  it('displays selected value', () => {
    render(
      <Select label="Choose Option" value="option2" onChange={() => {}} options={TEST_OPTIONS} />
    );
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('option2');
  });

  it('calls onChange when selection changes', () => {
    const handleChange = vi.fn();
    render(
      <Select label="Choose Option" value="" onChange={handleChange} options={TEST_OPTIONS} />
    );
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'option2' } });
    
    expect(handleChange).toHaveBeenCalledWith('option2');
  });

  it('displays error message', () => {
    render(
      <Select
        label="Choose Option"
        value=""
        onChange={() => {}}
        options={TEST_OPTIONS}
        error="Selection is required"
      />
    );
    expect(screen.getByText('Selection is required')).toBeInTheDocument();
  });

  it('displays required indicator', () => {
    render(
      <Select
        label="Choose Option"
        value=""
        onChange={() => {}}
        options={TEST_OPTIONS}
        required
      />
    );
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('has accessible label-select connection', () => {
    render(
      <Select label="Choose Option" value="" onChange={() => {}} options={TEST_OPTIONS} />
    );
    const select = screen.getByRole('combobox');
    const label = screen.getByText('Choose Option').closest('label');
    
    // Check that label has htmlFor and select has matching id
    expect(label).toHaveAttribute('for');
    expect(select).toHaveAttribute('id');
    expect(label?.getAttribute('for')).toBe(select.getAttribute('id'));
  });

  it('correctly renders empty options list', () => {
    render(
      <Select label="Choose Option" value="" onChange={() => {}} options={[]} />
    );
    const select = screen.getByRole('combobox');
    // Should only have the default "Select..." option
    expect(select.querySelectorAll('option')).toHaveLength(1);
  });
});
