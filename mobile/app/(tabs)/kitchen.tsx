import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useRouter } from 'expo-router';

type MealType = 'breakfast' | 'lunch' | 'dinner';

export default function KitchenScreen() {
  const router = useRouter();
  const [selectedMeal, setSelectedMeal] = useState<MealType>('breakfast');

  const meals: { id: MealType; label: string; emoji: string }[] = [
    { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
    { id: 'lunch', label: 'Lunch', emoji: '☀️' },
    { id: 'dinner', label: 'Dinner', emoji: '🌙' },
  ];

  const foods = [
    { id: 1, name: 'Oatmeal', category: 'carb', emoji: '🥣' },
    { id: 2, name: 'Chicken Breast', category: 'protein', emoji: '🍗' },
    { id: 3, name: 'Brown Rice', category: 'carb', emoji: '🍚' },
    { id: 4, name: 'Salmon', category: 'protein', emoji: '🐟' },
    { id: 5, name: 'Avocado', category: 'fat', emoji: '🥑' },
    { id: 6, name: 'Eggs', category: 'protein', emoji: '🥚' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      {/* Header */}
      <View className="px-4 py-4 border-b border-slate-800">
        <Text className="text-2xl font-bold text-white">Kitchen Mode</Text>
        <Text className="text-slate-400 text-sm">Build your plate</Text>
      </View>

      {/* Meal Selector */}
      <View className="flex-row px-4 py-3 gap-2">
        {meals.map((meal) => (
          <Pressable
            key={meal.id}
            onPress={() => setSelectedMeal(meal.id)}
            className={`flex-1 py-3 rounded-xl ${
              selectedMeal === meal.id
                ? 'bg-blue-600'
                : 'bg-slate-900 border border-slate-800'
            }`}
          >
            <Text className="text-center text-lg">{meal.emoji}</Text>
            <Text
              className={`text-center text-xs mt-1 ${
                selectedMeal === meal.id ? 'text-white' : 'text-slate-400'
              }`}
            >
              {meal.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Plate Preview */}
      <View className="mx-4 my-4 bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <Text className="text-slate-400 text-xs uppercase tracking-wide mb-2">
          Current Plate
        </Text>
        <View className="flex-row justify-around py-4">
          <View className="items-center">
            <Text className="text-purple-500 text-2xl font-bold">0</Text>
            <Text className="text-slate-400 text-xs">Protein</Text>
          </View>
          <View className="items-center">
            <Text className="text-amber-500 text-2xl font-bold">0</Text>
            <Text className="text-slate-400 text-xs">Carbs</Text>
          </View>
          <View className="items-center">
            <Text className="text-rose-500 text-2xl font-bold">0</Text>
            <Text className="text-slate-400 text-xs">Fat</Text>
          </View>
        </View>
      </View>

      {/* Food Grid */}
      <ScrollView className="flex-1 px-4">
        <Text className="text-slate-400 text-xs uppercase tracking-wide mb-3">
          Add to Plate
        </Text>
        <View className="flex-row flex-wrap gap-3">
          {foods.map((food) => (
            <Pressable
              key={food.id}
              onPress={() => router.push('/plate-builder')}
              className="w-[48%] bg-slate-900 border border-slate-800 rounded-xl p-4"
            >
              <Text className="text-3xl mb-2">{food.emoji}</Text>
              <Text className="text-white font-medium">{food.name}</Text>
              <Text className="text-slate-500 text-xs capitalize">
                {food.category}
              </Text>
            </Pressable>
          ))}
        </View>
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
