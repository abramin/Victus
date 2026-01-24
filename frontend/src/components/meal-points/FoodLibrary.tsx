import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Panel } from '../common/Panel';
import { PortionPlateVisualizer } from '../charts';
import { getFoodReference } from '../../api/client';
import type { FoodReference, FoodCategory } from '../../api/types';

interface FoodLibraryProps {
  targetPoints: number;
  selectedMeal?: 'breakfast' | 'lunch' | 'dinner';
  className?: string;
  // Plate Builder integration
  onFoodSelect?: (food: FoodReference) => void;
  remainingPoints?: number;
}

type FilterTab = 'all' | 'carb' | 'protein' | 'fat';

const FILTER_CONFIG: Record<FilterTab, { 
  label: string; 
  emoji: string;
  categories: FoodCategory[];
  color: string;
  bgColor: string;
}> = {
  all: { 
    label: 'All', 
    emoji: '🍽️', 
    categories: ['high_carb', 'high_protein', 'high_fat'],
    color: 'text-white',
    bgColor: 'bg-gray-600',
  },
  carb: { 
    label: 'Carb', 
    emoji: '🍞', 
    categories: ['high_carb'],
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
  },
  protein: { 
    label: 'Prot', 
    emoji: '🍗', 
    categories: ['high_protein'],
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
  },
  fat: { 
    label: 'Fats', 
    emoji: '🥑', 
    categories: ['high_fat'],
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
  },
};

