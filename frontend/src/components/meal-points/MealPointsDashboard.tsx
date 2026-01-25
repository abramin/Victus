import { useEffect, useMemo, useState, useCallback } from 'react';
import { getLogByDate, getTrainingConfigs, updateActiveCalories } from '../../api/client';
import type { DailyLog, DayType, UserProfile, TrainingConfig } from '../../api/types';
import { calculateMealTargets } from '../targets/mealTargets';
import { DateNavigator } from './DateNavigator';
import { DayTypeSelector } from './DayTypeSelector';
import { MealBreakdownModal } from './MealBreakdownModal';
import { MealCard } from './MealCard';
import { SupplementsPanel } from './SupplementsPanel';
import { FoodLibrary } from './FoodLibrary';
import { PlateBuilderModal } from './PlateBuilderModal';
import { usePlateBuilder } from '../../hooks/usePlateBuilder';
import { toDateKey, isSameDay } from '../../utils';
import {
  CARB_KCAL_PER_G,
  FAT_KCAL_PER_G,
  PROTEIN_KCAL_PER_G,
} from '../../constants';

interface MealPointsDashboardProps {
  log: DailyLog | null;
  profile: UserProfile;
  onDayTypeChange?: (dayType: DayType) => void;
}


type SupplementState = {
  id: 'whey' | 'collagen' | 'intra_carbs';
  label: string;
  sublabel: string;
  value: number;
  enabled: boolean;
};

const DEFAULT_SUPPLEMENTS: SupplementState[] = [
  { id: 'whey', label: 'Whey', sublabel: 'Protein', value: 30, enabled: false },
  { id: 'collagen', label: 'Collagen', sublabel: 'Protein', value: 20, enabled: false },
  { id: 'intra_carbs', label: 'Intra-workout', sublabel: 'Carbs', value: 50, enabled: false },
];

const buildSupplementsFromProfile = (profile: UserProfile): SupplementState[] => {
  const defaults = DEFAULT_SUPPLEMENTS;
  const supplementConfig = profile.supplementConfig ?? { maltodextrinG: 0, wheyG: 0, collagenG: 0 };
  return [
    {
      ...defaults[0],
      value: supplementConfig.wheyG || defaults[0].value,
      enabled: supplementConfig.wheyG > 0,
    },
    {
      ...defaults[1],
      value: supplementConfig.collagenG || defaults[1].value,
      enabled: supplementConfig.collagenG > 0,
    },
    {
      ...defaults[2],
      value: supplementConfig.maltodextrinG || defaults[2].value,
      enabled: supplementConfig.maltodextrinG > 0,
    },
  ];
};

