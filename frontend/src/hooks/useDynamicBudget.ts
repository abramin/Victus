
import { useState, useEffect, useMemo } from 'react';
import type { DailyLog } from '../api/types';

interface UseDynamicBudgetProps {
    log: DailyLog | null;
}

interface DynamicBudgetResult {
    activeBurn: number;
    totalBudget: number;
    formattedActiveBurn: string;
    isWarning: boolean;
    activeBurnSource: 'calculated' | 'manual';
    setManualBurn: (burn: number | null) => void;
}

export function useDynamicBudget({ log }: UseDynamicBudgetProps): DynamicBudgetResult {
    const [manualActiveBurn, setManualActiveBurn] = useState<number | null>(null);

    // Initialize manual burn from log if available
    useEffect(() => {
        if (log?.activeCaloriesBurned !== undefined && log.activeCaloriesBurned !== null) {
            // Logic check: if we want to detect if it was manually set vs calculated, 
            // we currently don't have a flag in the backend. 
            // For now, we assume the initial value from DB is the "current truth".
            // We only use local state for immediate UI updates before saving.
        }
    }, [log]);

    // Derived values
    const baseBudget = log?.formulaTDEE ?? 1500; // Fallback to 1500 (approx floor)
    // Or should baseBudget be estimatedTDEE (which includes formula + adaptive)?
    // PRD says: "Fuel Budget Card: ... Base (1569) + Active (703) = 2272 Total."
    // Base is likely the pre-active value.
    // In dailylog.go: formulaTDEE = BMR*1.2 + exerciseCalories (PLANNED).
    // If we have ACTUAL active burn, we should replace the Planned exercise part of Base?
    // Or is Active Burn purely additive to a sedentary/light active base?
    // "The current 1,569 kcal is too low ... training at a 31.6 Load intensity."
    // If 1569 is FormulaTDEE (BMR*1.2 + Planned), and Planned was low/zero.
    // We should probably rely on `log.calculatedTargets.totalCalories` as the "Base" *if* it doesn't include active.
    // But `log.calculatedTargets` is derived from `EstimatedTDEE`.
    // `EstimatedTDEE` is either Formula or Adaptive.
    // Let's assume `log.calculatedTargets.totalCalories` is the Base Budget we start with.
    // Wait, if `CalculatedTargets` already *includes* planned exercise, and we add Active Burn (actual), we verify double counting.
    // Ideally: Base = BMR * 1.2 (Sedentary). Active = Active Burn. Total = Base + Active.
    // `log.formulaTDEE` calculation in backend: `int(bmrResult.BMR*1.2 + exerciseCalories)`.
    // If `exerciseCalories` (from planned) is > 0, it's included.
    // If we assume Active Burn replaces Planned, we should subtract Planned exercise calories from Base?
    // Complicated. 
    // Simplified approach per PRD: "Base (1569) + Active (703)".
    // 1569 looks like a standard TDEE.
    // I will use `log.calculatedTargets.totalCalories` as Base.
    // And just ADD Active Burn.
    // Caveat: If Planned was huge, Base is huge. Adding Active makes it huge + huge.
    // If user plans accurately, Active should match Planned.
    // Ideally, `Active Burn` should be the *delta* or we use Active *instead* of Planned.
    // Given "Garmin Overrule", likely Active represents the *total* active energy.
    // Implementation: `total = base + active`.

    const dbActiveBurn = log?.activeCaloriesBurned ?? 0;

    // Use manual override if set locally, otherwise DB value
    // If we implement "Manual Burn Offset", we might want to differentiate "User typed this" vs "DB has this".
    // Since we don't have a backend flag, we'll treat them uniformly for display.
    // But we need to know if we should display "ACTIVE" label.
    const activeBurn = manualActiveBurn !== null ? manualActiveBurn : dbActiveBurn;

    // Total Budget = Base (e.g. TotalCalories from targets) + Active Burn
    // Note: TotalCalories from targets *already* includes some logic. 
    // If we want purely additive, we assume TotalCalories is the baseline.
    // But `TotalCalories` in DB is the *final* budget. 
    // If the backend doesn't update `TotalCalories` when `active_burn` changes (it doesn't currently),
    // then `log.calculatedTargets.totalCalories` is indeed the "Base" (without active burn).
    const baseWithMultiplier = log?.calculatedTargets?.totalCalories ?? 2000;

    const totalBudget = baseWithMultiplier + activeBurn;

    // Safety Logic
    // Warning if (Total - Active) < 1200.
    // Wait, `Total - Active` IS `Base`.
    // So this warns if `Base < 1200`.
    // If `Base` is static, this warning is static.
    // Is that right? "If your Total Intake - Active Burn drops below 1,200 kcal".
    // Maybe "Total Intake" allows for *eating*.
    // "Total Intake" usually means calories consumed.
    // If (Consumed - Active) < 1200 => Warn.
    // This means "Net Availability" is low.
    // This is a dynamic check based on consumption!
    const consumed = log?.consumedCalories ?? 0;
    // Actually, usually "Intake" refers to the *Plan* in a budgeting context, OR actual consumption in a tracking context.
    // "Kitchen Fuel Budget" -> Planning.
    // But warning "Metabolic Crash Risk" usually applies to *chronic* low availability or *planned* low.
    // If I haven't eaten, obviously my net is negative.
    // But I shouldn't be warned "Crash Risk" just because it's 8am.
    // Unless it predicts I *won't* eat enough?
    // Let's assume it refers to the *Budget* (Target) in the context of the Kitchen (planning phase).
    // "Fuel Budget Card: Update the sub-labels to show the math: Base (1569) + Active (703) = 2272 Total."
    // If Base < 1200, warn?
    // Or maybe "Total Intake" implies "Total Target"?
    // Let's stick to `(TotalBudget - ActiveBurn) < 1200`. which simplifies to `Base < 1200`.
    // This ensures the *Base* is safe.
    // User: "The current 1,569 kcal is too low...".
    // If Base is 1569, it's safe.
    // If Base was 1100, warn.
    // But wait, "If your Total Intake - Active Burn drops below 1,200 kcal".
    // Use `totalBudget`.

    const isWarning = (totalBudget - activeBurn) < 1200;

    const formattedActiveBurn = activeBurn > 0 ? `+ ${activeBurn} kcal` : '';

    return {
        activeBurn,
        totalBudget,
        formattedActiveBurn,
        isWarning,
        activeBurnSource: manualActiveBurn !== null ? 'manual' : 'calculated',
        setManualBurn: setManualActiveBurn,
    };
}
