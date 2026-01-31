import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MealCycler } from './MealCycler';
import { HolographicPlate, type MacroType } from './HolographicPlate';
import { CommandArmory } from './CommandArmory';
import { IngredientPile } from './IngredientPile';
import { RemainingBudget } from './RemainingBudget';
import { LoggedMealsPanel } from './LoggedMealsPanel';
import { useTacticalKitchenState, API_MEAL_MAP, type MealName } from './useTacticalKitchenState';
import { useProfile } from '../../hooks/useProfile';
import { useDailyLog } from '../../hooks/useDailyLog';
import { getFoodReference, addConsumedMacros, clearMealConsumedMacros, updateActiveCalories } from '../../api/client';
import { useDynamicBudget } from '../../hooks/useDynamicBudget';
import type { FoodReference, FastingProtocol, DayType, MealsConsumed } from '../../api/types';

const DEFAULT_MEALS_CONSUMED: MealsConsumed = {
  breakfast: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  lunch: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  dinner: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
};

export function TacticalKitchen() {
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  const { log, loading: logLoading, refresh: refreshLog } = useDailyLog();

  const [foods, setFoods] = useState<FoodReference[]>([]);
  const [foodsLoading, setFoodsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pulsingMacro, setPulsingMacro] = useState<MacroType | null>(null);

  // Derive protocol from profile (default to standard if not set)
  // Ensure we respect the profile's protocol for kitchen logic
  const protocol: FastingProtocol = profile?.fastingProtocol ?? 'standard';
  const dayType: DayType = log?.dayType ?? 'metabolize';

  // State management
  const {
    activeMeal,
    activeMealState,
    canNavigate,
    nextMeal,
    prevMeal,
    addFood,
    removeFood,
    clearMeal,
    setMealIndex,
    availableMeals,
  } = useTacticalKitchenState(protocol);

  const fruitVegCarbsG = activeMealState.fruitVegCarbsG ?? 0;
  const consumedToday = {
    proteinG: (log?.consumedProteinG ?? 0) + activeMealState.totalProteinG,
    carbsG: (log?.consumedCarbsG ?? 0) + activeMealState.totalCarbsG,
    fatG: (log?.consumedFatG ?? 0) + activeMealState.totalFatG,
    calories: (log?.consumedCalories ?? 0) + activeMealState.totalCalories,
  };

  // Load food reference data
  useEffect(() => {
    const controller = new AbortController();
    getFoodReference(controller.signal)
      .then((res) => setFoods(res.foods))
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Failed to load food reference:', err);
        }
      })
      .finally(() => setFoodsLoading(false));

    return () => controller.abort();
  }, []);

  // Use Dynamic Budget Hook
  const {
    activeBurn,
    totalBudget,
    isWarning,
    setManualBurn,
    activeBurnSource
  } = useDynamicBudget({ log });

  // Handle active burn persistence
  const handleActiveBurnBlur = useCallback(async () => {
    if (!log) return;
    try {
      await updateActiveCalories(log.date, { activeCaloriesBurned: activeBurn });
      refreshLog();
    } catch (err) {
      console.error('Failed to update active calories:', err);
    }
  }, [log, activeBurn, refreshLog]);

  // Derive targets for the current meal from the daily log
  // Scale macros based on total budget vs base
  const baseCalories = log?.calculatedTargets?.totalCalories || 2000;
  const scaleFactor = totalBudget / baseCalories;

  const mealTargets = log?.calculatedTargets
    ? {
      proteinG: Math.round(log.calculatedTargets.totalProteinG * getMealRatio(activeMeal, protocol) * scaleFactor),
      carbsG: Math.round(log.calculatedTargets.totalCarbsG * getMealRatio(activeMeal, protocol) * scaleFactor),
      fatG: Math.round(log.calculatedTargets.totalFatsG * getMealRatio(activeMeal, protocol) * scaleFactor),
      calories: Math.round(totalBudget * getMealRatio(activeMeal, protocol)),
    }
    : { proteinG: 40, carbsG: 60, fatG: 20, calories: 600 };

  // Get logged meals from daily log
  const mealsConsumed: MealsConsumed = log?.mealsConsumed ?? DEFAULT_MEALS_CONSUMED;

  // Handlers
  const handleAddFood = useCallback(
    (food: FoodReference, grams: number) => {
      addFood(food, grams);
    },
    [addFood]
  );

  const handlePulseRing = useCallback((macroType: MacroType) => {
    setPulsingMacro(macroType);
    setTimeout(() => setPulsingMacro(null), 400);
  }, []);

  const handleConfirmMeal = useCallback(async () => {
    if (!log || activeMealState.items.length === 0) return;

    setIsSubmitting(true);
    try {
      await addConsumedMacros(log.date, {
        meal: API_MEAL_MAP[activeMeal],
        calories: activeMealState.totalCalories,
        proteinG: activeMealState.totalProteinG,
        carbsG: activeMealState.totalCarbsG,
        fatG: activeMealState.totalFatG,
      });
      clearMeal();
      refreshLog();
    } catch (err) {
      console.error('Failed to save meal:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [log, activeMeal, activeMealState, clearMeal, refreshLog]);

  const handleEditMeal = useCallback(
    async (meal: 'breakfast' | 'lunch' | 'dinner') => {
      if (!log) return;

      // Clear the meal on the server
      try {
        await clearMealConsumedMacros(log.date, meal);
        refreshLog();

        // Switch to that meal slot
        const mealIndex = availableMeals.indexOf(meal as MealName);
        if (mealIndex !== -1 && setMealIndex) {
          setMealIndex(mealIndex);
        }
      } catch (err) {
        console.error('Failed to clear meal:', err);
      }
    },
    [log, refreshLog, availableMeals, setMealIndex]
  );

  const handleClearMeal = useCallback(
    async (meal: 'breakfast' | 'lunch' | 'dinner') => {
      if (!log) return;

      try {
        await clearMealConsumedMacros(log.date, meal);
        refreshLog();
      } catch (err) {
        console.error('Failed to clear meal:', err);
      }
    },
    [log, refreshLog]
  );

  const loading = profileLoading || (logLoading && !log) || foodsLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-950 flex flex-col overflow-hidden">
      {/* Top Nav */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg bg-slate-800/60 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-bold text-slate-300 tracking-wider">COMMAND CENTER</h1>
        <div className="w-9" />
      </div>

      {/* Meal Cycler */}
      <MealCycler
        protocol={protocol}
        activeMeal={activeMeal}
        canNavigate={canNavigate}
        onPrev={prevMeal}
        onNext={nextMeal}
      />

      {/* Main Content: 40/60 Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANE (40%) */}
        <div className="w-2/5 flex flex-col p-4 gap-4 overflow-y-auto border-r border-slate-800">
          {/* Holographic Plate */}
          <div className="flex justify-center">
            <HolographicPlate
              mealState={activeMealState}
              targets={mealTargets}
              dailyTargets={{
                proteinG: log?.calculatedTargets?.totalProteinG ?? 100,
                carbsG: log?.calculatedTargets?.totalCarbsG ?? 100,
                fatG: log?.calculatedTargets?.totalFatsG ?? 50,
                calories: totalBudget,
              }}
              consumedToday={consumedToday}
              fruitVegCarbsG={fruitVegCarbsG}
              pulsingMacro={pulsingMacro}
              isWarning={isWarning}
            />
          </div>

          {/* Active Fuel Control */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900/40 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold tracking-wider">ACTIVE BURN</span>
              {activeBurnSource === 'manual' && <span className="text-[10px] bg-slate-800 text-slate-400 px-1 rounded uppercase">Manual</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold">+</span>
              <input
                type="number"
                value={activeBurn || ''}
                placeholder="0"
                onChange={(e) => setManualBurn(e.target.value ? parseInt(e.target.value) : 0)}
                onBlur={handleActiveBurnBlur}
                className="w-16 bg-transparent text-right text-emerald-400 font-bold focus:outline-none tabular-nums"
              />
              <span className="text-xs text-emerald-500 font-medium">kcal</span>
            </div>
          </div>

          {/* Remaining Budget */}
          <RemainingBudget targets={mealTargets} consumed={activeMealState} />

          {/* Logged Meals Panel */}
          <LoggedMealsPanel
            mealsConsumed={mealsConsumed}
            activeMeal={activeMeal}
            onEditMeal={handleEditMeal}
            onClearMeal={handleClearMeal}
          />

          {/* Current Meal Items (in-progress) */}
          {activeMealState.items.length > 0 && (
            <div className="flex-1 min-h-0">
              <h3 className="text-xs font-bold text-slate-500 tracking-wider mb-2">ADDING NOW</h3>
              <IngredientPile items={activeMealState.items} onRemove={removeFood} />
            </div>
          )}

          {/* Confirm Button */}
          {activeMealState.items.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleConfirmMeal}
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold flex items-center justify-center gap-2 hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-lg flex-shrink-0"
            >
              <Check className="w-5 h-5" />
              {isSubmitting ? 'Saving...' : 'Confirm Meal'}
            </motion.button>
          )}
        </div>

        {/* RIGHT PANE (60%) - Command Armory */}
        <div className="w-3/5">
          <CommandArmory
            foods={foods}
            dayType={dayType}
            activeMeal={activeMeal}
            onAdd={handleAddFood}
            onPulseRing={handlePulseRing}
          />
        </div>
      </div>
    </div>
  );
}

// Helper to get meal ratio based on protocol
function getMealRatio(meal: string, protocol: FastingProtocol): number {
  const ratios: Record<FastingProtocol, Record<string, number>> = {
    standard: { breakfast: 0.3, lunch: 0.35, dinner: 0.35 },
    '16_8': { lunch: 0.45, dinner: 0.55 },
    '20_4': { feast: 1.0 },
  };
  return ratios[protocol][meal] ?? 0.33;
}