export function MealPointsDashboard({ log, profile, onDayTypeChange }: MealPointsDashboardProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDayType, setSelectedDayType] = useState<DayType>(log?.dayType || 'fatburner');
  const [supplements, setSupplements] = useState<SupplementState[]>(() => buildSupplementsFromProfile(profile));
  const [selectedLog, setSelectedLog] = useState<DailyLog | null>(log);
  const [loadingLog, setLoadingLog] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const isSelectedToday = isSameDay(selectedDate, new Date());
  const [breakdownMeal, setBreakdownMeal] = useState<'Breakfast' | 'Lunch' | 'Dinner' | null>(null);
  const [trainingConfigs, setTrainingConfigs] = useState<TrainingConfig[]>([]);
  const [activeCaloriesUpdating, setActiveCaloriesUpdating] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<'breakfast' | 'lunch' | 'dinner'>('dinner');
  const [supplementsExpanded, setSupplementsExpanded] = useState(false);

  // Get effective meal ratios from profile (respects fasting protocol)
  const effectiveRatios = profile.effectiveMealRatios ?? profile.mealRatios;

  // Convert to percentages for display
  const mealRatios = useMemo(() => ({
    breakfast: Math.round(effectiveRatios.breakfast * 100),
    lunch: Math.round(effectiveRatios.lunch * 100),
    dinner: Math.round(effectiveRatios.dinner * 100),
  }), [effectiveRatios]);

  // Determine which meals are visible based on fasting protocol
  const visibleMeals = useMemo(() =>
    (['breakfast', 'lunch', 'dinner'] as const).filter(
      meal => effectiveRatios[meal] > 0
    ), [effectiveRatios]);

  const handleDayTypeSelect = (dayType: DayType) => {
    setSelectedDayType(dayType);
    onDayTypeChange?.(dayType);
  };

  const handleSupplementChange = (id: string, enabled: boolean, value: number) => {
    setSupplements(prev =>
      prev.map(s => s.id === id ? { ...s, enabled, value } : s)
    );
  };

  const navigateDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  useEffect(() => {
    let isActive = true;
    if (isSelectedToday) {
      setSelectedLog(log);
      setLoadingLog(false);
      setLogError(null);
      return () => {
        isActive = false;
      };
    }

    setLoadingLog(true);
    setLogError(null);
    getLogByDate(toDateKey(selectedDate))
      .then((data) => {
        if (!isActive) return;
        setSelectedLog(data);
      })
      .catch(() => {
        if (!isActive) return;
        setSelectedLog(null);
        setLogError('Failed to load daily log');
      })
      .finally(() => {
        if (!isActive) return;
        setLoadingLog(false);
      });

    return () => {
      isActive = false;
    };
  }, [isSelectedToday, log, selectedDate]);

  useEffect(() => {
    if (selectedLog?.dayType) {
      setSelectedDayType(selectedLog.dayType);
    }
  }, [selectedLog?.dayType]);

  useEffect(() => {
    setSupplements(buildSupplementsFromProfile(profile));
  }, [
    profile.supplementConfig.maltodextrinG,
    profile.supplementConfig.wheyG,
    profile.supplementConfig.collagenG,
  ]);

  // Ensure selectedMeal is always a visible meal (respects fasting protocol)
  useEffect(() => {
    if (!visibleMeals.includes(selectedMeal)) {
      setSelectedMeal(visibleMeals[visibleMeals.length - 1] ?? 'dinner');
    }
  }, [visibleMeals, selectedMeal]);

  // Load training configs for MET-based calorie calculations
  useEffect(() => {
    getTrainingConfigs()
      .then(setTrainingConfigs)
      .catch(() => {
        // Fallback to empty - Activity Gap card will handle gracefully
      });
  }, []);

  // Handler for updating active calories burned
  const handleActiveCaloriesChange = useCallback(async (calories: number | null) => {
    const logDate = selectedLog?.date;
    if (!logDate) return;

    setActiveCaloriesUpdating(true);
    try {
      const updatedLog = await updateActiveCalories(logDate, {
        activeCaloriesBurned: calories,
      });
      // Only update if still viewing same date
      setSelectedLog(prev => prev?.date === logDate ? updatedLog : prev);
    } catch {
      // Silently fail - user can retry
    } finally {
      setActiveCaloriesUpdating(false);
    }
  }, [selectedLog?.date]);

  // Auto-enable intra-workout carbs for performance workouts
  useEffect(() => {
    if (!selectedLog) return;

    const sessions = selectedLog.plannedTrainingSessions || [];
    const performanceTypes = ['strength', 'hiit', 'calisthenics', 'run', 'row', 'cycle'];
    const hasPerformanceWorkout = sessions.some(
      s => performanceTypes.includes(s.type) && s.durationMin >= 45
    );

    if (hasPerformanceWorkout) {
      setSupplements(prev =>
        prev.map(s =>
          s.id === 'intra_carbs' ? { ...s, enabled: true } : s
        )
      );
    }
  }, [selectedLog]);

  const supplementConfig = useMemo(() => {
    const config = { maltodextrinG: 0, wheyG: 0, collagenG: 0 };
    for (const supplement of supplements) {
      if (!supplement.enabled) continue;
      const value = Math.max(0, supplement.value);
      if (supplement.id === 'whey') {
        config.wheyG = value;
      } else if (supplement.id === 'collagen') {
        config.collagenG = value;
      } else if (supplement.id === 'intra_carbs') {
        config.maltodextrinG = value;
      }
    }
    return config;
  }, [supplements]);

  const isDefaultSupplements = useMemo(() => (
    supplementConfig.maltodextrinG === profile.supplementConfig.maltodextrinG &&
    supplementConfig.wheyG === profile.supplementConfig.wheyG &&
    supplementConfig.collagenG === profile.supplementConfig.collagenG
  ), [profile.supplementConfig, supplementConfig]);

  // Get meal data from selected log
  const mealData = useMemo(() => {
    if (selectedLog?.calculatedTargets) {
      const targets = selectedLog.calculatedTargets;
      const useStoredTargets = selectedLog.dayType === selectedDayType && isDefaultSupplements;
      const calculated = useStoredTargets
        ? targets.meals
        : calculateMealTargets(
            targets.totalCarbsG,
            targets.totalProteinG,
            targets.totalFatsG,
            targets.fruitG,
            targets.veggiesG,
            effectiveRatios,
            profile.pointsConfig,
            selectedDayType,
            supplementConfig
          );

      return {
        breakfast: calculated.breakfast,
        lunch: calculated.lunch,
        dinner: calculated.dinner,
        hasData: true,
      };
    }

    return {
      breakfast: { carbs: 0, protein: 0, fats: 0 },
      lunch: { carbs: 0, protein: 0, fats: 0 },
      dinner: { carbs: 0, protein: 0, fats: 0 },
      hasData: false,
    };
  }, [
    isDefaultSupplements,
    effectiveRatios,
    profile.pointsConfig,
    selectedDayType,
    selectedLog,
    supplementConfig,
  ]);

  // Memoize plate builder data to avoid infinite re-renders
  const plateBuilderData = useMemo(() => (
    mealData.hasData
      ? {
          breakfast: mealData.breakfast,
          lunch: mealData.lunch,
          dinner: mealData.dinner,
        }
      : null
  ), [mealData]);

  // Plate Builder hook for meal drafting
  const plateBuilder = usePlateBuilder(plateBuilderData);

  // Calculate grams and kcal per meal (uses effective ratios respecting fasting protocol)
  const mealGramsAndKcal = useMemo(() => {
    if (!selectedLog?.calculatedTargets) {
      return null;
    }
    const { totalCarbsG, totalProteinG, totalFatsG } = selectedLog.calculatedTargets;

    const calcMeal = (ratio: number) => {
      const carbGrams = Math.round(totalCarbsG * ratio);
      const proteinGrams = Math.round(totalProteinG * ratio);
      const fatGrams = Math.round(totalFatsG * ratio);
      const kcal = Math.round(
        carbGrams * CARB_KCAL_PER_G +
        proteinGrams * PROTEIN_KCAL_PER_G +
        fatGrams * FAT_KCAL_PER_G
      );
      return { carbGrams, proteinGrams, fatGrams, kcal };
    };

    return {
      breakfast: calcMeal(effectiveRatios.breakfast),
      lunch: calcMeal(effectiveRatios.lunch),
      dinner: calcMeal(effectiveRatios.dinner),
    };
  }, [selectedLog?.calculatedTargets, effectiveRatios]);

  // Detect training type for smart supplement defaults
  const trainingContext = useMemo(() => {
    if (!selectedLog) return { isRestDay: true, hasPerformanceWorkout: false };

    const sessions = selectedLog.plannedTrainingSessions || [];
    const isRestDay = sessions.length === 0 || sessions.every(s => s.type === 'rest');

    // Performance workout: strength, hiit, calisthenics with ≥45min duration
    const performanceTypes = ['strength', 'hiit', 'calisthenics', 'run', 'row', 'cycle'];
    const hasPerformanceWorkout = sessions.some(
      s => performanceTypes.includes(s.type) && s.durationMin >= 45
    );

    return { isRestDay, hasPerformanceWorkout };
  }, [selectedLog]);

  // Derive context text based on training and day type
  const contextText = useMemo(() => {
    if (!selectedLog) return null;

    const sessions = selectedLog.plannedTrainingSessions || [];
    const isRest = sessions.length === 0 || sessions.every(s => s.type === 'rest');

    if (isRest) {
      return 'Strategy adapted for Rest Day';
    }

    const hasStrength = sessions.some(s =>
      ['strength', 'calisthenics', 'hiit'].includes(s.type)
    );

    if (hasStrength && selectedDayType === 'performance') {
      return 'High Carbs for Heavy Lifting';
    }

    if (selectedDayType === 'fatburner') {
      return 'Lower Carbs for Fat Burning';
    }

    if (selectedDayType === 'metabolize') {
      return 'Balanced Macros for Recovery';
    }

    return null;
  }, [selectedLog, selectedDayType]);

  const emptyTitle = loadingLog
    ? 'Loading daily log...'
    : logError ?? 'No daily log for this date.';
  const emptySubtitle = loadingLog
    ? 'Fetching your meal points.'
    : logError
      ? 'Please try again shortly.'
      : 'Complete your Daily Update to see your meal points.';

  return (
    <div className="p-6 h-screen flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-white">Kitchen</h1>
          <div className="relative group">
            <button
              type="button"
              className="w-5 h-5 rounded-full bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white flex items-center justify-center text-xs font-medium transition-colors"
              aria-label="Calculation assumptions"
            >
              ?
            </button>
            <div className="absolute left-0 top-full mt-2 w-56 p-3 bg-gray-800 border border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <p className="text-xs text-gray-400 font-medium mb-2">Calculation Assumptions</p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Fruit: 10% carbs by weight</p>
                <p>Vegetables: 3% carbs by weight</p>
                <p>Maltodextrin: 96% carbs</p>
                <p>Collagen: 90% protein</p>
                <p>Whey: 88% protein</p>
              </div>
            </div>
          </div>
        </div>

        {/* Date Navigation */}
        <DateNavigator
          selectedDate={selectedDate}
          onNavigate={navigateDate}
          contextText={contextText}
        />
      </div>

      {/* Main Content Grid */}
      <div className={`grid grid-cols-12 grid-rows-1 gap-6 flex-1 min-h-0 ${loadingLog ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Left Side - Inputs (40% = col-span-5) */}
        <div className="col-span-5 space-y-4">
          {/* Day Type Selector - Vertical Radio Tiles */}
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <DayTypeSelector
              selectedDayType={selectedDayType}
              onSelect={handleDayTypeSelect}
            />
          </div>

          {/* Meal Selection - only shows meals active in fasting protocol */}
          {mealData.hasData && (
            <div className="space-y-3">
              {visibleMeals.map((meal) => (
                <MealCard
                  key={meal}
                  meal={meal.charAt(0).toUpperCase() + meal.slice(1) as 'Breakfast' | 'Lunch' | 'Dinner'}
                  carbPoints={mealData[meal].carbs}
                  proteinPoints={mealData[meal].protein}
                  fatPoints={mealData[meal].fats}
                  carbGrams={mealGramsAndKcal?.[meal].carbGrams}
                  proteinGrams={mealGramsAndKcal?.[meal].proteinGrams}
                  fatGrams={mealGramsAndKcal?.[meal].fatGrams}
                  totalKcal={mealGramsAndKcal?.[meal].kcal}
                  onViewBreakdown={() => setBreakdownMeal(meal.charAt(0).toUpperCase() + meal.slice(1) as 'Breakfast' | 'Lunch' | 'Dinner')}
                  isSelected={selectedMeal === meal}
                  onSelect={() => setSelectedMeal(meal)}
                  draftedFoods={plateBuilder.drafts[meal].foods}
                  spentPoints={plateBuilder.drafts[meal].spentPoints}
                  onRemoveFood={(index) => plateBuilder.removeFoodFromMeal(meal, index)}
                  onClearDraft={() => plateBuilder.clearMealDraft(meal)}
                  macroTargets={mealData[meal]}
                  macroSpent={plateBuilder.drafts[meal].spentByMacro}
                />
              ))}
            </div>
          )}

          {!mealData.hasData && (
            <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 text-center">
              {loadingLog && (
                <div className="flex justify-center mb-4">
                  <div className="w-8 h-8 border-4 border-gray-700 border-t-white rounded-full animate-spin" />
                </div>
              )}
              <p className="text-gray-400 mb-4">
                {emptyTitle}
              </p>
              <p className="text-gray-500 text-sm">
                {emptySubtitle}
              </p>
            </div>
          )}

          {/* Supplements Panel - Collapsible */}
          <div className="border border-gray-800 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setSupplementsExpanded(!supplementsExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-900 hover:bg-gray-800 transition-colors"
            >
              <span className="text-sm text-gray-400 font-medium">
                Supplements {supplements.filter(s => s.enabled).length > 0 && (
                  <span className="text-emerald-400 ml-1">
                    ({supplements.filter(s => s.enabled).length} active)
                  </span>
                )}
              </span>
              <svg 
                className={`w-4 h-4 text-gray-500 transition-transform ${supplementsExpanded ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {supplementsExpanded && (
              <SupplementsPanel
                supplements={supplements}
                onSupplementChange={handleSupplementChange}
                onApplyDefaults={() => {
                  setSupplements(DEFAULT_SUPPLEMENTS.map(s => ({ ...s, enabled: true })));
                }}
                onReset={() => {
                  setSupplements(DEFAULT_SUPPLEMENTS);
                }}
                isRestDay={trainingContext.isRestDay}
                hasPerformanceWorkout={trainingContext.hasPerformanceWorkout}
              />
            )}
          </div>
        </div>

        {/* Right Side - Food Library (60% = col-span-7) */}
        <div className="col-span-7 flex flex-col min-h-0">
          <FoodLibrary
            targetPoints={mealData.hasData ? mealData[selectedMeal].protein + mealData[selectedMeal].carbs + mealData[selectedMeal].fats : 350}
            selectedMeal={selectedMeal}
            className="flex-1 min-h-0"
            onFoodSelect={(food) => plateBuilder.openFoodModal(food, selectedMeal)}
            remainingPoints={plateBuilder.drafts[selectedMeal].remainingPoints}
            macroTargets={mealData.hasData ? mealData[selectedMeal] : null}
            macroSpent={plateBuilder.drafts[selectedMeal].spentByMacro}
            onCalculateGhostPreview={(food) => plateBuilder.calculateGhostPreview(food, selectedMeal)}
          />
        </div>
      </div>

      {/* Plate Builder Modal */}
      <PlateBuilderModal
        modalState={plateBuilder.modalState}
        existingFoods={plateBuilder.drafts[plateBuilder.modalState.mealId].foods}
        targetPoints={plateBuilder.getMealTargetPoints(plateBuilder.modalState.mealId)}
        macroTargets={mealData.hasData ? mealData[plateBuilder.modalState.mealId] : null}
        macroSpent={plateBuilder.drafts[plateBuilder.modalState.mealId].spentByMacro}
        onClose={plateBuilder.closeFoodModal}
        onConfirm={plateBuilder.confirmFoodAddition}
        onFillPercentageChange={plateBuilder.setFillPercentage}
      />

      {/* Breakdown Modal */}
      {breakdownMeal && mealGramsAndKcal && selectedLog?.calculatedTargets && (
        <MealBreakdownModal
          isOpen={!!breakdownMeal}
          onClose={() => setBreakdownMeal(null)}
          meal={breakdownMeal}
          sharePercent={mealRatios[breakdownMeal.toLowerCase() as 'breakfast' | 'lunch' | 'dinner']}
          dayType={selectedDayType}
          points={mealData[breakdownMeal.toLowerCase() as 'breakfast' | 'lunch' | 'dinner']}
          grams={{
            carbs: mealGramsAndKcal[breakdownMeal.toLowerCase() as 'breakfast' | 'lunch' | 'dinner'].carbGrams,
            protein: mealGramsAndKcal[breakdownMeal.toLowerCase() as 'breakfast' | 'lunch' | 'dinner'].proteinGrams,
            fats: mealGramsAndKcal[breakdownMeal.toLowerCase() as 'breakfast' | 'lunch' | 'dinner'].fatGrams,
          }}
          pointsConfig={profile.pointsConfig}
          supplementConfig={supplementConfig}
          totalFruitG={selectedLog.calculatedTargets.fruitG}
          totalVeggiesG={selectedLog.calculatedTargets.veggiesG}
        />
      )}
    </div>
  );
}
