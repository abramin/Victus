import { useState, useEffect, useCallback } from 'react';
import { getFoodReference, updateFoodReferencePlateMultiplier, ApiError } from '../api/client';
import type { FoodReference } from '../api/types';

interface UseFoodReferenceReturn {
  foods: FoodReference[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updatePlateMultiplier: (id: number, multiplier: number | null) => Promise<boolean>;
}

export function useFoodReference(): UseFoodReferenceReturn {
  const [foods, setFoods] = useState<FoodReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getFoodReference();
      setFoods(response.foods);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load food reference';
      setError(message);
      console.error('useFoodReference refresh error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updatePlateMultiplier = useCallback(
    async (id: number, multiplier: number | null): Promise<boolean> => {
      try {
        await updateFoodReferencePlateMultiplier(id, multiplier);
        // Optimistically update local state
        setFoods((prev) =>
          prev.map((food) =>
            food.id === id ? { ...food, plateMultiplier: multiplier } : food
          )
        );
        return true;
      } catch (err) {
        console.error('useFoodReference updatePlateMultiplier error:', err);
        return false;
      }
    },
    []
  );

  return {
    foods,
    loading,
    error,
    refresh,
    updatePlateMultiplier,
  };
}
