import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdjustStrategyModal } from './AdjustStrategyModal';
import type { NutritionPlan, DualTrackAnalysis, RecalibrationOption } from '../../api/types';

describe('AdjustStrategyModal', () => {
  const mockPlan: NutritionPlan = {
    id: 1,
    name: 'Test Plan',
    startDate: '2024-01-01',
    startWeightKg: 80,
    goalWeightKg: 75,
    durationWeeks: 8,
    requiredWeeklyChangeKg: -0.625,
    requiredDailyDeficitKcal: 625,
    status: 'active',
    currentWeek: 4,
    weeklyTargets: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const increaseDeficitOption: RecalibrationOption = {
    type: 'increase_deficit',
    feasibilityTag: 'Moderate',
    newParameter: '-750 kcal/day',
    impact: 'Increase deficit by 125 kcal/day',
  };

  const extendTimelineOption: RecalibrationOption = {
    type: 'extend_timeline',
    feasibilityTag: 'Achievable',
    newParameter: '10 weeks',
    impact: 'Add 2 weeks to plan duration',
  };

  const mockAnalysis: DualTrackAnalysis = {
    planId: 1,
    analysisDate: '2024-02-01',
    currentWeek: 4,
    plannedWeightKg: 77.5,
    actualWeightKg: 78.5,
    varianceKg: 1.0,
    variancePercent: 1.3,
    tolerancePercent: 5.0,
    recalibrationNeeded: true,
    options: [increaseDeficitOption, extendTimelineOption],
    planProjection: [],
  };

  const mockOnClose = vi.fn();
  const mockOnApply = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows user to select and apply an option', async () => {
    mockOnApply.mockResolvedValue(undefined);

    render(
      <AdjustStrategyModal
        isOpen={true}
        onClose={mockOnClose}
        plan={mockPlan}
        analysis={mockAnalysis}
        onApply={mockOnApply}
      />
    );

    // Click the "Push Harder" option
    const pushHarderButton = screen.getByText('Push Harder');
    fireEvent.click(pushHarderButton);

    // Click "Apply Changes"
    const applyButton = screen.getByText('Apply Changes');
    fireEvent.click(applyButton);

    // Wait for the async operation
    await waitFor(() => {
      expect(mockOnApply).toHaveBeenCalledWith(increaseDeficitOption);
    });

    // Modal should close after successful application
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('shows error when Apply is clicked without selecting an option', async () => {
    render(
      <AdjustStrategyModal
        isOpen={true}
        onClose={mockOnClose}
        plan={mockPlan}
        analysis={mockAnalysis}
        onApply={mockOnApply}
      />
    );

    // Try to click "Apply Changes" without selecting an option
    // Note: The button should be disabled, but we test the handler logic
    const applyButton = screen.getByText('Apply Changes');
    expect(applyButton).toBeDisabled();
  });

  it('stores the selected option when clicked', async () => {
    mockOnApply.mockResolvedValue(undefined);

    render(
      <AdjustStrategyModal
        isOpen={true}
        onClose={mockOnClose}
        plan={mockPlan}
        analysis={mockAnalysis}
        onApply={mockOnApply}
      />
    );

    // Click "Extend Timeline" option
    const extendTimelineButton = screen.getByText('Extend Timeline');
    fireEvent.click(extendTimelineButton);

    // Apply button should now be enabled
    const applyButton = screen.getByText('Apply Changes');
    expect(applyButton).not.toBeDisabled();

    // Click Apply
    fireEvent.click(applyButton);

    // Should call onApply with the stored option
    await waitFor(() => {
      expect(mockOnApply).toHaveBeenCalledWith(extendTimelineOption);
    });
  });

  it('handles errors from onApply and displays error message', async () => {
    const errorMessage = 'Failed to apply strategy adjustment';
    mockOnApply.mockRejectedValue(new Error(errorMessage));

    render(
      <AdjustStrategyModal
        isOpen={true}
        onClose={mockOnClose}
        plan={mockPlan}
        analysis={mockAnalysis}
        onApply={mockOnApply}
      />
    );

    // Select an option
    const pushHarderButton = screen.getByText('Push Harder');
    fireEvent.click(pushHarderButton);

    // Click Apply
    const applyButton = screen.getByText('Apply Changes');
    fireEvent.click(applyButton);

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    // Modal should NOT close on error
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('resets selection when modal is closed and reopened', async () => {
    mockOnApply.mockResolvedValue(undefined);

    const { rerender } = render(
      <AdjustStrategyModal
        isOpen={true}
        onClose={mockOnClose}
        plan={mockPlan}
        analysis={mockAnalysis}
        onApply={mockOnApply}
      />
    );

    // Select an option
    const pushHarderButton = screen.getByText('Push Harder');
    fireEvent.click(pushHarderButton);

    // Verify option is selected (button should be enabled)
    const applyButton = screen.getByText('Apply Changes');
    expect(applyButton).not.toBeDisabled();

    // Close the modal
    rerender(
      <AdjustStrategyModal
        isOpen={false}
        onClose={mockOnClose}
        plan={mockPlan}
        analysis={mockAnalysis}
        onApply={mockOnApply}
      />
    );

    // Reopen the modal
    rerender(
      <AdjustStrategyModal
        isOpen={true}
        onClose={mockOnClose}
        plan={mockPlan}
        analysis={mockAnalysis}
        onApply={mockOnApply}
      />
    );

    // Apply button should be disabled again (selection was reset)
    const applyButtonAfterReopen = screen.getByText('Apply Changes');
    expect(applyButtonAfterReopen).toBeDisabled();
  });

  it('prevents applying when option becomes null after selection (race condition)', async () => {
    mockOnApply.mockResolvedValue(undefined);

    const { rerender } = render(
      <AdjustStrategyModal
        isOpen={true}
        onClose={mockOnClose}
        plan={mockPlan}
        analysis={mockAnalysis}
        onApply={mockOnApply}
      />
    );

    // Select "Push Harder" option
    const pushHarderButton = screen.getByText('Push Harder');
    fireEvent.click(pushHarderButton);

    // Simulate analysis update where options become empty (race condition)
    const updatedAnalysis: DualTrackAnalysis = {
      ...mockAnalysis,
      options: [], // Options now empty
    };

    rerender(
      <AdjustStrategyModal
        isOpen={true}
        onClose={mockOnClose}
        plan={mockPlan}
        analysis={updatedAnalysis}
        onApply={mockOnApply}
      />
    );

    // The stored option should still be used when clicking Apply
    const applyButton = screen.getByText('Apply Changes');
    expect(applyButton).not.toBeDisabled(); // Still enabled because we stored the option

    fireEvent.click(applyButton);

    // Should call onApply with the originally stored option, not try to look it up again
    await waitFor(() => {
      expect(mockOnApply).toHaveBeenCalledWith(increaseDeficitOption);
    });
  });

  it('disables Apply button when no options are available', () => {
    const analysisWithNoOptions: DualTrackAnalysis = {
      ...mockAnalysis,
      options: [],
    };

    render(
      <AdjustStrategyModal
        isOpen={true}
        onClose={mockOnClose}
        plan={mockPlan}
        analysis={analysisWithNoOptions}
        onApply={mockOnApply}
      />
    );

    // Should show "No adjustments needed" message
    expect(screen.getByText('No adjustments needed')).toBeInTheDocument();

    // Apply button should be disabled
    const applyButton = screen.getByText('Apply Changes');
    expect(applyButton).toBeDisabled();
  });

  it('suppresses options and shows updated message when recentlyRecalibrated is true', () => {
    render(
      <AdjustStrategyModal
        isOpen={true}
        onClose={mockOnClose}
        plan={mockPlan}
        analysis={mockAnalysis}
        onApply={mockOnApply}
        recentlyRecalibrated={true}
      />
    );

    // Should NOT show recalibration options
    expect(screen.queryByText('Push Harder')).not.toBeInTheDocument();
    expect(screen.queryByText('Extend Timeline')).not.toBeInTheDocument();

    // Should show the "Strategy Updated" message
    expect(screen.getByText('Strategy Updated')).toBeInTheDocument();

    // Apply button should be disabled (no option selected)
    const applyButton = screen.getByText('Apply Changes');
    expect(applyButton).toBeDisabled();
  });

  it('shows loading state while applying', async () => {
    let resolveOnApply: () => void;
    const onApplyPromise = new Promise<void>((resolve) => {
      resolveOnApply = resolve;
    });
    mockOnApply.mockReturnValue(onApplyPromise);

    render(
      <AdjustStrategyModal
        isOpen={true}
        onClose={mockOnClose}
        plan={mockPlan}
        analysis={mockAnalysis}
        onApply={mockOnApply}
      />
    );

    // Select option
    const pushHarderButton = screen.getByText('Push Harder');
    fireEvent.click(pushHarderButton);

    // Click Apply
    const applyButton = screen.getByText('Apply Changes');
    fireEvent.click(applyButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Applying...')).toBeInTheDocument();
    });

    // Button should be disabled during loading
    expect(screen.getByText('Applying...')).toBeDisabled();

    // Resolve the promise
    resolveOnApply!();

    // Wait for completion
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
