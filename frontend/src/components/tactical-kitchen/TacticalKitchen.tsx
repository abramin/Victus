import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { MealCycler } from './MealCycler';
import { HolographicPlate, type MacroType } from './HolographicPlate';
import { GridArmory } from './GridArmory';
import { IngredientPile } from './IngredientPile';
import { useTacticalKitchenState, API_MEAL_MAP } from './useTacticalKitchenState';
import { useProfile } from '../../hooks/useProfile';
import { useDailyLog } from '../../hooks/useDailyLog';
import { getFoodReference, addConsumedMacros } from '../../api/client';
import type { FoodReference, FastingProtocol, DayType } from '../../api/types';

export function TacticalKitchen() {
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  const { log, loading: logLoading, refresh: refreshLog } = useDailyLog();

  const [foods, setFoods] = useState<FoodReference[]>([]);
  const [foodsLoading, setFoodsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pulsingMacro, setPulsingMacro] = useState<MacroType | null>(null);

  // Derive protocol from profile (default to standard if not set)
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
  } = useTacticalKitchenState(protocol);

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

  // Derive targets for the current meal from the daily log
  const mealTargets = log?.calculatedTargets
    ? {
        proteinG: Math.round(log.calculatedTargets.totalProteinG * getMealRatio(activeMeal, protocol)),
        carbsG: Math.round(log.calculatedTargets.totalCarbsG * getMealRatio(activeMeal, protocol)),
        fatG: Math.round(log.calculatedTargets.totalFatsG * getMealRatio(activeMeal, protocol)),
        calories: Math.round(log.calculatedTargets.totalCalories * getMealRatio(activeMeal, protocol)),
      }
    : { proteinG: 40, carbsG: 60, fatG: 20, calories: 600 };

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

  const loading = profileLoading || logLoading || foodsLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Nav */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg bg-slate-800/60 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-bold text-slate-300 tracking-wider">TACTICAL KITCHEN</h1>
        <div className="w-9" /> {/* Spacer */}
      </div>

      {/* Zone A: Protocol Header / Meal Cycler */}
      <MealCycler
        protocol={protocol}
        activeMeal={activeMeal}
        canNavigate={canNavigate}
        onPrev={prevMeal}
        onNext={nextMeal}
      />

      {/* Main Content: Zone B (Radial Reactor) + Zone C (Ingredient Pile) */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden pb-52">
        {/* Zone B: Radial Reactor */}
        <div className="flex-shrink-0 flex justify-center">
          <HolographicPlate
            mealState={activeMealState}
            targets={mealTargets}
            pulsingMacro={pulsingMacro}
          />
        </div>

        {/* Zone C: Ingredient Pile */}
        <div className="flex-1 min-h-0 lg:max-h-[300px]">
          <IngredientPile items={activeMealState.items} onRemove={removeFood} />
        </div>
      </div>

      {/* Confirm Button */}
      {activeMealState.items.length > 0 && (
        <div className="fixed bottom-48 inset-x-0 px-4 z-10">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleConfirmMeal}
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold flex items-center justify-center gap-2 hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-lg"
          >
            <Check className="w-5 h-5" />
            {isSubmitting ? 'Saving...' : 'Confirm Meal'}
          </motion.button>
        </div>
      )}

      {/* Zone D: Grid Armory */}
      <GridArmory
        foods={foods}
        dayType={dayType}
        activeMeal={activeMeal}
        onAdd={handleAddFood}
        onPulseRing={handlePulseRing}
      />
    </div>
  );
}

// Helper to get meal ratio based on protocol
function getMealRatio(meal: string, protocol: FastingProtocol): number {
  // Default ratios - can be refined based on effectiveMealRatios from profile
  const ratios: Record<FastingProtocol, Record<string, number>> = {
    standard: { breakfast: 0.3, lunch: 0.35, dinner: 0.35 },
    '16_8': { lunch: 0.45, dinner: 0.55 },
    '20_4': { feast: 1.0 },
  };
  return ratios[protocol][meal] ?? 0.33;
}