const CATEGORY_EMOJI: Record<FoodCategory, string> = {
  high_carb: '🍞',
  high_protein: '🍗',
  high_fat: '🥑',
};

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function FoodLibrary({
  targetPoints,
  selectedMeal = 'dinner',
  className = '',
  onFoodSelect,
  remainingPoints,
}: FoodLibraryProps) {
  // Use remaining points if provided, otherwise use full target
  const effectivePoints = remainingPoints ?? targetPoints;
  const [foods, setFoods] = useState<FoodReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodReference | null>(null);
  const [hoveredFood, setHoveredFood] = useState<FoodReference | null>(null);

  // Display food is either hovered (takes priority) or selected
  const displayFood = hoveredFood || selectedFood;

  useEffect(() => {
    const fetchFoods = async () => {
      try {
        const response = await getFoodReference();
        setFoods(response.foods);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load food reference');
      } finally {
        setLoading(false);
      }
    };
    fetchFoods();
  }, []);

  // Filter foods by category and search query
  const filteredFoods = useMemo(() => {
    const categories = FILTER_CONFIG[activeFilter].categories;
    return foods.filter(food => {
      const matchesCategory = categories.includes(food.category);
      const matchesSearch = searchQuery === '' || 
        food.foodItem.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [foods, activeFilter, searchQuery]);

  // Calculate suggested serving based on plate multiplier (uses remaining points if available)
  const getSuggestion = (food: FoodReference): { grams: number; display: string } => {
    if (!food.plateMultiplier) return { grams: 0, display: '—' };
    const servingG = Math.round(effectivePoints * food.plateMultiplier);
    return { grams: servingG, display: `${servingG}g` };
  };

  const handleFoodClick = (food: FoodReference) => {
    if (onFoodSelect) {
      // Plate Builder mode: open modal instead of toggling selection
      onFoodSelect(food);
    } else {
      // Default behavior: toggle selection for visualization
      setSelectedFood(selectedFood?.id === food.id ? null : food);
    }
  };

  const handleFoodHover = (food: FoodReference | null) => {
    setHoveredFood(food);
  };

  const handleCloseVisualizer = () => {
    setSelectedFood(null);
    setHoveredFood(null);
  };

  if (loading) {
    return (
      <Panel title="Food Library" className={className}>
        <div className="flex justify-center py-8">
          <div className="animate-pulse text-gray-500 text-sm">Loading foods...</div>
        </div>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel title="Food Library" className={className}>
        <div className="text-red-400 text-sm py-4">Failed to load: {error}</div>
      </Panel>
    );
  }

  return (
    <Panel title="Food Library" className={`flex flex-col h-full ${className}`}>
      {/* Portion Plate Visualizer (Sticky Header) - Fixed height prevents layout shift on hover */}
      <div className="mb-4 border-b border-gray-800 pb-4 h-[300px]">
        <PortionPlateVisualizer
          plateMultiplier={displayFood?.plateMultiplier ?? 0}
          foodName={displayFood?.foodItem ?? ''}
          targetPoints={targetPoints}
          onClose={displayFood ? handleCloseVisualizer : undefined}
        />
      </div>

      {/* Target Context Header - Prominent */}
      <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="text-sm text-gray-400">
          Showing portions for <span className="text-white font-semibold">{capitalizeFirst(selectedMeal)}</span>
        </div>
        {remainingPoints !== undefined && remainingPoints < targetPoints ? (
          <div className="text-lg text-cyan-400 font-bold">
            Remaining: {remainingPoints} pts
            <span className="text-gray-500 text-sm ml-2">(of {targetPoints})</span>
          </div>
        ) : (
          <div className="text-lg text-emerald-400 font-bold">
            Target: {targetPoints} pts
          </div>
        )}
      </div>

      {/* Search Input */}
      <div className="mb-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search foods..."
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gray-600"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 mb-4">
        {(Object.keys(FILTER_CONFIG) as FilterTab[]).map(filter => {
          const config = FILTER_CONFIG[filter];
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`
                flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors
                flex items-center justify-center gap-1
                ${isActive
                  ? `${config.bgColor} ${config.color}`
                  : 'bg-gray-800 text-gray-500 hover:text-gray-300'
                }
              `}
            >
              <span>{config.emoji}</span>
              <span className="hidden sm:inline">{config.label}</span>
            </button>
          );
        })}
      </div>

      {/* Food List (Scrollable) */}
      <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
        {filteredFoods.map(food => {
          const isSelected = selectedFood?.id === food.id;
          const isHovered = hoveredFood?.id === food.id;
          const suggestion = getSuggestion(food);
          const categoryEmoji = CATEGORY_EMOJI[food.category];
          
          return (
            <motion.button
              key={food.id}
              onClick={() => handleFoodClick(food)}
              onMouseEnter={() => handleFoodHover(food)}
              onMouseLeave={() => handleFoodHover(null)}
              className={`
                w-full flex items-center text-sm py-3 px-3 rounded-lg
                transition-colors text-left
                ${isSelected 
                  ? 'bg-emerald-500/20 border border-emerald-500/50' 
                  : isHovered
                    ? 'bg-gray-700/70 border border-gray-600'
                    : 'bg-gray-800/50 hover:bg-gray-700/50 border border-transparent'
                }
              `}
              whileTap={{ scale: 0.99 }}
            >
              {/* Category Emoji */}
              <span className="text-lg mr-3 flex-shrink-0">{categoryEmoji}</span>
              
              {/* Food Name & Serving Info */}
              <div className="flex-1 min-w-0">
                <div className="text-gray-200 truncate font-medium">{food.foodItem}</div>
                {suggestion.grams > 0 && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    Eat <span className="text-cyan-400 font-semibold">{suggestion.display}</span> → Hits Target
                  </div>
                )}
              </div>
              
              {/* Multiplier Badge */}
              {food.plateMultiplier && (
                <span className={`text-xs px-2 py-0.5 rounded-full ml-2 flex-shrink-0 ${
                  FILTER_CONFIG[
                    food.category === 'high_carb' ? 'carb' :
                    food.category === 'high_protein' ? 'protein' : 'fat'
                  ].bgColor
                } ${
                  FILTER_CONFIG[
                    food.category === 'high_carb' ? 'carb' :
                    food.category === 'high_protein' ? 'protein' : 'fat'
                  ].color
                }`}>
                  {food.plateMultiplier <= 0.25 ? '¼' : 
                   food.plateMultiplier <= 0.5 ? '½' : 
                   food.plateMultiplier <= 0.75 ? '¾' : '1'} plate
                </span>
              )}
            </motion.button>
          );
        })}
        
        {filteredFoods.length === 0 && (
          <div className="text-gray-500 text-sm text-center py-8">
            No foods match your search
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-gray-800 text-center text-xs text-gray-500">
        {filteredFoods.length} foods • Hover to preview portion
      </div>
    </Panel>
  );
}
