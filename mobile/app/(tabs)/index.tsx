import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';

export default function TodayScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // TODO: Refresh data from API
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <ScrollView
        className="flex-1 px-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffffff"
          />
        }
      >
        {/* Header */}
        <View className="py-6">
          <Text className="text-2xl font-bold text-white">Today</Text>
          <Text className="text-slate-400 text-sm">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>

        {/* Status Cards Row */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <Text className="text-slate-400 text-xs uppercase tracking-wide mb-2">
              Training
            </Text>
            <Text className="text-amber-500 text-2xl font-bold">Pending</Text>
          </View>
          <View className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <Text className="text-slate-400 text-xs uppercase tracking-wide mb-2">
              Recovery
            </Text>
            <Text className="text-green-500 text-2xl font-bold">85</Text>
          </View>
        </View>

        {/* Mission Card */}
        <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
          <Text className="text-white text-lg font-semibold mb-4">
            Today's Mission
          </Text>

          {/* Calorie Hero */}
          <View className="items-center mb-6">
            <Text className="text-4xl font-bold text-white">2,450</Text>
            <Text className="text-slate-400 text-sm">kcal target</Text>
          </View>

          {/* Macro Targets */}
          <View className="flex-row justify-around mb-6">
            <View className="items-center">
              <Text className="text-purple-500 text-xl font-bold">165g</Text>
              <Text className="text-slate-400 text-xs">Protein</Text>
            </View>
            <View className="items-center">
              <Text className="text-amber-500 text-xl font-bold">280g</Text>
              <Text className="text-slate-400 text-xs">Carbs</Text>
            </View>
            <View className="items-center">
              <Text className="text-rose-500 text-xl font-bold">75g</Text>
              <Text className="text-slate-400 text-xs">Fat</Text>
            </View>
          </View>

          {/* CTA Button */}
          <View className="bg-blue-600 py-3 rounded-xl">
            <Text className="text-white text-center font-semibold">
              Go to Kitchen Mode
            </Text>
          </View>
        </View>

        {/* Bottom spacer */}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
