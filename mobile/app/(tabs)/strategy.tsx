import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function StrategyScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <ScrollView className="flex-1 px-4">
        {/* Header */}
        <View className="py-6">
          <Text className="text-2xl font-bold text-white">Strategy</Text>
          <Text className="text-slate-400 text-sm">Your nutrition plan</Text>
        </View>

        {/* Active Plan Card */}
        <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-white text-lg font-semibold">Active Plan</Text>
            <View className="bg-green-500/20 px-3 py-1 rounded-full">
              <Text className="text-green-500 text-xs font-medium">Active</Text>
            </View>
          </View>

          <Text className="text-slate-400 text-sm mb-4">
            Fat Loss Phase - Week 4 of 12
          </Text>

          {/* Progress Bar */}
          <View className="mb-4">
            <View className="flex-row justify-between mb-2">
              <Text className="text-slate-400 text-xs">Progress</Text>
              <Text className="text-white text-xs">33%</Text>
            </View>
            <View className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <View className="h-full w-1/3 bg-blue-600 rounded-full" />
            </View>
          </View>

          {/* Stats */}
          <View className="flex-row justify-around pt-4 border-t border-slate-800">
            <View className="items-center">
              <Text className="text-white text-xl font-bold">-2.4</Text>
              <Text className="text-slate-400 text-xs">kg lost</Text>
            </View>
            <View className="items-center">
              <Text className="text-white text-xl font-bold">8</Text>
              <Text className="text-slate-400 text-xs">weeks left</Text>
            </View>
            <View className="items-center">
              <Text className="text-white text-xl font-bold">92%</Text>
              <Text className="text-slate-400 text-xs">adherence</Text>
            </View>
          </View>
        </View>

        {/* Weekly Target */}
        <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
          <Text className="text-white text-lg font-semibold mb-4">
            This Week's Target
          </Text>

          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-slate-400">Target Intake</Text>
              <Text className="text-white font-medium">2,100 kcal/day</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-400">Weekly Deficit</Text>
              <Text className="text-white font-medium">-3,500 kcal</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-slate-400">Projected Weight</Text>
              <Text className="text-white font-medium">78.2 kg</Text>
            </View>
          </View>
        </View>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
