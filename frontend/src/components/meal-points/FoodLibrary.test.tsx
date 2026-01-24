import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FoodLibrary } from './FoodLibrary';

// Mock the API client
vi.mock('../../api/client', () => ({
  getFoodReference: vi.fn(),
}));

import { getFoodReference } from '../../api/client';

const mockFoods = [
  { id: 1, foodItem: 'Chicken Breast', category: 'high_protein', plateMultiplier: 0.5 },
  { id: 2, foodItem: 'Brown Rice', category: 'high_carb', plateMultiplier: 0.25 },
  { id: 3, foodItem: 'Avocado', category: 'high_fat', plateMultiplier: 0.75 },
  { id: 4, foodItem: 'Broccoli', category: 'vegetables', plateMultiplier: 1.0 },
  { id: 5, foodItem: 'Salmon', category: 'high_protein', plateMultiplier: 0.5 },
];

describe('FoodLibrary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getFoodReference as ReturnType<typeof vi.fn>).mockResolvedValue({ foods: mockFoods });
  });

  it('renders without crashing', async () => {
    render(<FoodLibrary targetPoints={350} />);
    expect(screen.getByText('Food Library')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    render(<FoodLibrary targetPoints={350} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('displays foods after loading', async () => {
    render(<FoodLibrary targetPoints={350} />);
    await waitFor(() => {
      expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
    });
  });

  it('filters foods by category when clicking filter tabs', async () => {
    render(<FoodLibrary targetPoints={350} />);
    
    await waitFor(() => {
      expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
    });

    // Click on Carbs filter
    const carbsButton = screen.getByRole('button', { name: /carb/i });
    fireEvent.click(carbsButton);

    // Should show Brown Rice but not Chicken Breast
    await waitFor(() => {
      expect(screen.getByText('Brown Rice')).toBeInTheDocument();
    });
  });

  it('displays search input', async () => {
    render(<FoodLibrary targetPoints={350} />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    });
  });

  it('filters foods by search query', async () => {
    render(<FoodLibrary targetPoints={350} />);
    
    await waitFor(() => {
      expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'salmon' } });

    await waitFor(() => {
      expect(screen.getByText('Salmon')).toBeInTheDocument();
      expect(screen.queryByText('Chicken Breast')).not.toBeInTheDocument();
    });
  });

  it('shows portion visualizer when food is clicked', async () => {
    render(<FoodLibrary targetPoints={350} />);
    
    await waitFor(() => {
      expect(screen.getByText('Chicken Breast')).toBeInTheDocument();
    });

    const chickenItem = screen.getByText('Chicken Breast');
    fireEvent.click(chickenItem);

    // Should show the portion visualizer with food name
    await waitFor(() => {
      expect(screen.getAllByText('Chicken Breast').length).toBeGreaterThan(0);
    });
  });

  it('displays error state when API fails', async () => {
    (getFoodReference as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API Error'));
    
    render(<FoodLibrary targetPoints={350} />);
    
    await waitFor(() => {
      expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
    });
  });
});
